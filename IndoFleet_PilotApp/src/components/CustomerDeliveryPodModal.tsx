import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  CheckCircle,
  X,
  KeyRound,
  User,
  MapPin,
  RefreshCw,
  FileText,
  ShieldCheck,
} from 'lucide-react-native';
import { DeliveryOrder, UserProfile } from '../types';
import { SignaturePad } from './SignaturePad';
import {
  requestCustomerDeliveryOtp,
  requestPilotDeliveryOtp,
  completeDeliveryHandover,
} from '../services/api';

interface CustomerDeliveryPodModalProps {
  visible: boolean;
  order: DeliveryOrder | null;
  pilotUser: UserProfile | null;
  currentCoords?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onDelivered: () => void;
}

export const CustomerDeliveryPodModal: React.FC<CustomerDeliveryPodModalProps> = ({
  visible,
  order,
  pilotUser,
  currentCoords,
  onClose,
  onDelivered,
}) => {
  const [customerOtp, setCustomerOtp] = useState('');
  const [pilotOtp, setPilotOtp] = useState('');
  const [recipientName, setRecipientName] = useState(order?.recipient_name || order?.customer_name || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [signatureSvg, setSignatureSvg] = useState('');

  const [loading, setLoading] = useState(false);
  const [requestingCustOtp, setRequestingCustOtp] = useState(false);
  const [requestingPilotOtp, setRequestingPilotOtp] = useState(false);

  if (!order) return null;

  const handleRequestCustomerOtp = async () => {
    setRequestingCustOtp(true);
    try {
      const res = await requestCustomerDeliveryOtp(order.id);
      Alert.alert('Customer OTP Dispatched', res.message || 'Delivery Verification OTP sent to customer phone and email.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not request customer OTP.');
    } finally {
      setRequestingCustOtp(false);
    }
  };

  const handleRequestPilotOtp = async () => {
    setRequestingPilotOtp(true);
    try {
      const res = await requestPilotDeliveryOtp(
        order.id,
        pilotUser?.email,
        pilotUser?.phone,
        pilotUser?.name
      );
      Alert.alert('Pilot OTP Dispatched', res.message || 'Pilot Verification OTP sent to your registered account.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not request pilot OTP.');
    } finally {
      setRequestingPilotOtp(false);
    }
  };

  const handleCompleteHandover = async () => {
    if (!recipientName.trim()) {
      Alert.alert('Recipient Required', 'Please enter the name of the person receiving the package.');
      return;
    }
    if (!customerOtp.trim()) {
      Alert.alert('Customer OTP Required', 'Please enter the 6-digit verification OTP provided by the customer.');
      return;
    }
    if (!pilotOtp.trim()) {
      Alert.alert('Pilot OTP Required', 'Please enter your 6-digit Pilot Self Verification OTP.');
      return;
    }

    setLoading(true);
    try {
      await completeDeliveryHandover({
        order_id: order.id,
        customer_otp: customerOtp.trim(),
        pilot_otp: pilotOtp.trim(),
        recipient_name: recipientName.trim(),
        digital_signature: signatureSvg || undefined,
        final_latitude: currentCoords?.latitude,
        final_longitude: currentCoords?.longitude,
        delivery_notes: deliveryNotes.trim() || 'Verified via Customer OTP, Pilot Self OTP & Digital Signature',
        pilot_name: pilotUser?.name || 'Pilot',
      });

      setCustomerOtp('');
      setPilotOtp('');
      setSignatureSvg('');
      onDelivered();
      onClose();
      Alert.alert(
        'Delivery Completed',
        `Order #${order.order_number} marked as Delivered. Customer OTP, Pilot OTP, and Signature verified.`
      );
    } catch (err: any) {
      Alert.alert('Delivery Failed', err.message || 'Could not complete delivery.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <CheckCircle size={20} color="#059669" />
              <Text style={styles.title}>Complete Delivery</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.instruction}>
              Verify customer OTP, your pilot OTP, and collect customer signature for order <Text style={styles.bold}>#{order.order_number}</Text>.
            </Text>

            {/* Step 1: Customer OTP */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <KeyRound size={15} color="#3B0080" />
                <Text style={styles.sectionTitle}>1. Customer OTP</Text>
              </View>

              <TouchableOpacity
                style={styles.otpDispatchBtn}
                onPress={handleRequestCustomerOtp}
                disabled={requestingCustOtp}
              >
                {requestingCustOtp ? (
                  <ActivityIndicator size="small" color="#3B0080" />
                ) : (
                  <>
                    <RefreshCw size={13} color="#3B0080" />
                    <Text style={styles.otpDispatchText}>Send OTP to Customer</Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                value={customerOtp}
                onChangeText={setCustomerOtp}
                placeholder="Enter 6-digit Customer OTP"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            {/* Step 2: Pilot Self Verification OTP */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <ShieldCheck size={15} color="#059669" />
                <Text style={styles.sectionTitle}>2. Delivery OTP</Text>
              </View>

              <TouchableOpacity
                style={[styles.otpDispatchBtn, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}
                onPress={handleRequestPilotOtp}
                disabled={requestingPilotOtp}
              >
                {requestingPilotOtp ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <>
                    <RefreshCw size={13} color="#059669" />
                    <Text style={[styles.otpDispatchText, { color: '#059669' }]}>Send OTP to My Phone</Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                value={pilotOtp}
                onChangeText={setPilotOtp}
                placeholder="Enter 6-digit Delivery OTP"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            {/* Step 3: Recipient Details */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <User size={15} color="#3B0080" />
                <Text style={styles.sectionTitle}>3. Recipient Name</Text>
              </View>
              <TextInput
                style={styles.input}
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Enter recipient's name"
                placeholderTextColor="#64748B"
              />
            </View>

            {/* Step 4: Digital Signature Canvas */}
            <SignaturePad onSignatureChange={setSignatureSvg} />

            {/* Step 5: Delivery Location Geo-Tag */}
            <View style={styles.geoBox}>
              <MapPin size={15} color="#059669" />
              <View style={styles.geoInfo}>
                <Text style={styles.geoLabel}>GPS Location Proof:</Text>
                <Text style={styles.geoVal}>
                  {currentCoords
                    ? `${currentCoords.latitude.toFixed(6)}, ${currentCoords.longitude.toFixed(6)}`
                    : 'Acquiring GPS location...'}
                </Text>
              </View>
            </View>

            {/* Step 6: Notes */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <FileText size={14} color="#94A3B8" />
                <Text style={styles.sectionTitle}>HANDOVER REMARKS (OPTIONAL)</Text>
              </View>
              <TextInput
                style={styles.input}
                value={deliveryNotes}
                onChangeText={setDeliveryNotes}
                placeholder="e.g. Received at reception gate directly"
                placeholderTextColor="#64748B"
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCompleteHandover}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>CONFIRM & CLOSE SORTIE</Text>
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
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '92%',
    padding: 20,
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
    marginBottom: 10,
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
  scrollBody: {
    marginVertical: 4,
  },
  instruction: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  bold: {
    color: '#0F172A',
    fontWeight: '700',
  },
  sectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B0080',
    letterSpacing: 0.5,
  },
  otpDispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  otpDispatchText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B0080',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    height: 44,
  },
  geoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  geoInfo: {
    flex: 1,
  },
  geoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.8,
  },
  geoVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    fontVariant: ['tabular-nums'],
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
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
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.25,
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
