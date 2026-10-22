import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ShieldCheck, X, KeyRound, AlertTriangle, UserCheck, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { DeliveryOrder, UserProfile } from '../types';
import { acceptAssignedOrder, requestPilotAcceptanceOtp } from '../services/api';

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
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpDispatched, setOtpDispatched] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const targetEmail = (currentUser?.email || order?.pilot_email || '').trim();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Auto-request OTP on modal open
  useEffect(() => {
    if (visible && order) {
      setOtp('');
      handleRequestMyOtp();
    }
  }, [visible, order?.id]);

  if (!order) return null;

  const hasDlId = Boolean(currentUser?.dl_id && currentUser.dl_id.trim());
  const hasVehicleId = Boolean(currentUser?.vehicle_id && currentUser.vehicle_id.trim());
  const isProfileComplete = true; // Non-blocking: defaults provided if pending profile verification

  const handleRequestMyOtp = async () => {
    if (requestingOtp) return;
    setRequestingOtp(true);
    try {
      await requestPilotAcceptanceOtp(order.id, {
        pilotId: currentUser?.id,
        pilotEmail: targetEmail,
        pilotPhone: currentUser?.phone,
      });
      setOtpDispatched(true);
      setCooldown(30);
    } catch (err: any) {
      console.warn('Acceptance OTP request error:', err);
      Alert.alert('Request Failed', err.message || 'Failed to dispatch acceptance OTP.');
    } finally {
      setRequestingOtp(false);
    }
  };

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
      Alert.alert('Required', 'Please enter your 6-digit Acceptance OTP.');
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
          pilotEmail: targetEmail,
          pilotPhone: currentUser?.phone,
          dlId: currentUser?.dl_id,
          vehicleId: currentUser?.vehicle_id,
        }
      );
      setOtp('');
      onAccepted();
      onClose();
      Alert.alert('Order Accepted', `Order #${order.order_number} has been officially accepted. You can now tap Start Delivery.`);
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
        Alert.alert('Verification Failed', err.message || 'Invalid Acceptance OTP. Please tap Request OTP to receive a new code.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <ShieldCheck size={20} color="#5A00B8" />
                <Text style={styles.title}>Accept Order</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
              Order <Text style={styles.highlight}>#{order.order_number}</Text> was assigned to you. Enter your verification OTP to accept.
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
                  <Text style={styles.profileBtnText}>Update Profile (Add DL &amp; Vehicle)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* If Profile is complete, render OTP input & Request OTP button */
              <View style={styles.formGroup}>
                {/* Dynamic Live Status Box */}
                {requestingOtp ? (
                  <View style={styles.statusBoxSending}>
                    <ActivityIndicator size="small" color="#5A00B8" />
                    <Text style={styles.statusTextSending}>
                      Generating &amp; sending OTP to {targetEmail}...
                    </Text>
                  </View>
                ) : otpDispatched ? (
                  <View style={styles.statusBoxSuccess}>
                    <CheckCircle2 size={18} color="#059669" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusTextSuccess}>
                        OTP dispatched to <Text style={{ fontWeight: '800' }}>{targetEmail}</Text>
                      </Text>
                      <Text style={styles.statusSubSuccess}>
                        Valid for 10 minutes · Check your inbox / spam folder
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Resend Action Pill */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.resendBtn, (requestingOtp || cooldown > 0) && styles.resendBtnDisabled]}
                    onPress={handleRequestMyOtp}
                    disabled={requestingOtp || cooldown > 0}
                    activeOpacity={0.7}
                  >
                    <RefreshCw size={12} color={cooldown > 0 ? '#94A3B8' : '#5A00B8'} />
                    <Text style={[styles.resendBtnText, cooldown > 0 && { color: '#94A3B8' }]}>
                      {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend Acceptance OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>

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
                    <Text style={styles.submitBtnText}>Verify &amp; Accept</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '90%',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  scrollContent: {
    flexGrow: 0,
    paddingBottom: 8,
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
  statusBoxSending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 8,
  },
  statusTextSending: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A00B8',
  },
  statusBoxSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 8,
  },
  statusTextSuccess: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  statusSubSuccess: {
    fontSize: 10,
    color: '#047857',
    marginTop: 2,
  },
  devOtpPill: {
    backgroundColor: '#5A00B8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  devOtpText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  resendBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  resendBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A00B8',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5A00B8',
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
    backgroundColor: '#5A00B8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5A00B8',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
    backgroundColor: '#5A00B8',
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
