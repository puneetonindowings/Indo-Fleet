import React, { useState } from 'react';
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
} from 'react-native';
import {
  Lock,
  User,
  Settings,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';
import { IndoFleetLogo } from '../components/IndoFleetLogo';
import { loginPilot } from '../services/api';
import { setAuthToken, setUserProfile } from '../config';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile, mustChangePassword?: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Required Fields', 'Please enter your registered Delivery ID/Email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginPilot(identifier.trim(), password);
      if (res.user && res.token) {
        const role = (res.user.role || '').toLowerCase();
        if (role !== 'delivery' && role !== 'pilot') {
          Alert.alert(
            'Unauthorized Account',
            `Access Denied: This app is strictly for Delivery Partners. Your account role is '${res.user.role}'. Please use the IndoFleet Web Portal.`
          );
          return;
        }
        await setAuthToken(res.token);
        await setUserProfile(res.user);
        onLoginSuccess(res.user, res.must_change_password);
      }
    } catch (err: any) {
      Alert.alert('Unauthorized Access', err.message || 'Login failed. Only Delivery Partners can access this app.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Header Row */}
        <View style={styles.topBar}>
          <View style={styles.roleBadge}>
            <ShieldCheck size={14} color="#3B0080" />
            <Text style={styles.roleBadgeText}>Delivery</Text>
          </View>
        </View>

        {/* Brand Logo & Title */}
        <View style={styles.brandHero}>
          <IndoFleetLogo size="large" layout="column" showSubtitle={true} />
          <Text style={styles.appSubtitle}>
            Real-Time Delivery Navigation
          </Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Sign In to Your Account</Text>

          {/* Identifier Input */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Email / Phone / Delivery ID</Text>
            <View style={styles.inputWrap}>
              <User size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="e.g. delivery@indofleet.com"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#64748B"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={18} color="#94A3B8" />
                ) : (
                  <Eye size={18} color="#94A3B8" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Submit Button */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Sign In</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Security Notice Footer */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeHeading}>Need an Account?</Text>
          <Text style={styles.noticeText}>
            Delivery credentials are created by your Admin. Please contact your Dispatcher or Support team if you need access.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 0.8,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#3B0080',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  brandTitleAccent: {
    fontSize: 26,
    fontWeight: '900',
    color: '#3B0080',
    letterSpacing: 1,
  },
  appTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  cardHeading: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3B0080',
    letterSpacing: 1,
    marginBottom: 18,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  loginBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B0080',
    borderRadius: 12,
    height: 52,
    marginTop: 8,
    shadowColor: '#3B0080',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  noticeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  noticeHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
});
