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
  Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  X,
  PackageCheck,
  MapPin,
  Wind,
  Check,
} from 'lucide-react-native';
import { DeliveryOrder, UserProfile } from '../types';
import { submitPostDeliveryInspection } from '../services/api';

interface PilotInspectionModalProps {
  visible: boolean;
  order: DeliveryOrder | null;
  pilotUser: UserProfile | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PilotInspectionModal: React.FC<PilotInspectionModalProps> = ({
  visible,
  order,
  pilotUser,
  onClose,
  onSuccess,
}) => {
  const defaultDrone = order?.assigned_drone_id || order?.drone_id || 'RPAV-000001';
  const [droneId, setDroneId] = useState(defaultDrone);

  const [overallVerdict, setOverallVerdict] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [fieldNotes, setFieldNotes] = useState<string>('OK Tested');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    const targetDrone = (droneId || defaultDrone).trim();
    if (!targetDrone) {
      Alert.alert('Drone ID Required', 'Please enter or confirm the drone airframe ID.');
      return;
    }

    if (!fieldNotes.trim()) {
      Alert.alert('Mandatory Remarks Required', 'Inspection remarks enter karna mandatory hai. Agar sab theek hai to "OK Tested" likhein, ya issue mention karein.');
      return;
    }

    const hasAnyDefect = overallVerdict === 'FAILED';

    setLoading(true);
    try {
      await submitPostDeliveryInspection({
        drone_id: targetDrone,
        delivery_id: order?.id,
        inspection_type: 'DELIVERY_PERSON_CHECK',
        cargo_bay_condition: hasAnyDefect ? 'JAMMED_DEFECT' : 'CLEAN_RELEASE',
        landing_surface: hasAnyDefect ? 'IMPACT_COLLISION' : 'SAFE_FLAT',
        propeller_debris_check: hasAnyDefect ? 'BLADE_DEFECT' : 'SPINS_FREE_NO_DEBRIS',
        field_battery_level: 80,
        zero_defect_certified: !hasAnyDefect,
        delivery_handover_notes: fieldNotes.trim(),
        body_condition: hasAnyDefect ? 'DAMAGED' : 'GOOD',
        propeller_condition: hasAnyDefect ? 'DAMAGED' : 'GOOD',
        battery_condition: 'NORMAL',
        landing_gear_condition: hasAnyDefect ? 'DAMAGED' : 'GOOD',
        overall_inspection: overallVerdict,
        remarks: fieldNotes.trim(),
      });

      Alert.alert(
        !hasAnyDefect ? 'Zero-Defect Delivery Verified' : 'Inspection Recorded (Defect Flagged)',
        `Airframe ${targetDrone} check recorded successfully.\nVerdict: ${overallVerdict} (${!hasAnyDefect ? 'Zero Defects Confirmed' : 'Maintenance Flagged'})`,
        [{
          text: 'OK',
          onPress: () => {
            onClose();
            if (onSuccess) onSuccess();
          },
        }]
      );
    } catch (err: any) {
      Alert.alert('Inspection Failed', err.message || 'Could not record delivery verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}>
        <View style={styles.modalCard}>

          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <ShieldCheck size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.title}>Delivery Field Inspection</Text>
                <Text style={styles.subTitle}>Delivery Partner Post-Handover Zero-Defect Check</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View style={styles.droneIdCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.fieldLabel}>AIRFRAME ID</Text>
                {order ? (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeText}>#{order.order_number || order.id.slice(0, 8)}</Text>
                  </View>
                ) : null}
              </View>
              <TextInput
                style={styles.droneIdInput}
                value={droneId}
                onChangeText={setDroneId}
                placeholder="e.g. RPAV-000001"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
              />
              <Text style={styles.hintText}>
                Delivery Person: {pilotUser?.name || 'Assigned Partner'} • Field Inspection
              </Text>
            </View>


            <Text style={styles.sectionHeading}>OVERALL AIRFRAME VERDICT</Text>
            <View style={{ gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => {
                  setOverallVerdict('PASSED');
                  if (!fieldNotes || fieldNotes === 'Hardware issue identified') setFieldNotes('OK Tested');
                }}
                style={[
                  styles.verdictOptionBtn,
                  overallVerdict === 'PASSED' ? styles.verdictPassedActive : styles.verdictInactive,
                ]}
                activeOpacity={0.8}
              >
                <Check size={18} color={overallVerdict === 'PASSED' ? '#059669' : '#64748B'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verdictTitle, overallVerdict === 'PASSED' && { color: '#059669' }]}>
                    PASSED / ZERO DEFECT
                  </Text>
                  <Text style={styles.verdictDesc}>Motors, frame, and payload bay cleared. Flight ready.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setOverallVerdict('FAILED');
                  if (!fieldNotes || fieldNotes === 'OK Tested') setFieldNotes('Hardware issue identified');
                }}
                style={[
                  styles.verdictOptionBtn,
                  overallVerdict === 'FAILED' ? styles.verdictFailedActive : styles.verdictInactive,
                ]}
                activeOpacity={0.8}
              >
                <AlertTriangle size={18} color={overallVerdict === 'FAILED' ? '#DC2626' : '#64748B'} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verdictTitle, overallVerdict === 'FAILED' && { color: '#DC2626' }]}>
                    ISSUE DETECTED
                  </Text>
                  <Text style={styles.verdictDesc}>Damage, cracked propeller, loose latch, or hardware failure.</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.remarksBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.fieldLabel}>INSPECTION REMARKS * (MANDATORY)</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: fieldNotes.trim() ? '#059669' : '#DC2626' }}>
                  {fieldNotes.trim() ? 'FILLED ✓' : 'REQUIRED'}
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 8 }}>
                {[
                  'OK Tested',
                  'Zero Defect - Flight Ready',
                  'Airframe & Motors Cleared',
                  'Minor scratch - Operable',
                  'Hardware issue flagged',
                ].map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={[styles.modalChip, fieldNotes === chip && styles.modalChipActive]}
                    onPress={() => setFieldNotes(chip)}
                  >
                    <Text style={[styles.modalChipText, fieldNotes === chip && styles.modalChipTextActive]}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={[styles.remarksInput, !fieldNotes.trim() && { borderColor: '#DC2626' }]}
                value={fieldNotes}
                onChangeText={setFieldNotes}
                placeholder="Enter mandatory remarks (e.g. OK Tested, all components operational)..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>


          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={[
                styles.submitBtn,
                overallVerdict === 'PASSED' ? styles.submitBtnPass : styles.submitBtnWarn,
                loading && styles.submitBtnDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <ShieldCheck size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    {overallVerdict === 'PASSED' ? 'Confirm 0 Defects & Save' : 'Submit Defect Report'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  verdictOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  verdictInactive: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  verdictPassedActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  verdictFailedActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  verdictTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  verdictDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalChipActive: {
    backgroundColor: '#3B0080',
    borderColor: '#3B0080',
  },
  modalChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  modalChipTextActive: {
    color: '#FFFFFF',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F0FDF4',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065F46',
  },
  subTitle: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
  scrollBody: {
    padding: 20,
  },
  droneIdCard: {
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  orderBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  droneIdInput: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hintText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 6,
  },
  checkItem: {
    marginBottom: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  pillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  pillBtnDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  pillBtnTextActive: {
    color: '#059669',
  },
  pillBtnTextDanger: {
    color: '#DC2626',
  },
  batteryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batteryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  batteryChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  batteryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  batteryChipTextActive: {
    color: '#2563EB',
  },
  batteryCustomInput: {
    width: 60,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  certificationCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  certCardPass: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  certCardFail: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  certCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certBoxPass: {
    backgroundColor: '#059669',
  },
  certBoxFail: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  certTextContainer: {
    flex: 1,
  },
  certTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  certTitlePass: {
    color: '#065F46',
  },
  certTitleFail: {
    color: '#991B1B',
  },
  certDescription: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginTop: 2,
  },
  remarksBox: {
    marginBottom: 16,
  },
  remarksInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 56,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  submitBtnPass: {
    backgroundColor: '#059669',
  },
  submitBtnWarn: {
    backgroundColor: '#DC2626',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
