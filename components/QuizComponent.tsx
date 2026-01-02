
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';

interface QuizAnswer {
  id: string;
  answer_text: string;
  is_correct: boolean;
  order_index: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  order_index: number;
  answers: QuizAnswer[];
}

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  required_correct_answers: number;
  total_questions: number;
  questions: QuizQuestion[];
}

interface QuizComponentProps {
  quizId: string;
  creatorHandle: string;
  onComplete: (passed: boolean, score: number) => void;
  onClose: () => void;
}

const QuizComponent: React.FC<QuizComponentProps> = ({
  quizId,
  creatorHandle,
  onComplete,
  onClose,
}) => {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  const progressScale = useSharedValue(0);
  const celebrationScale = useSharedValue(0);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  useEffect(() => {
    if (quizData && currentQuestionIndex < quizData.questions.length) {
      progressScale.value = withSpring((currentQuestionIndex + 1) / quizData.questions.length);
    }
  }, [currentQuestionIndex, quizData]);

  useEffect(() => {
    if (showResults) {
      celebrationScale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
    }
  }, [showResults, score]);

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressScale.value * 100}%`,
    };
  });

  const celebrationStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: celebrationScale.value }],
    };
  });

  const fetchQuizData = async () => {
    try {
      setLoading(true);

      // Fetch quiz details
      const { data: quiz, error: quizError } = await supabase
        .from('course_quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      if (questionsError) throw questionsError;

      // Fetch answers for all questions
      const questionIds = questions.map((q) => q.id);
      const { data: answers, error: answersError } = await supabase
        .from('quiz_answers')
        .select('*')
        .in('question_id', questionIds)
        .order('order_index', { ascending: true });

      if (answersError) throw answersError;

      // Group answers by question
      const questionsWithAnswers = questions.map((question) => ({
        ...question,
        answers: answers.filter((answer) => answer.question_id === question.id),
      }));

      setQuizData({
        ...quiz,
        questions: questionsWithAnswers,
      });
    } catch (error) {
      console.error('Error fetching quiz data:', error);
      Alert.alert('Error', 'Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));
  };

  const handleNext = () => {
    if (!quizData) return;

    const currentQuestion = quizData.questions[currentQuestionIndex];
    if (!selectedAnswers[currentQuestion.id]) {
      Alert.alert('Please select an answer', 'You must select an answer before proceeding.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quizData) return;

    setAnalyzing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Calculate score
    let correct = 0;
    quizData.questions.forEach((question) => {
      const selectedAnswerId = selectedAnswers[question.id];
      const selectedAnswer = question.answers.find((a) => a.id === selectedAnswerId);
      if (selectedAnswer?.is_correct) {
        correct++;
      }
    });

    const calculatedScore = Math.round((correct / quizData.total_questions) * 100);
    const passed = calculatedScore >= quizData.passing_score;

    setCorrectAnswers(correct);
    setScore(calculatedScore);

    // Save quiz attempt
    try {
      const { error } = await supabase.from('quiz_attempts').insert({
        quiz_id: quizId,
        creator_handle: creatorHandle,
        score: calculatedScore,
        passed,
        answers: selectedAnswers,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
    }

    setTimeout(() => {
      setAnalyzing(false);
      setShowResults(true);
      onComplete(passed, calculatedScore);
    }, 2000);
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
    setCorrectAnswers(0);
    progressScale.value = 0;
    celebrationScale.value = 0;
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  if (!quizData) {
    return (
      <View style={styles.errorContainer}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle"
          android_material_icon_name="warning"
          size={48}
          color={colors.error}
        />
        <Text style={styles.errorText}>Failed to load quiz</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchQuizData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (analyzing) {
    return (
      <View style={styles.analyzingContainer}>
        <Animated.View entering={ZoomIn.duration(400)}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.analyzingCircle}
          >
            <IconSymbol
              ios_icon_name="brain.head.profile"
              android_material_icon_name="psychology"
              size={64}
              color="#fff"
            />
          </LinearGradient>
        </Animated.View>
        <Animated.Text
          entering={FadeIn.delay(200)}
          style={styles.analyzingText}
        >
          Analyzing your answers...
        </Animated.Text>
      </View>
    );
  }

  if (showResults) {
    const passed = score >= quizData.passing_score;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.resultsContainer}>
          <Animated.View style={[styles.resultIconContainer, celebrationStyle]}>
            <LinearGradient
              colors={passed ? ['#4CAF50', '#81C784'] : [colors.error, '#EF5350']}
              style={styles.resultIconGradient}
            >
              <IconSymbol
                ios_icon_name={passed ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                android_material_icon_name={passed ? 'check-circle' : 'cancel'}
                size={80}
                color="#fff"
              />
            </LinearGradient>
          </Animated.View>

          <Text style={styles.resultTitle}>
            {passed ? 'Congratulations!' : 'Keep Trying!'}
          </Text>

          <Text style={styles.resultSubtitle}>
            {passed
              ? 'You passed the quiz!'
              : `You need ${quizData.passing_score}% to pass`}
          </Text>

          <View style={styles.scoreCard}>
            <LinearGradient
              colors={passed ? ['#4CAF50', '#81C784'] : [colors.primary, colors.secondary]}
              style={styles.scoreGradient}
            >
              <Text style={styles.scoreLabel}>Your Score</Text>
              <Text style={styles.scoreValue}>{score}%</Text>
              <Text style={styles.scoreDetails}>
                {correctAnswers} out of {quizData.total_questions} correct
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.resultsButtonContainer}>
            <TouchableOpacity
              style={[styles.retakeButton, passed && styles.retakeButtonSuccess]}
              onPress={handleRetry}
            >
              <IconSymbol
                ios_icon_name="arrow.clockwise"
                android_material_icon_name="refresh"
                size={20}
                color="#fff"
              />
              <Text style={styles.retakeButtonText}>Retake Quiz</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>
                {passed ? 'Continue' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeIconButton}>
          <IconSymbol
            ios_icon_name="xmark"
            android_material_icon_name="close"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{quizData.title}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View style={[styles.progressBarFill, progressStyle]} />
        </View>
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1} of {quizData.questions.length}
        </Text>
      </View>

      {/* Question */}
      <ScrollView style={styles.questionContainer} contentContainerStyle={styles.scrollContent}>
        <Animated.View
          key={currentQuestion.id}
          entering={SlideInRight.duration(300)}
          exiting={SlideOutLeft.duration(300)}
        >
          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

          <View style={styles.answersContainer}>
            {currentQuestion.answers.map((answer, index) => (
              <AnimatedAnswerCard
                key={answer.id}
                answer={answer}
                isSelected={selectedAnswers[currentQuestion.id] === answer.id}
                onPress={() => handleAnswerSelect(currentQuestion.id, answer.id)}
                disabled={false}
                index={index}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={20}
            color={currentQuestionIndex === 0 ? colors.textSecondary : '#fff'}
          />
          <Text
            style={[
              styles.navButtonText,
              currentQuestionIndex === 0 && styles.navButtonTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            !selectedAnswers[currentQuestion.id] && styles.navButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!selectedAnswers[currentQuestion.id]}
        >
          <Text
            style={[
              styles.navButtonText,
              !selectedAnswers[currentQuestion.id] && styles.navButtonTextDisabled,
            ]}
          >
            {currentQuestionIndex === quizData.questions.length - 1 ? 'Submit' : 'Next'}
          </Text>
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="arrow-forward"
            size={20}
            color={!selectedAnswers[currentQuestion.id] ? colors.textSecondary : '#fff'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AnimatedAnswerCard: React.FC<{
  answer: QuizAnswer;
  isSelected: boolean;
  onPress: () => void;
  disabled: boolean;
  index: number;
}> = ({ answer, isSelected, onPress, disabled, index }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View
      entering={FadeIn.delay(index * 100)}
      style={[animatedStyle, { marginBottom: 12 }]}
    >
      <TouchableOpacity
        style={[styles.answerCard, isSelected && styles.answerCardSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={[styles.answerRadio, isSelected && styles.answerRadioSelected]}>
          {isSelected && (
            <View style={styles.answerRadioInner} />
          )}
        </View>
        <Text style={[styles.answerText, isSelected && styles.answerTextSelected]}>
          {answer.answer_text}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Poppins_500Medium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.text,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeIconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  progressBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionText: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 24,
    lineHeight: 28,
  },
  answersContainer: {
    gap: 12,
  },
  answerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  answerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  answerRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerRadioSelected: {
    borderColor: colors.primary,
  },
  answerRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  answerText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: colors.text,
    lineHeight: 22,
  },
  answerTextSelected: {
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    gap: 8,
  },
  nextButton: {
    backgroundColor: colors.secondary,
  },
  navButtonDisabled: {
    backgroundColor: colors.border,
  },
  navButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
  },
  navButtonTextDisabled: {
    color: colors.textSecondary,
  },
  analyzingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  analyzingCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  analyzingText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  resultIconContainer: {
    marginBottom: 24,
  },
  resultIconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  scoreCard: {
    width: '100%',
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  scoreGradient: {
    padding: 32,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#fff',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
    marginBottom: 8,
  },
  scoreDetails: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#fff',
    opacity: 0.9,
  },
  resultsButtonContainer: {
    width: '100%',
    gap: 12,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  retakeButtonSuccess: {
    backgroundColor: colors.secondary,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
});

export default QuizComponent;
