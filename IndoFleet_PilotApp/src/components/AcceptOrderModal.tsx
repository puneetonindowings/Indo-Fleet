import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ShieldCheck, X, KeyRound, AlertTriangle, UserCheck } from 'lucide-react-native';
import { DeliveryOrder, UserProfile } from '../types';
import { acceptAssignedOrder } from '../services/api';

interface AcceptOrderModalProps {
  visible: boolean;
  order: DeliveryOrder | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onAccepted: () => void;
  onNavigateProfile?: () => void;
}

export const AcceptOrderModal: React.FC<AcceptOrderModalProps> = ({
  visible,
  order,
  currentUser,
  onClose,
  onAccepted,
  onNavigateProfile,
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const hasDlId = Boolean(currentUser?.dl_id && currentUser.dl_id.trim());
  const hasVehicleId = Boolean(currentUser?.vehicle_id && currentUser.vehicle_id.trim());
  const isProfileComplete = hasDlId && hasVehicleId;

  const handleVerifyAccept = async () => {
    if (!isProfileComplete) {
      Alert.alert(
        'Profile Incomplete',
        'Please enter your Driving License (DL ID) and Vehicle Number in Profile before accepting orders.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Profile',
            onPress: () => {
              onClose();
              if (onNavigateProfile) onNavigateProfile();
            },
          },
        ]
      );
      return;
    }

    if (!otp.trim()) {
      Alert.alert('Required', 'Please enter the 6-digit Assignment Acceptance OTP.');
      return;
    }

    setLoading(true);
    try {
      await acceptAssignedOrder(
        order.id,
        otp.trim(),
        currentUser?.name || 'Delivery Partner',
        {
          pilotId: currentUser?.id,
          dlId: currentUser?.dl_id,
          vehicleId: currentUser?.vehicle_id,
        }
      );
      setOtp('');
      onAccepted();
      onClose();
      Alert.alert('Order Accepted', `Order #${order.order_number} has been officially accepted. You can now proceed to package handover.`);
    } catch (err: any) {
      if (err.requires_profile_update || (err.message && err.message.includes('Profile Incomplete'))) {
        Alert.alert(
          'Profile Incomplete',
          err.message || 'Please fill your DL ID and Vehicle Number in Profile.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go to Profile',
              onPress: () => {
                onClose();
                if (onNavigateProfile) onNavigateProfile();
              },
            },
          ]
        );
      } else {
        Alert.alert('Verification Failed', err.message || 'Invalid Acceptance OTP. Please check with Dispatcher.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ShieldCheck size={20} color="#3B0080" />
              <Text style={styles.title}>Accept Order</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Order <Text style={styles.highlight}>#{order.order_number}</Text> was assigned by{' '}
            <Text style={styles.highlight}>{order.assigned_by_name || 'Dispatcher'}</Text>.
          </Text>

          {/* If Profile Missing DL ID or Vehicle Number, show warning banner */}
          {!isProfileComplete ? (
            <View style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <AlertTriangle size={18} color="#D97706" />
                <Text style={styles.warningTitle}>Profile Details Required</Text>
              </View>
              <Text style={styles.warningText}>
                You cannot accept this order yet. You must add your{' '}
                <Text style={styles.warningBold}>Driving License (DL ID)</Text> and{' '}
                <Text style={styles.warningBold}>Vehicle Number</Text> in your profile first.
              </Text>
              <TouchableOpacity
                style={styles.profileBtn}
                onPress={() => {
                  onClose();
                  if (onNavigateProfile) onNavigateProfile();
                }}
                activeOpacity={0.8}
              >
                <UserCheck size={16} color="#FFFFFF" />
                <Text style={styles.profileBtnText}>Update Profile (Add DL & Vehicle)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* If Profile is complete, render OTP input */
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Enter 6-Digit Acceptance OTP</Text>
              <View style={styles.inputContainer}>
                <KeyRound size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="••••••"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus={true}
                />
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            {isProfileComplete && (
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleVerifyAccept}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify & Accept</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  highlight: {
    color: '#0F172A',
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B0080',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    flex: 1.8,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D97706',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D97706',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    padding: 14,
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  warningText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: 12,
  },
  warningBold: {
    fontWeight: '800',
    color: '#92400E',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B0080',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  profileBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
