
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import QuizComponent from '@/components/QuizComponent';
import { useFocusEffect } from '@react-navigation/native';

// Hardcoded creator handle - no authentication needed
const CREATOR_HANDLE = 'avelezsanti';

export default function QuizScreen() {
  const params = useLocalSearchParams<{ 
    quizId: string;
    quizTitle: string;
  }>();

  // Ensure we have the quizId
  const quizId = Array.isArray(params.quizId) ? params.quizId[0] : params.quizId;
  const quizTitle = Array.isArray(params.quizTitle) ? params.quizTitle[0] : params.quizTitle;

  console.log('[QuizScreen] Rendering with params:', { 
    quizId, 
    quizTitle,
    rawParams: params 
  });

  const handleQuizComplete = (passed: boolean, score: number) => {
    console.log('[QuizScreen] Quiz completed:', { passed, score });
  };

  const handleClose = () => {
    console.log('[QuizScreen] Closing quiz');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/academy');
    }
  };

  // Prevent going back during quiz
  useFocusEffect(
    useCallback(() => {
      console.log('[QuizScreen] Screen focused');
      return () => {
        console.log('[QuizScreen] Screen unfocused');
      };
    }, [])
  );

  if (!quizId) {
    console.error('[QuizScreen] No quizId provided, params:', params);
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <View style={styles.container}>
        <QuizComponent
          quizId={quizId}
          creatorHandle={CREATOR_HANDLE}
          onComplete={handleQuizComplete}
          onClose={handleClose}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
