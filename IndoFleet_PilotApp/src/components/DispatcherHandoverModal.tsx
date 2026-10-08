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
import { Zap, X, KeyRound, RefreshCw } from 'lucide-react-native';
import { DeliveryOrder } from '../types';
import { requestDispatcherHandoverOtp, verifyHandoverAndStartFlight } from '../services/api';

interface DispatcherHandoverModalProps {
  visible: boolean;
  order: DeliveryOrder | null;
  pilotName: string;
  pilotPhone?: string;
  vehicleId?: string;
  currentCoords?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onFlightStarted: (trackingUrl?: string) => void;
}

export const DispatcherHandoverModal: React.FC<DispatcherHandoverModalProps> = ({
  visible,
  order,
  pilotName,
  pilotPhone,
  vehicleId,
  currentCoords,
  onClose,
  onFlightStarted,
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);

  if (!order) return null;

  const handleRequestOtp = async () => {
    setRequestingOtp(true);
    try {
      await requestDispatcherHandoverOtp(order.id, pilotName);
      Alert.alert('Dispatcher OTP Requested', 'Dispatcher Handover OTP has been generated and sent to the Operations Dispatcher.');
    } catch (err: any) {
      Alert.alert('Request Failed', err.message || 'Could not reach dispatcher.');
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyStart = async () => {
    if (!otp.trim()) {
      Alert.alert('Required', 'Please enter the 6-digit Dispatcher Handover OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyHandoverAndStartFlight({
        order_id: order.id,
        dispatcher_otp: otp.trim(),
        pilot_name: pilotName,
        pilot_phone: pilotPhone,
        vehicle_id: vehicleId,
        initial_lat: currentCoords?.latitude,
        initial_lng: currentCoords?.longitude,
      });

      setOtp('');
      onFlightStarted(res.tracking_url);
      onClose();
      Alert.alert(
        'Delivery Started',
        `Order is now out for delivery. Live tracking link has been sent to ${order.customer_name}.`
      );
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid Dispatcher OTP.');
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
              <Zap size={20} color="#3B0080" />
              <Text style={styles.title}>Start Delivery</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            To start delivery for order <Text style={styles.highlight}>#{order.order_number}</Text>, enter the authorization OTP given by your Dispatcher.
          </Text>

          <TouchableOpacity
            style={styles.requestOtpBtn}
            onPress={handleRequestOtp}
            disabled={requestingOtp}
          >
            {requestingOtp ? (
              <ActivityIndicator size="small" color="#3B0080" />
            ) : (
              <>
                <RefreshCw size={14} color="#3B0080" />
                <Text style={styles.requestOtpText}>Request Dispatcher OTP</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Enter 6-Digit Dispatcher OTP</Text>
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

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleVerifyStart}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Verify & Start Delivery</Text>
              )}
            </TouchableOpacity>
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
  requestOtpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 16,
  },
  requestOtpText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3B0080',
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
    backgroundColor: '#3B0080',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B0080',
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
});
