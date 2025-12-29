
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { IconSymbol } from '@/components/IconSymbol';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

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

interface AcademyQuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
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

interface AcademyQuizData {
  id: string;
  title: string;
  description: string | null;
  required_correct_answers: number;
  total_questions: number;
  questions: AcademyQuizQuestion[];
}

interface QuizComponentProps {
  quizId: string;
  creatorHandle: string;
  onComplete: (passed: boolean, score: number) => void;
  onClose: () => void;
  isAcademyQuiz?: boolean;
}

export default function QuizComponent({ quizId, creatorHandle, onComplete, onClose, isAcademyQuiz = false }: QuizComponentProps) {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [academyQuizData, setAcademyQuizData] = useState<AcademyQuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: string]: string | number }>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    console.log('[QuizComponent] Mounted with quizId:', quizId, 'creatorHandle:', creatorHandle, 'isAcademyQuiz:', isAcademyQuiz);
    if (!quizId) {
      console.error('[QuizComponent] No quizId provided!');
      setError('Quiz ID is missing');
      setLoading(false);
      return;
    }
    
    if (isAcademyQuiz) {
      fetchAcademyQuizData();
    } else {
      fetchQuizData();
    }
  }, [quizId, isAcademyQuiz]);

  const fetchAcademyQuizData = async () => {
    try {
      console.log('[QuizComponent] Starting fetchAcademyQuizData for quizId:', quizId);
      setLoading(true);
      setError(null);

      // Fetch quiz from incubation_content table
      console.log('[QuizComponent] Fetching quiz from incubation_content...');
      const { data: content, error: contentError } = await supabase
        .from('incubation_content')
        .select('*')
        .eq('id', quizId)
        .single();

      if (contentError) {
        console.error('[QuizComponent] Error fetching academy quiz:', contentError);
        setError(`Failed to load quiz: ${contentError.message}`);
        throw contentError;
      }

      if (!content) {
        console.error('[QuizComponent] Academy quiz not found for id:', quizId);
        setError('Quiz not found');
        setLoading(false);
        return;
      }

      console.log('[QuizComponent] Academy quiz fetched successfully:', {
        id: content.id,
        title: content.title,
        quiz_questions: content.quiz_questions,
      });

      if (!content.quiz_questions || !Array.isArray(content.quiz_questions) || content.quiz_questions.length === 0) {
        console.error('[QuizComponent] No quiz questions found in content');
        setError('No questions found for this quiz');
        setLoading(false);
        return;
      }

      const questions: AcademyQuizQuestion[] = content.quiz_questions;
      const totalQuestions = questions.length;
      // Require 70% correct answers to pass
      const requiredCorrect = Math.ceil(totalQuestions * 0.7);

      const academyData: AcademyQuizData = {
        id: content.id,
        title: content.title,
        description: content.description,
        required_correct_answers: requiredCorrect,
        total_questions: totalQuestions,
        questions: questions,
      };

      console.log('[QuizComponent] Setting academy quiz data with', questions.length, 'questions, required correct:', requiredCorrect);
      setAcademyQuizData(academyData);
      console.log('[QuizComponent] Academy quiz data set successfully!');
    } catch (error: any) {
      console.error('[QuizComponent] Exception in fetchAcademyQuizData:', error);
      setError(`Failed to load quiz: ${error.message || 'Unknown error'}`);
      Alert.alert('Error', 'Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
      console.log('[QuizComponent] fetchAcademyQuizData completed, loading set to false');
    }
  };

  const fetchQuizData = async () => {
    try {
      console.log('[QuizComponent] Starting fetchQuizData for quizId:', quizId);
      setLoading(true);
      setError(null);

      // Fetch quiz details
      console.log('[QuizComponent] Fetching quiz from course_quizzes...');
      const { data: quiz, error: quizError } = await supabase
        .from('course_quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) {
        console.error('[QuizComponent] Error fetching quiz:', quizError);
        setError(`Failed to load quiz: ${quizError.message}`);
        throw quizError;
      }

      if (!quiz) {
        console.error('[QuizComponent] Quiz not found for id:', quizId);
        setError('Quiz not found');
        setLoading(false);
        return;
      }

      console.log('[QuizComponent] Quiz fetched successfully:', {
        id: quiz.id,
        title: quiz.title,
        required_correct_answers: quiz.required_correct_answers,
        total_questions: quiz.total_questions,
        passing_score: quiz.passing_score,
      });

      // Fetch questions
      console.log('[QuizComponent] Fetching questions from quiz_questions...');
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      if (questionsError) {
        console.error('[QuizComponent] Error fetching questions:', questionsError);
        setError(`Failed to load questions: ${questionsError.message}`);
        throw questionsError;
      }

      if (!questions || questions.length === 0) {
        console.error('[QuizComponent] No questions found for quiz:', quizId);
        setError('No questions found for this quiz');
        setLoading(false);
        return;
      }

      console.log('[QuizComponent] Questions fetched:', questions.length, 'questions');

      // Fetch answers for all questions
      const questionIds = questions.map(q => q.id);
      console.log('[QuizComponent] Fetching answers for', questionIds.length, 'questions...');
      
      const { data: answers, error: answersError } = await supabase
        .from('quiz_answers')
        .select('*')
        .in('question_id', questionIds)
        .order('order_index', { ascending: true });

      if (answersError) {
        console.error('[QuizComponent] Error fetching answers:', answersError);
        setError(`Failed to load answers: ${answersError.message}`);
        throw answersError;
      }

      if (!answers || answers.length === 0) {
        console.error('[QuizComponent] No answers found for questions');
        setError('No answers found for quiz questions');
        setLoading(false);
        return;
      }

      console.log('[QuizComponent] Answers fetched:', answers.length, 'answers');

      // Group answers by question
      const questionsWithAnswers: QuizQuestion[] = questions.map(question => {
        const questionAnswers = answers.filter(a => a.question_id === question.id);
        console.log(`[QuizComponent] Question "${question.question_text.substring(0, 50)}..." has ${questionAnswers.length} answers`);
        
        return {
          id: question.id,
          question_text: question.question_text,
          order_index: question.order_index,
          answers: questionAnswers,
        };
      });

      const quizDataToSet = {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        passing_score: quiz.passing_score,
        required_correct_answers: quiz.required_correct_answers,
        total_questions: quiz.total_questions,
        questions: questionsWithAnswers,
      };

      console.log('[QuizComponent] Setting quiz data with', questionsWithAnswers.length, 'questions, required correct:', quiz.required_correct_answers);
      setQuizData(quizDataToSet);
      console.log('[QuizComponent] Quiz data set successfully!');
    } catch (error: any) {
      console.error('[QuizComponent] Exception in fetchQuizData:', error);
      setError(`Failed to load quiz: ${error.message || 'Unknown error'}`);
      Alert.alert('Error', 'Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
      console.log('[QuizComponent] fetchQuizData completed, loading set to false');
    }
  };

  const handleAnswerSelect = (questionId: string | number, answerId: string | number) => {
    console.log('[QuizComponent] Answer selected:', { questionId, answerId });
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId,
    }));
  };

  const handleNext = () => {
    console.log('[QuizComponent] Moving to next question');
    const totalQuestions = isAcademyQuiz ? (academyQuizData?.questions.length || 0) : (quizData?.questions.length || 0);
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    console.log('[QuizComponent] Moving to previous question');
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const data = isAcademyQuiz ? academyQuizData : quizData;
    if (!data) {
      console.error('[QuizComponent] Cannot submit - no quiz data');
      return;
    }

    console.log('[QuizComponent] Submitting quiz');

    // Check if all questions are answered
    const unansweredQuestions = data.questions.filter(
      (q, index) => !selectedAnswers[isAcademyQuiz ? index : (q as QuizQuestion).id]
    );

    if (unansweredQuestions.length > 0) {
      console.log('[QuizComponent] Unanswered questions:', unansweredQuestions.length);
      Alert.alert(
        'Incomplete Quiz',
        `Please answer all questions before submitting. ${unansweredQuestions.length} question(s) remaining.`
      );
      return;
    }

    try {
      setSubmitting(true);

      // Calculate score
      let correct = 0;
      
      if (isAcademyQuiz && academyQuizData) {
        academyQuizData.questions.forEach((question, index) => {
          const selectedAnswerIndex = selectedAnswers[index];
          if (selectedAnswerIndex === question.correct_answer) {
            correct++;
          }
        });
      } else if (quizData) {
        quizData.questions.forEach(question => {
          const selectedAnswerId = selectedAnswers[question.id];
          const selectedAnswer = question.answers.find(a => a.id === selectedAnswerId);
          if (selectedAnswer?.is_correct) {
            correct++;
          }
        });
      }

      const totalQuestions = data.questions.length;
      const scorePercentage = Math.round((correct / totalQuestions) * 100);
      
      // Use required_correct_answers from database to determine pass/fail
      const passed = correct >= (data.required_correct_answers || 0);

      console.log('[QuizComponent] Quiz results:', { 
        correct, 
        totalQuestions, 
        scorePercentage, 
        passed,
        required: data.required_correct_answers 
      });

      setCorrectCount(correct);
      setScore(scorePercentage);

      // Save attempt to database
      console.log('[QuizComponent] Saving quiz attempt to database...');
      const { error } = await supabase
        .from('user_quiz_attempts')
        .insert({
          creator_handle: creatorHandle,
          quiz_id: quizId,
          score: scorePercentage,
          passed: passed,
          answers: selectedAnswers,
        });

      if (error) {
        console.error('[QuizComponent] Error saving quiz attempt:', error);
      } else {
        console.log('[QuizComponent] Quiz attempt saved successfully');
      }

      setShowResults(true);
      onComplete(passed, scorePercentage);
    } catch (error: any) {
      console.error('[QuizComponent] Error submitting quiz:', error);
      Alert.alert('Error', 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    console.log('[QuizComponent] Retrying quiz');
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
    setCorrectCount(0);
  };

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading quiz...</Text>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
      </View>
    );
  }

  const data = isAcademyQuiz ? academyQuizData : quizData;

  if (error || !data) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="error"
            size={64}
            color={colors.error}
          />
          <Text style={styles.errorTitle}>Unable to Load Quiz</Text>
          <Text style={styles.errorText}>
            {error || 'Quiz not found. Please try again later.'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={isAcademyQuiz ? fetchAcademyQuizData : fetchQuizData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showResults) {
    const passed = correctCount >= (data.required_correct_answers || 0);

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Results</Text>
          <View style={styles.backButton} />
        </View>

        <View style={[styles.resultsCard, passed ? styles.passedCard : styles.failedCard]}>
          <View style={styles.resultsIconContainer}>
            <IconSymbol
              ios_icon_name={passed ? "checkmark.circle.fill" : "xmark.circle.fill"}
              android_material_icon_name={passed ? "check-circle" : "cancel"}
              size={80}
              color={passed ? colors.primary : colors.error}
            />
          </View>

          <Text style={styles.resultsTitle}>
            {passed ? 'Congratulations!' : 'Not Quite There'}
          </Text>

          <Text style={styles.resultsSubtitle}>
            {passed
              ? 'You passed the quiz!'
              : 'You need more correct answers to pass.'}
          </Text>

          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Your Score</Text>
            <Text style={styles.scoreValue}>{score}%</Text>
            <Text style={styles.scoreDetails}>
              {correctCount} out of {data.questions.length} correct
            </Text>
            <Text style={styles.scoreRequirement}>
              Required: {data.required_correct_answers} correct answers ({Math.round((data.required_correct_answers / data.questions.length) * 100)}%)
            </Text>
          </View>

          <View style={styles.resultsButtons}>
            <TouchableOpacity
              style={styles.retryButtonLarge}
              onPress={handleRetry}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="arrow.clockwise"
                android_material_icon_name="refresh"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.retryButtonTextLarge}>Retake Quiz</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.doneButtonText}>
                {passed ? 'Continue Learning' : 'Back to Academy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Render current question
  let currentQuestion: any;
  let selectedAnswerId: string | number | undefined;
  let totalQuestions: number;

  if (isAcademyQuiz && academyQuizData) {
    currentQuestion = academyQuizData.questions[currentQuestionIndex];
    selectedAnswerId = selectedAnswers[currentQuestionIndex];
    totalQuestions = academyQuizData.questions.length;
  } else if (quizData) {
    currentQuestion = quizData.questions[currentQuestionIndex];
    selectedAnswerId = selectedAnswers[currentQuestion.id];
    totalQuestions = quizData.questions.length;
  } else {
    return null;
  }

  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="xmark"
            android_material_icon_name="close"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{data.title}</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </Text>
      </View>

      <ScrollView style={styles.quizContent} contentContainerStyle={styles.quizContentContainer}>
        <Text style={styles.questionText}>
          {isAcademyQuiz ? currentQuestion.question : currentQuestion.question_text}
        </Text>

        <View style={styles.answersContainer}>
          {isAcademyQuiz ? (
            // Academy quiz answers
            currentQuestion.options.map((option: string, index: number) => {
              const isSelected = selectedAnswerId === index;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.answerCard,
                    isSelected && styles.answerCardSelected,
                  ]}
                  onPress={() => handleAnswerSelect(currentQuestionIndex, index)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.answerRadio,
                    isSelected && styles.answerRadioSelected,
                  ]}>
                    {isSelected && (
                      <View style={styles.answerRadioInner} />
                    )}
                  </View>
                  <Text style={[
                    styles.answerText,
                    isSelected && styles.answerTextSelected,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            // Course quiz answers
            currentQuestion.answers.map((answer: QuizAnswer) => {
              const isSelected = selectedAnswerId === answer.id;

              return (
                <TouchableOpacity
                  key={answer.id}
                  style={[
                    styles.answerCard,
                    isSelected && styles.answerCardSelected,
                  ]}
                  onPress={() => handleAnswerSelect(currentQuestion.id, answer.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.answerRadio,
                    isSelected && styles.answerRadioSelected,
                  ]}>
                    {isSelected && (
                      <View style={styles.answerRadioInner} />
                    )}
                  </View>
                  <Text style={[
                    styles.answerText,
                    isSelected && styles.answerTextSelected,
                  ]}>
                    {answer.answer_text}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentQuestionIndex === 0 && styles.navButtonDisabled,
          ]}
          onPress={handlePrevious}
          disabled={currentQuestionIndex === 0}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="chevron-left"
            size={20}
            color={currentQuestionIndex === 0 ? colors.grey : colors.primary}
          />
          <Text style={[
            styles.navButtonText,
            currentQuestionIndex === 0 && styles.navButtonTextDisabled,
          ]}>
            Previous
          </Text>
        </TouchableOpacity>

        {currentQuestionIndex === totalQuestions - 1 ? (
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Quiz</Text>
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={20}
                  color="#FFFFFF"
                />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonText}>Next</Text>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.grey,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  quizContent: {
    flex: 1,
  },
  quizContentContainer: {
    padding: 20,
  },
  questionText: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    lineHeight: 28,
    marginBottom: 24,
  },
  answersContainer: {
    gap: 12,
  },
  answerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  answerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(102, 66, 239, 0.1)',
  },
  answerRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.grey,
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
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
    lineHeight: 22,
  },
  answerTextSelected: {
    color: colors.primary,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.grey,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.primary,
  },
  navButtonTextDisabled: {
    color: colors.grey,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flex: 1,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  resultsCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  passedCard: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  failedCard: {
    borderWidth: 3,
    borderColor: colors.error,
  },
  resultsIconContainer: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  resultsSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  scoreLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
    marginBottom: 8,
  },
  scoreDetails: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 4,
  },
  scoreRequirement: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  resultsButtons: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  retryButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
  },
  retryButtonTextLarge: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  doneButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
  closeButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: colors.primary,
  },
});
