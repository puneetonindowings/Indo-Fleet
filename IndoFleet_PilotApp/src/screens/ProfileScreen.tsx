import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  User,
  Phone,
  CreditCard,
  BadgeCheck,
  Truck,
  Building,
  Lock,
  Save,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { UserProfile } from '../types';
import { updatePilotProfile, changePassword } from '../services/api';
import { setUserProfile } from '../config';

interface ProfileScreenProps {
  user: UserProfile | null;
  onProfileUpdated: (updatedUser: UserProfile) => void;
}

/* ── Reusable input row with a focus state ─────────────────────────────────── */
interface FieldProps {
  label: string;
  icon: React.ElementType;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  secureTextEntry?: boolean;
  disabled?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  right?: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({
  label,
  icon: Icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
  disabled,
  autoCapitalize,
  right,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocused,
          disabled && styles.disabledWrap,
        ]}
      >
        <Icon size={16} color={focused ? '#5A00B8' : '#64748B'} style={styles.icon} />
        {disabled ? (
          <Text style={styles.disabledVal} numberOfLines={1}>
            {value}
          </Text>
        ) : (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            accessibilityLabel={label}
          />
        )}
        {right}
      </View>
    </View>
  );
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onProfileUpdated,
}) => {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dlId, setDlId] = useState(user?.dl_id || '');
  const [employeeId, setEmployeeId] = useState(user?.employee_id || '');
  const [vehicleId, setVehicleId] = useState(user?.vehicle_id || '');

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const displayName = user?.name || 'Delivery Partner';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'D';
  const roleLabel = (user?.role?.toLowerCase() === 'pilot' ? 'DELIVERY' : user?.role || 'DELIVERY').toUpperCase();

  // Save is only enabled when something actually changed
  const isDirty =
    name.trim() !== (user?.name || '') ||
    phone.trim() !== (user?.phone || '') ||
    dlId.trim() !== (user?.dl_id || '') ||
    employeeId.trim() !== (user?.employee_id || '') ||
    vehicleId.trim() !== (user?.vehicle_id || '');

  const lengthOk = newPass.trim().length >= 6;
  const matchOk = confirmPass.length > 0 && newPass === confirmPass;

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const updated = await updatePilotProfile({
        userId: user.id,
        name: name.trim(),
        phone: phone.trim(),
        dl_id: dlId.trim(),
        employee_id: employeeId.trim(),
        vehicle_id: vehicleId.trim(),
      });
      await setUserProfile(updated);
      onProfileUpdated(updated);
      Alert.alert('Profile Saved', 'Your profile details have been updated.');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!currentPass) {
      Alert.alert('Current Password Required', 'Please enter your current existing password.');
      return;
    }
    if (!newPass || newPass.trim().length < 6) {
      Alert.alert('Password Length', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert('Mismatch', 'New password and confirm password do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(user.id, newPass.trim(), currentPass.trim());
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      Alert.alert('Password Updated', 'Your delivery password has been changed successfully.');
    } catch (err: any) {
      Alert.alert('Password Change Failed', err.message || 'Incorrect current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const eyeToggle = (
    <TouchableOpacity
      onPress={() => setShowPass((s) => !s)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={showPass ? 'Hide passwords' : 'Show passwords'}
    >
      {showPass ? <EyeOff size={17} color="#94A3B8" /> : <Eye size={17} color="#94A3B8" />}
    </TouchableOpacity>
  );

  const passwordReady = !!currentPass && lengthOk && matchOk;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile banner */}
        <View style={styles.banner}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <Text style={styles.pilotName} numberOfLines={1}>
            {displayName}
          </Text>
          {!!user?.email && (
            <Text style={styles.pilotEmail} numberOfLines={1}>
              {user.email}
            </Text>
          )}

          <View style={styles.badgeRow}>
            <View style={styles.roleTag}>
              <BadgeCheck size={12} color="#A7F3D0" />
              <Text style={styles.roleTagText}>{roleLabel}</Text>
            </View>
            {user?.id ? (
              <View style={styles.idTag}>
                <Text style={styles.idTagText}>ID: {user.id}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Profile details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <User size={15} color="#3B0080" />
            </View>
            <Text style={styles.sectionTitle}>Delivery Details & Vehicle</Text>
          </View>

          <Field
            label="Full Name"
            icon={User}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            autoCapitalize="words"
          />
          <Field
            label="Registered Phone Number"
            icon={Phone}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91..."
            keyboardType="phone-pad"
          />
          <Field
            label="Driving License (DL ID)"
            icon={CreditCard}
            value={dlId}
            onChangeText={setDlId}
            placeholder="Enter DL Number"
            autoCapitalize="characters"
          />
          <Field
            label="Employee Badge ID"
            icon={BadgeCheck}
            value={employeeId}
            onChangeText={setEmployeeId}
            placeholder="Enter Employee ID"
            autoCapitalize="characters"
          />
          <Field
            label="Assigned Vehicle ID"
            icon={Truck}
            value={vehicleId}
            onChangeText={setVehicleId}
            placeholder="Enter Vehicle ID"
            autoCapitalize="characters"
          />
          <Field
            label="Base Station / Hub"
            icon={Building}
            value={user?.station || 'Not assigned yet'}
            disabled
          />

          <TouchableOpacity
            style={[styles.saveBtn, (!isDirty || savingProfile) && styles.btnDisabled]}
            onPress={handleSaveProfile}
            disabled={!isDirty || savingProfile}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isDirty || savingProfile }}
          >
            {savingProfile ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>
                  {isDirty ? 'Save Profile Updates' : 'No Changes to Save'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Change password */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Lock size={15} color="#3B0080" />
            </View>
            <Text style={styles.sectionTitle}>Change Account Password</Text>
          </View>

          <Field
            label="Current Password"
            icon={Lock}
            value={currentPass}
            onChangeText={setCurrentPass}
            placeholder="Enter current password"
            secureTextEntry={!showPass}
            autoCapitalize="none"
            right={eyeToggle}
          />
          <Field
            label="New Password"
            icon={Lock}
            value={newPass}
            onChangeText={setNewPass}
            placeholder="Enter new password"
            secureTextEntry={!showPass}
            autoCapitalize="none"
          />
          <Field
            label="Confirm New Password"
            icon={Lock}
            value={confirmPass}
            onChangeText={setConfirmPass}
            placeholder="Confirm new password"
            secureTextEntry={!showPass}
            autoCapitalize="none"
          />

          {newPass.length > 0 && (
            <View style={styles.checks}>
              <View style={styles.checkRow}>
                <CheckCircle size={14} color={lengthOk ? '#059669' : '#CBD5E1'} />
                <Text style={[styles.checkText, lengthOk && styles.checkTextOk]}>
                  At least 6 characters
                </Text>
              </View>
              <View style={styles.checkRow}>
                <CheckCircle size={14} color={matchOk ? '#059669' : '#CBD5E1'} />
                <Text style={[styles.checkText, matchOk && styles.checkTextOk]}>
                  Passwords match
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.passwordBtn, (!passwordReady || savingPassword) && styles.btnDisabled]}
            onPress={handleChangePassword}
            disabled={!passwordReady || savingPassword}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ disabled: !passwordReady || savingPassword }}
          >
            {savingPassword ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <CheckCircle size={16} color="#FFFFFF" />
                <Text style={styles.passwordBtnText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
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
  content: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },

  // Banner
  banner: {
    backgroundColor: '#3B0080',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pilotName: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 3,
    maxWidth: '100%',
  },
  pilotEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 2,
    maxWidth: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  idTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  idTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },

  // Section cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },

  // Fields
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 7,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapFocused: {
    borderColor: '#7C3AED',
    backgroundColor: '#FFFFFF',
  },
  disabledWrap: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  disabledVal: {
    flex: 1,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },

  // Password checks
  checks: {
    gap: 6,
    marginBottom: 6,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  checkTextOk: {
    color: '#059669',
  },

  // Buttons
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B0080',
    borderRadius: 26,
    height: 52,
    marginTop: 6,
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  passwordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 26,
    height: 52,
    marginTop: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  passwordBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
});