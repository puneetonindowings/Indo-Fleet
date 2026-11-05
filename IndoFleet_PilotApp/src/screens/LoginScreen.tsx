import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { IndoFleetLogo } from '../components/IndoFleetLogo';
import { loginPilot } from '../services/api';
import { setAuthToken, setUserProfile } from '../config';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile, mustChangePassword?: boolean) => void;
}

const ALLOWED_ROLES = ['delivery', 'pilot', 'admin'];

const COLORS = {
  bg: '#FFFFFF',
  ink: '#16111F',
  muted: '#7A7587',
  field: '#F6F5F9',
  line: '#ECEAF1',
  brand: '#3B0080',
  brandDisabled: '#C9B8E0',
  error: '#B42318',
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'identifier' | 'password' | null>(null);
  const [error, setError] = useState('');

  const passwordRef = useRef<TextInput>(null);

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !loading;

  const handleLogin = async () => {
    if (loading) return;

    if (!identifier.trim() || !password) {
      setError('Enter your Delivery ID, email or phone, and your password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await loginPilot(identifier.trim(), password);

      if (!res?.user || !res?.token) {
        setError('Sign in did not complete. Please try again.');
        return;
      }

      const role = (res.user.role || '').toLowerCase();
      if (!ALLOWED_ROLES.includes(role)) {
        Alert.alert(
          'Account not allowed',
          `This app is for Delivery Partners and Admins. Your account role is "${res.user.role}". Please use the IndoFleet web portal instead.`
        );
        return;
      }

      await setAuthToken(res.token);
      await setUserProfile(res.user);
      onLoginSuccess(res.user, res.must_change_password);
    } catch (err: any) {
      setError(err?.message || 'Could not sign in. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.hero}>
              <IndoFleetLogo size="large" layout="column" showSubtitle={false} />
            </View>

            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>Sign in with the details your admin gave you.</Text>

            {error ? (
              <View style={styles.errorRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <AlertCircle size={16} color={COLORS.error} style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Email, phone or Delivery ID</Text>
              <View style={[styles.inputWrap, focused === 'identifier' && styles.inputWrapFocused]}>
                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={(t) => {
                    setIdentifier(t);
                    if (error) setError('');
                  }}
                  onFocus={() => setFocused('identifier')}
                  onBlur={() => setFocused(null)}
                  placeholder="delivery@indofleet.com"
                  placeholderTextColor="#B0ACBA"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                  editable={!loading}
                  accessibilityLabel="Email, phone or Delivery ID"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputWrap, focused === 'password' && styles.inputWrapFocused]}>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError('');
                  }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="Enter your password"
                  placeholderTextColor="#B0ACBA"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                  accessibilityLabel="Password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={19} color={COLORS.muted} />
                  ) : (
                    <Eye size={19} color={COLORS.muted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, !canSubmit && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: !canSubmit, busy: loading }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginBtnText}>Sign in</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footer}>
              No account yet? Ask your dispatcher or the support team to set one up.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  heading: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: COLORS.ink,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.muted,
    marginBottom: 32,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  errorIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.error,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: COLORS.field,
    borderWidth: 1,
    borderColor: COLORS.field,
  },
  inputWrapFocused: {
    backgroundColor: COLORS.bg,
    borderColor: COLORS.brand,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.ink,
    paddingVertical: 0,
  },
  loginBtn: {
    height: 56,
    marginTop: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
  },
  loginBtnDisabled: {
    backgroundColor: COLORS.brandDisabled,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  footer: {
    marginTop: 28,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: COLORS.muted,
  },
});