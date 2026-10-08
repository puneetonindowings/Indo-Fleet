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
} from 'lucide-react-native';
import { UserProfile } from '../types';
import { updatePilotProfile, changePassword } from '../services/api';
import { setUserProfile } from '../config';

interface ProfileScreenProps {
  user: UserProfile | null;
  onProfileUpdated: (updatedUser: UserProfile) => void;
}

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

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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
      Alert.alert('Profile Saved', 'Your pilot credentials and vehicle telemetry ID have been updated.');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header Avatar Banner */}
      <View style={styles.avatarCard}>
        <View style={styles.avatarCircle}>
          <User size={36} color="#8B5CF6" />
        </View>
        <Text style={styles.pilotName}>{user?.name || 'Delivery Partner'}</Text>
        <Text style={styles.pilotEmail}>{user?.email || 'delivery@indofleet.com'}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.roleTag}>
            <BadgeCheck size={12} color="#059669" />
            <Text style={styles.roleTagText}>{(user?.role?.toLowerCase() === 'pilot' ? 'DELIVERY' : (user?.role || 'DELIVERY')).toUpperCase()}</Text>
          </View>
          {user?.id ? (
            <View style={styles.idTag}>
              <Text style={styles.idTagText}>ID: {user.id}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Profile Details Form */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Delivery Details & Vehicle</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrap}>
            <User size={16} color="#64748B" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Puneet Kushwaha"
              placeholderTextColor="#64748B"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>REGISTERED PHONE NUMBER</Text>
          <View style={styles.inputWrap}>
            <Phone size={16} color="#64748B" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91..."
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>DRIVING LICENSE (DL ID)</Text>
          <View style={styles.inputWrap}>
            <CreditCard size={16} color="#64748B" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={dlId}
              onChangeText={setDlId}
              placeholder="Enter DL Number"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>EMPLOYEE BADGE ID</Text>
          <View style={styles.inputWrap}>
            <BadgeCheck size={16} color="#64748B" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={employeeId}
              onChangeText={setEmployeeId}
              placeholder="Enter Employee ID"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>ASSIGNED VEHICLE ID</Text>
          <View style={styles.inputWrap}>
            <Truck size={16} color="#64748B" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={vehicleId}
              onChangeText={setVehicleId}
              placeholder="Enter Vehicle ID"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>BASE STATION / HUB</Text>
          <View style={[styles.inputWrap, styles.disabledWrap]}>
            <Building size={16} color="#64748B" style={styles.icon} />
            <Text style={styles.disabledVal}>{user?.station || 'Assigned IndoFleet Hub'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveProfile}
          disabled={savingProfile}
        >
          {savingProfile ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Save size={16} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>SAVE PROFILE UPDATES</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Change Password Form */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>CHANGE ACCOUNT PASSWORD</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>CURRENT PASSWORD</Text>
          <View style={styles.inputWrap}>
            <Lock size={16} color="#64748B" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={currentPass}
              onChangeText={setCurrentPass}
              placeholder="Enter current password"
              placeholderTextColor="#64748B"
              secureTextEntry={true}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>NEW PASSWORD (MIN 6 CHARS)</Text>
          <View style={styles.inputWrap}>
            <Lock size={16} color="#64748B" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={newPass}
              onChangeText={setNewPass}
              placeholder="Enter new password"
              placeholderTextColor="#64748B"
              secureTextEntry={true}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
          <View style={styles.inputWrap}>
            <Lock size={16} color="#64748B" style={styles.icon} />
            <TextInput
              style={styles.input}
              value={confirmPass}
              onChangeText={setConfirmPass}
              placeholder="Confirm new password"
              placeholderTextColor="#64748B"
              secureTextEntry={true}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.passwordBtn}
          onPress={handleChangePassword}
          disabled={savingPassword}
        >
          {savingPassword ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle size={16} color="#FFFFFF" />
              <Text style={styles.passwordBtnText}>UPDATE PASSWORD</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  avatarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pilotName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 3,
  },
  pilotEmail: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  idTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  idTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3B0080',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
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
    height: 48,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledWrap: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  disabledVal: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B0080',
    borderRadius: 12,
    height: 48,
    marginTop: 8,
    shadowColor: '#3B0080',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  passwordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    height: 48,
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  passwordBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
