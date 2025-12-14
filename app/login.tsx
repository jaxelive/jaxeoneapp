
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';

export default function LoginScreen() {
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMagicLink = async () => {
    if (!tiktokHandle.trim()) {
      Alert.alert('Error', 'Please enter your TikTok handle');
      return;
    }

    setLoading(true);

    try {
      // Remove @ if user included it
      const cleanHandle = tiktokHandle.trim().replace('@', '');

      // Query creators table for this handle
      const { data: creators, error: queryError } = await supabase
        .from('creators')
        .select('email, first_name')
        .eq('creator_handle', cleanHandle)
        .eq('is_active', true)
        .limit(1);

      if (queryError) {
        console.error('[Login] Query error:', queryError);
        Alert.alert('Error', 'Failed to look up your account. Please try again.');
        setLoading(false);
        return;
      }

      if (!creators || creators.length === 0) {
        Alert.alert(
          'Not Found',
          'We couldn\'t find an account with that TikTok handle. Please check and try again.'
        );
        setLoading(false);
        return;
      }

      const creator = creators[0];
      const email = creator.email;

      // Send magic link
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed',
        },
      });

      if (magicLinkError) {
        console.error('[Login] Magic link error:', magicLinkError);
        Alert.alert('Error', 'Failed to send magic link. Please try again.');
        setLoading(false);
        return;
      }

      Alert.alert(
        'Check Your Email! 📧',
        `We've sent a magic link to ${email}. Click the link to sign in.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/onboarding'),
          },
        ]
      );
    } catch (error: any) {
      console.error('[Login] Unexpected error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#FFFFFF', '#FAF5FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.emoji}>🎯</Text>
            <Text style={styles.title}>Welcome to JAXE One</Text>
            <Text style={styles.subtitle}>Enter your TikTok handle to get started</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>TikTok Handle</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.atSymbol}>@</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your_handle"
                  placeholderTextColor={colors.textTertiary}
                  value={tiktokHandle}
                  onChangeText={setTiktokHandle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSendMagicLink}
              disabled={loading}
            >
              <LinearGradient
                colors={colors.gradientPurple}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send Magic Link ✨</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              We'll send a magic link to your registered email
            </Text>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: colors.grey,
  },
  atSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
