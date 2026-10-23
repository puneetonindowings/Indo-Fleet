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

  const [cargoBayCondition, setCargoBayCondition] = useState<string>('CLEAN_RELEASE');
  const [landingSurface, setLandingSurface] = useState<string>('SAFE_FLAT');
  const [propellerCheck, setPropellerCheck] = useState<string>('SPINS_FREE_NO_DEBRIS');
  const [fieldBattery, setFieldBattery] = useState<string>('75');
  const [zeroDefectCertified, setZeroDefectCertified] = useState<boolean>(true);
  const [fieldNotes, setFieldNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    const targetDrone = (droneId || defaultDrone).trim();
    if (!targetDrone) {
      Alert.alert('Drone ID Required', 'Please enter or confirm the drone airframe ID.');
      return;
    }

    const hasAnyDefect =
      cargoBayCondition === 'JAMMED_DEFECT' ||
      landingSurface === 'IMPACT_COLLISION' ||
      propellerCheck === 'BLADE_DEFECT' ||
      !zeroDefectCertified;

    const overallVerdict = hasAnyDefect ? 'FAILED' : 'PASSED';
    const parsedBattery = parseInt(fieldBattery, 10);

    setLoading(true);
    try {
      await submitPostDeliveryInspection({
        drone_id: targetDrone,
        delivery_id: order?.id,
        inspection_type: 'DELIVERY_PERSON_CHECK', // Distinct Delivery Person Field Verification
        cargo_bay_condition: cargoBayCondition,
        landing_surface: landingSurface,
        propeller_debris_check: propellerCheck,
        field_battery_level: Number.isFinite(parsedBattery) ? parsedBattery : null,
        zero_defect_certified: zeroDefectCertified,
        delivery_handover_notes: fieldNotes.trim() || undefined,
        body_condition: hasAnyDefect ? 'DAMAGED' : 'GOOD',
        propeller_condition: propellerCheck === 'BLADE_DEFECT' ? 'DAMAGED' : 'GOOD',
        battery_condition: 'NORMAL',
        landing_gear_condition: landingSurface === 'IMPACT_COLLISION' ? 'DAMAGED' : 'GOOD',
        overall_inspection: overallVerdict,
        remarks: fieldNotes.trim() || (zeroDefectCertified ? 'Delivery completed with 0 defects. Drone verified and secured for vehicle transport.' : 'Field defect flagged during delivery handover.'),
      });

      Alert.alert(
        zeroDefectCertified ? 'Zero-Defect Delivery Verified' : 'Inspection Recorded (Defect Flagged)',
        `Airframe ${targetDrone} delivery check recorded successfully.\nVerdict: ${overallVerdict} (${zeroDefectCertified ? '0 Defects Verified' : 'Maintenance Required'})`,
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


            <Text style={styles.sectionHeading}>POST-DELIVERY FIELD CHECKS</Text>


            <View style={styles.checkItem}>
              <View style={styles.itemHeader}>
                <PackageCheck size={14} color="#3B0080" />
                <Text style={styles.itemTitle}>1. Cargo Bay & Payload Release</Text>
              </View>
              <View style={styles.btnRow}>
                {[
                  { id: 'CLEAN_RELEASE', label: 'Clean Release & Locked' },
                  { id: 'MANUAL_ASSIST', label: 'Manual Assist' },
                  { id: 'JAMMED_DEFECT', label: 'Cargo Jam / Defect' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setCargoBayCondition(opt.id)}
                    style={[
                      styles.pillBtn,
                      cargoBayCondition === opt.id && styles.pillBtnActive,
                      opt.id === 'JAMMED_DEFECT' && cargoBayCondition === opt.id && styles.pillBtnDanger,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillBtnText,
                        cargoBayCondition === opt.id && styles.pillBtnTextActive,
                        opt.id === 'JAMMED_DEFECT' && cargoBayCondition === opt.id && styles.pillBtnTextDanger,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>


            <View style={styles.checkItem}>
              <View style={styles.itemHeader}>
                <MapPin size={14} color="#3B0080" />
                <Text style={styles.itemTitle}>2. Field Landing Surface & Ground Contact</Text>
              </View>
              <View style={styles.btnRow}>
                {[
                  { id: 'SAFE_FLAT', label: 'Safe Flat Ground / Mat' },
                  { id: 'ROUGH_TERRAIN', label: 'Rough / Dusty Surface' },
                  { id: 'IMPACT_COLLISION', label: 'Hard Impact / Defect' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setLandingSurface(opt.id)}
                    style={[
                      styles.pillBtn,
                      landingSurface === opt.id && styles.pillBtnActive,
                      opt.id === 'IMPACT_COLLISION' && landingSurface === opt.id && styles.pillBtnDanger,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillBtnText,
                        landingSurface === opt.id && styles.pillBtnTextActive,
                        opt.id === 'IMPACT_COLLISION' && landingSurface === opt.id && styles.pillBtnTextDanger,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>


            <View style={styles.checkItem}>
              <View style={styles.itemHeader}>
                <Wind size={14} color="#3B0080" />
                <Text style={styles.itemTitle}>3. Propellers & Motor Debris Check</Text>
              </View>
              <View style={styles.btnRow}>
                {[
                  { id: 'SPINS_FREE_NO_DEBRIS', label: 'Clear, Spins Freely' },
                  { id: 'DEBRIS_REMOVED', label: 'Debris Cleared' },
                  { id: 'BLADE_DEFECT', label: 'Chipped / Bent Blade' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setPropellerCheck(opt.id)}
                    style={[
                      styles.pillBtn,
                      propellerCheck === opt.id && styles.pillBtnActive,
                      opt.id === 'BLADE_DEFECT' && propellerCheck === opt.id && styles.pillBtnDanger,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillBtnText,
                        propellerCheck === opt.id && styles.pillBtnTextActive,
                        opt.id === 'BLADE_DEFECT' && propellerCheck === opt.id && styles.pillBtnTextDanger,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>


            <Text style={styles.sectionHeading}>ZERO-DEFECT CERTIFICATION</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setZeroDefectCertified(!zeroDefectCertified)}
              style={[
                styles.certificationCard,
                zeroDefectCertified ? styles.certCardPass : styles.certCardFail,
              ]}
            >
              <View style={[styles.certCheckbox, zeroDefectCertified ? styles.certBoxPass : styles.certBoxFail]}>
                {zeroDefectCertified ? <Check size={16} color="#FFFFFF" /> : <AlertTriangle size={16} color="#DC2626" />}
              </View>
              <View style={styles.certTextContainer}>
                <Text style={[styles.certTitle, zeroDefectCertified ? styles.certTitlePass : styles.certTitleFail]}>
                  {zeroDefectCertified ? '0 DEFECTS CONFIRMED' : 'DEFECT FLAGGED FOR MAINTENANCE'}
                </Text>
                <Text style={styles.certDescription}>
                  {zeroDefectCertified
                    ? 'I certify that delivery was completed without airframe, motor, or cargo damage. Drone is safe for return flight.'
                    : 'A defect or damage was detected during field delivery. Drone will be held for technical inspection.'}
                </Text>
              </View>
            </TouchableOpacity>


            <View style={styles.remarksBox}>
              <Text style={styles.fieldLabel}>FIELD DELIVERY OBSERVATIONS (OPTIONAL)</Text>
              <TextInput
                style={styles.remarksInput}
                value={fieldNotes}
                onChangeText={setFieldNotes}
                placeholder="e.g. Clean delivery on customer lawn, package unlatched smoothly, drone motors clean."
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
                zeroDefectCertified ? styles.submitBtnPass : styles.submitBtnWarn,
                loading && styles.submitBtnDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <ShieldCheck size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    {zeroDefectCertified ? 'Confirm 0 Defects & Save' : 'Submit Defect Report'}
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
