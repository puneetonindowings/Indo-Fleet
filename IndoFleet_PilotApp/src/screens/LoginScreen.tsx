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
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { IndoFleetLogo } from '../components/IndoFleetLogo';
import { loginPilot } from '../services/api';
import { setAuthToken, setUserProfile } from '../config';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile, mustChangePassword?: boolean) => void;
}

const ALLOWED_ROLES = ['delivery', 'pilot', 'admin'];

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
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brandHero}>
            <IndoFleetLogo size="large" layout="column" showSubtitle={true} />
            <View style={styles.roleBadge}>
              <ShieldCheck size={14} color="#3B0080" />
              <Text style={styles.roleBadgeText}>Delivery partner app</Text>
            </View>
          </View>

          {/* Login card */}
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Sign in</Text>
            <Text style={styles.cardSubheading}>
              Use the credentials your admin created for you.
            </Text>

            {error ? (
              <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <AlertCircle size={16} color="#B91C1C" style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Identifier */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Email, phone or Delivery ID</Text>
              <View style={[styles.inputWrap, focused === 'identifier' && styles.inputWrapFocused]}>
                <User size={18} color={focused === 'identifier' ? '#3B0080' : '#64748B'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={(t) => {
                    setIdentifier(t);
                    if (error) setError('');
                  }}
                  onFocus={() => setFocused('identifier')}
                  onBlur={() => setFocused(null)}
                  placeholder="e.g. delivery@indofleet.com"
                  placeholderTextColor="#94A3B8"
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

            {/* Password */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputWrap, focused === 'password' && styles.inputWrapFocused]}>
                <Lock size={18} color={focused === 'password' ? '#3B0080' : '#64748B'} style={styles.inputIcon} />
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
                  placeholderTextColor="#94A3B8"
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
                  {showPassword ? <EyeOff size={20} color="#64748B" /> : <Eye size={20} color="#64748B" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.loginBtn, !canSubmit && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: !canSubmit, busy: loading }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Sign in</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Help */}
          <View style={styles.noticeBox}>
            <Text style={styles.noticeHeading}>Don't have an account?</Text>
            <Text style={styles.noticeText}>
              Your admin creates delivery accounts. Contact your dispatcher or the support team to get access.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B21B6',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 20,
  },
  cardHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubheading: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#3B0080',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  loginBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B0080',
    borderRadius: 28,
    height: 56,
    marginTop: 8,
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  loginBtnDisabled: {
    backgroundColor: '#A78BCA',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  noticeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  noticeHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});