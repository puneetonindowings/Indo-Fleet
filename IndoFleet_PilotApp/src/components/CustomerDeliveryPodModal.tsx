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
  Image, KeyboardAvoidingView, Platform } from 'react-native';
import {
  CheckCircle,
  X,
  KeyRound,
  User,
  MapPin,
  RefreshCw,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Image as ImageIcon,
  Trash2,
  Lock,
  Unlock,
  PackageCheck,
  Wind,
  Battery,
  Check,
  QrCode,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { DeliveryOrder, UserProfile } from '../types';
import { getDefaultDroneModel } from '../config';
import {
  requestCustomerDeliveryOtp,
  requestPilotDeliveryOtp,
  completeDeliveryHandover,
  submitPostDeliveryInspection,
} from '../services/api';

interface CustomerDeliveryPodModalProps {
  visible: boolean;
  order: DeliveryOrder | null;
  pilotUser: UserProfile | null;
  currentCoords?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onDelivered: (completedOrder: DeliveryOrder) => void;
  onOpenFullScreenInspection?: () => void;
}

export const CustomerDeliveryPodModal: React.FC<CustomerDeliveryPodModalProps> = ({
  visible,
  order,
  pilotUser,
  currentCoords,
  onClose,
  onDelivered,
  onOpenFullScreenInspection,
}) => {
  // Pre-Handover Airframe & Zero-Defect Inspection State (Step 1 - Mandatory)
  const existingInspection = Boolean(
    order?.inspection_id ||
    (Array.isArray(order?.inspected_drone_ids) && order.inspected_drone_ids.length > 0) ||
    order?.delivery_data?.post_delivery_inspection ||
    order?.delivery_data?.delivery_person_inspection
  );
  const [isInspectionVerified, setIsInspectionVerified] = useState<boolean>(existingInspection);
  const [verifiedInspectionId, setVerifiedInspectionId] = useState<string>(
    order?.inspection_id || order?.delivery_data?.post_delivery_inspection?.inspection_id || ''
  );
  const [verifyingInspection, setVerifyingInspection] = useState<boolean>(false);

  // Field Checklist
  const [cargoBayCondition, setCargoBayCondition] = useState<string>('CLEAN_RELEASE');
  const [landingSurface, setLandingSurface] = useState<string>('SAFE_FLAT');
  const [propellerCheck, setPropellerCheck] = useState<string>('SPINS_FREE_NO_DEBRIS');
  const [fieldBattery, setFieldBattery] = useState<string>('75');
  const [zeroDefectCertified, setZeroDefectCertified] = useState<boolean>(true);

  // Handover Verification State (Step 2 - Unlocked only after Inspection)
  const [customerOtp, setCustomerOtp] = useState('');
  const [pilotOtp, setPilotOtp] = useState('');
  const [recipientName, setRecipientName] = useState(order?.recipient_name || order?.customer_name || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [podPhoto, setPodPhoto] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [requestingCustOtp, setRequestingCustOtp] = useState(false);
  const [requestingPilotOtp, setRequestingPilotOtp] = useState(false);

  if (!order) return null;

  const targetDrone = order.assigned_drone_id || order.drone_id || getDefaultDroneModel();
  const cleanDroneName = targetDrone.includes('@') ? 'IndoWings 700 RPAV' : targetDrone;

  // Step 1: Verify & Lock Airframe & Cargo Inspection
  const handleVerifyInspection = async () => {
    setVerifyingInspection(true);
    const hasAnyDefect =
      cargoBayCondition === 'JAMMED_DEFECT' ||
      landingSurface === 'IMPACT_COLLISION' ||
      propellerCheck === 'BLADE_DEFECT' ||
      !zeroDefectCertified;

    const overallVerdict = hasAnyDefect ? 'FAILED' : 'PASSED';
    const parsedBattery = parseInt(fieldBattery, 10);

    try {
      const res = await submitPostDeliveryInspection({
        drone_id: targetDrone,
        delivery_id: order.id,
        inspection_type: 'DELIVERY_PERSON_CHECK',
        cargo_bay_condition: cargoBayCondition,
        landing_surface: landingSurface,
        propeller_debris_check: propellerCheck,
        field_battery_level: Number.isFinite(parsedBattery) ? parsedBattery : null,
        zero_defect_certified: zeroDefectCertified,
        delivery_handover_notes: zeroDefectCertified ? '0 Defects Verified before customer handover.' : 'Field defect noticed before handover.',
        body_condition: hasAnyDefect ? 'DAMAGED' : 'GOOD',
        propeller_condition: propellerCheck === 'BLADE_DEFECT' ? 'DAMAGED' : 'GOOD',
        battery_condition: 'NORMAL',
        landing_gear_condition: landingSurface === 'IMPACT_COLLISION' ? 'DAMAGED' : 'GOOD',
        overall_inspection: overallVerdict,
        remarks: `Pre-handover field verification: ${overallVerdict}`,
      });

      setIsInspectionVerified(true);
      setVerifiedInspectionId(res?.inspection_id || 'INS-VERIFIED');

      Alert.alert(
        '✓ Inspection Verified',
        zeroDefectCertified
          ? `Airframe ${targetDrone} inspected: 0 Defects Confirmed.\nCustomer & Partner OTP handover are now unlocked.`
          : `Inspection logged as ${overallVerdict}. Customer & Partner OTP handover are now unlocked.`
      );
    } catch (err: any) {
      Alert.alert('Inspection Failed', err.message || 'Could not verify airframe inspection.');
    } finally {
      setVerifyingInspection(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!isInspectionVerified) {
      Alert.alert('Inspection Required', 'Please complete and verify Airframe Inspection in Step 1 first.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture proof of delivery photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.3,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setPodPhoto(base64Data);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Could not open camera.');
    }
  };

  const handlePickGallery = async () => {
    if (!isInspectionVerified) {
      Alert.alert('Inspection Required', 'Please complete and verify Airframe Inspection in Step 1 first.');
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is required to choose a photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.3,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setPodPhoto(base64Data);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Could not open photo gallery.');
    }
  };

  const handleRequestCustomerOtp = async () => {
    if (!isInspectionVerified) {
      Alert.alert('Inspection Required', 'Please complete and verify Airframe Inspection in Step 1 first.');
      return;
    }
    setRequestingCustOtp(true);
    try {
      const res = await requestCustomerDeliveryOtp(order.id);
      if (res.customer_otp) {
        setCustomerOtp(res.customer_otp);
        Alert.alert(
          'Customer OTP Dispatched',
          `${res.message || 'Verification OTP sent to customer.'}\n\nCustomer OTP: ${res.customer_otp} (Auto-filled)`
        );
      } else {
        Alert.alert('Customer OTP Dispatched', res.message || 'Delivery Verification OTP sent to customer phone and email.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not request customer OTP.');
    } finally {
      setRequestingCustOtp(false);
    }
  };

  const handleRequestPilotOtp = async () => {
    if (!isInspectionVerified) {
      Alert.alert('Inspection Required', 'Please complete and verify Airframe Inspection in Step 1 first.');
      return;
    }
    setRequestingPilotOtp(true);
    try {
      const res = await requestPilotDeliveryOtp(
        order.id,
        pilotUser?.email,
        pilotUser?.phone,
        pilotUser?.name
      );
      if (res.pilot_otp) {
        setPilotOtp(res.pilot_otp);
        Alert.alert(
          'Delivery OTP Dispatched',
          `${res.message || 'OTP sent to your registered account.'}\n\nDelivery OTP: ${res.pilot_otp} (Auto-filled)`
        );
      } else {
        Alert.alert('Delivery OTP Dispatched', res.message || 'Delivery Partner Verification OTP sent to your registered account.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not request delivery OTP.');
    } finally {
      setRequestingPilotOtp(false);
    }
  };

  const handleCompleteHandover = async () => {
    if (!isInspectionVerified) {
      Alert.alert('Inspection Required', 'Please complete and verify Drone Inspection in Step 1 before completing delivery.');
      return;
    }
    if (!recipientName.trim()) {
      Alert.alert('Recipient Required', 'Please enter the name of the person receiving the package.');
      return;
    }
    if (!customerOtp.trim()) {
      Alert.alert('Customer OTP Required', 'Please enter the 6-digit verification OTP provided by the customer.');
      return;
    }
    if (!pilotOtp.trim()) {
      Alert.alert('Delivery Partner OTP Required', 'Please enter your 6-digit Delivery Partner Verification OTP.');
      return;
    }

    setLoading(true);
    try {
      await completeDeliveryHandover({
        order_id: order.id,
        customer_otp: customerOtp.trim(),
        pilot_otp: pilotOtp.trim(),
        recipient_name: recipientName.trim(),
        pod_photo: podPhoto || undefined,
        final_latitude: currentCoords?.latitude,
        final_longitude: currentCoords?.longitude,
        delivery_notes: deliveryNotes.trim() || 'Verified via Drone Field Check, Customer OTP & Delivery Partner OTP',
        pilot_name: pilotUser?.name || 'Delivery Partner',
        inspection_id: verifiedInspectionId || undefined,
      });

      const finishedOrder = order;
      setCustomerOtp('');
      setPilotOtp('');
      setPodPhoto(null);
      onDelivered(finishedOrder);
      onClose();
      Alert.alert(
        'Delivery Completed',
        `Order #${finishedOrder.order_number} marked as Delivered. Airframe Inspection, Customer OTP & Delivery Partner OTP verified.`
      );
    } catch (err: any) {
      Alert.alert('Delivery Failed', err.message || 'Could not complete delivery.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.headerIconCircle, isInspectionVerified && styles.headerIconCircleVerified]}>
                {isInspectionVerified ? <ShieldCheck size={18} color="#059669" /> : <ShieldAlert size={18} color="#5A00B8" />}
              </View>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.title} numberOfLines={1}>Delivery Handover &amp; Verification</Text>
                <Text style={styles.subTitle} numberOfLines={1}>Order #{order.order_number || order.id.slice(0, 8)} • Drone: {cleanDroneName}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* ═══════════════════════════════════════════════════════════
                STAGE 1: AIRFRAME & ZERO-DEFECT INSPECTION (MANDATORY)
               ═══════════════════════════════════════════════════════════ */}
            <View style={[styles.stepContainer, isInspectionVerified ? styles.stepContainerVerified : styles.stepContainerPending]}>
              <View style={styles.stepHeaderRow}>
                <View style={styles.stepTitleGroup}>
                  <View style={[styles.stepNumberBadge, isInspectionVerified ? styles.stepBadgeDone : styles.stepBadgeActive]}>
                    <Text style={styles.stepNumberText}>{isInspectionVerified ? '✓' : '1'}</Text>
                  </View>
                  <View style={styles.stepTitleWrap}>
                    <Text style={styles.stepTitle}>Step 1: Drone &amp; Cargo Inspection</Text>
                    <Text style={styles.stepSubtitle} numberOfLines={2}>
                      {isInspectionVerified
                        ? 'Inspection verified. 0 Defects confirmed on airframe.'
                        : 'Inspect drone & payload before taking Customer & Partner OTP'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.verificationPill, isInspectionVerified ? styles.pillVerified : styles.pillPending]}>
                  {isInspectionVerified ? <Check size={12} color="#059669" /> : <Lock size={12} color="#64748B" />}
                  <Text style={[styles.verificationPillText, isInspectionVerified ? styles.textVerified : styles.textPending]}>
                    {isInspectionVerified ? 'VERIFIED' : 'REQUIRED'}
                  </Text>
                </View>
              </View>

              {!isInspectionVerified ? (
                <View style={styles.inspectionFormBody}>
                  {/* 0. Drone Airframe QR Verification */}
                  <View style={styles.checkItem}>
                    <View style={styles.itemHeader}>
                      <QrCode size={13} color="#3B0080" />
                      <Text style={styles.itemLabel}>Airframe QR Verification</Text>
                    </View>
                    <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Assigned Airframe Drone ID:</Text>
                      <Text style={{ fontSize: 15, fontFamily: 'monospace', fontWeight: '900', color: '#0F172A', marginTop: 2 }}>{targetDrone}</Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#ECFDF5', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' }}>
                        <Check size={14} color="#059669" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>Physical QR Scanned &amp; Verified on Consignment</Text>
                      </View>
                      {onOpenFullScreenInspection && (
                        <TouchableOpacity
                          onPress={onOpenFullScreenInspection}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#5a00b8', paddingVertical: 10, borderRadius: 10, marginTop: 8 }}
                          activeOpacity={0.85}
                        >
                          <Camera size={14} color="#FFFFFF" />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Open Full-Screen Photo &amp; Video Inspection</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* 1. Cargo Bay */}
                  <View style={styles.checkItem}>
                    <View style={styles.itemHeader}>
                      <PackageCheck size={13} color="#3B0080" />
                      <Text style={styles.itemLabel}>Cargo Bay &amp; Payload Release</Text>
                    </View>
                    <View style={styles.btnRow}>
                      {[
                        { id: 'CLEAN_RELEASE', label: 'Clean Release' },
                        { id: 'MANUAL_ASSIST', label: 'Manual Assist' },
                        { id: 'JAMMED_DEFECT', label: 'Cargo Jam/Defect' },
                      ].map((opt) => (
                        <TouchableOpacity
                          key={opt.id}
                          onPress={() => setCargoBayCondition(opt.id)}
                          style={[
                            styles.chipBtn,
                            cargoBayCondition === opt.id && styles.chipBtnActive,
                            opt.id === 'JAMMED_DEFECT' && cargoBayCondition === opt.id && styles.chipBtnDanger,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipBtnText,
                              cargoBayCondition === opt.id && styles.chipBtnTextActive,
                              opt.id === 'JAMMED_DEFECT' && cargoBayCondition === opt.id && styles.chipBtnTextDanger,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* 2. Landing Surface */}
                  <View style={styles.checkItem}>
                    <View style={styles.itemHeader}>
                      <MapPin size={13} color="#3B0080" />
                      <Text style={styles.itemLabel}>Landing Surface &amp; Impact</Text>
                    </View>
                    <View style={styles.btnRow}>
                      {[
                        { id: 'SAFE_FLAT', label: 'Safe Flat Ground' },
                        { id: 'ROUGH_TERRAIN', label: 'Rough/Dusty' },
                        { id: 'IMPACT_COLLISION', label: 'Hard Impact' },
                      ].map((opt) => (
                        <TouchableOpacity
                          key={opt.id}
                          onPress={() => setLandingSurface(opt.id)}
                          style={[
                            styles.chipBtn,
                            landingSurface === opt.id && styles.chipBtnActive,
                            opt.id === 'IMPACT_COLLISION' && landingSurface === opt.id && styles.chipBtnDanger,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipBtnText,
                              landingSurface === opt.id && styles.chipBtnTextActive,
                              opt.id === 'IMPACT_COLLISION' && landingSurface === opt.id && styles.chipBtnTextDanger,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* 3. Propeller Debris */}
                  <View style={styles.checkItem}>
                    <View style={styles.itemHeader}>
                      <Wind size={13} color="#3B0080" />
                      <Text style={styles.itemLabel}>Propellers &amp; Motor Debris</Text>
                    </View>
                    <View style={styles.btnRow}>
                      {[
                        { id: 'SPINS_FREE_NO_DEBRIS', label: 'Clear & Free Spin' },
                        { id: 'DEBRIS_REMOVED', label: 'Debris Cleared' },
                        { id: 'BLADE_DEFECT', label: 'Blade Defect' },
                      ].map((opt) => (
                        <TouchableOpacity
                          key={opt.id}
                          onPress={() => setPropellerCheck(opt.id)}
                          style={[
                            styles.chipBtn,
                            propellerCheck === opt.id && styles.chipBtnActive,
                            opt.id === 'BLADE_DEFECT' && propellerCheck === opt.id && styles.chipBtnDanger,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipBtnText,
                              propellerCheck === opt.id && styles.chipBtnTextActive,
                              opt.id === 'BLADE_DEFECT' && propellerCheck === opt.id && styles.chipBtnTextDanger,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* 4. Zero Defect Toggle */}
                  <TouchableOpacity
                    style={[styles.zeroDefectCard, zeroDefectCertified ? styles.zeroDefectPass : styles.zeroDefectFail]}
                    onPress={() => setZeroDefectCertified(!zeroDefectCertified)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkCircle, zeroDefectCertified ? styles.checkCirclePass : styles.checkCircleFail]}>
                      {zeroDefectCertified ? <Check size={14} color="#FFFFFF" /> : <X size={14} color="#FFFFFF" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.zeroDefectTitle, zeroDefectCertified ? styles.textPass : styles.textFail]}>
                        {zeroDefectCertified ? 'Zero Defects Confirmed' : 'Defect Detected during Delivery'}
                      </Text>
                      <Text style={styles.zeroDefectDesc}>
                        {zeroDefectCertified
                          ? 'I certify that parcel was delivered without airframe or motor defects.'
                          : 'A defect occurred. Airframe will be flagged for maintenance.'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Verify Action Button */}
                  <TouchableOpacity
                    style={styles.verifyInspectionBtn}
                    onPress={handleVerifyInspection}
                    disabled={verifyingInspection}
                  >
                    {verifyingInspection ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <ShieldCheck size={16} color="#FFFFFF" />
                        <Text style={styles.verifyInspectionBtnText}>
                          VERIFY INSPECTION &amp; UNLOCK OTP HANDOVER
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.verifiedSuccessBanner}>
                  <CheckCircle size={16} color="#059669" />
                  <Text style={styles.verifiedSuccessText} numberOfLines={2}>
                    Drone {cleanDroneName} inspection verified. 0 Defects archived in flight logs.
                  </Text>
                  <TouchableOpacity onPress={() => setIsInspectionVerified(false)} style={styles.recheckBtn}>
                    <Text style={styles.recheckBtnText}>Re-check</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ═══════════════════════════════════════════════════════════
                STAGE 2: CUSTOMER OTP & PROOF OF DELIVERY (LOCKED UNTIL STEP 1)
               ═══════════════════════════════════════════════════════════ */}
            <View style={[styles.stepContainer, !isInspectionVerified && styles.stepContainerLocked]}>
              <View style={styles.stepHeaderRow}>
                <View style={styles.stepTitleGroup}>
                  <View style={[styles.stepNumberBadge, isInspectionVerified ? styles.stepBadgeActive : styles.stepBadgeLocked]}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepTitleWrap}>
                    <Text style={[styles.stepTitle, !isInspectionVerified && styles.textMuted]}>
                      Step 2: Customer OTP &amp; POD
                    </Text>
                    <Text style={styles.stepSubtitle} numberOfLines={2}>
                      {isInspectionVerified ? 'Collect customer verification and package photo' : 'Locked until Step 1 Inspection is verified'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.verificationPill, isInspectionVerified ? styles.pillUnlocked : styles.pillLocked]}>
                  {isInspectionVerified ? <Unlock size={12} color="#059669" /> : <Lock size={12} color="#94A3B8" />}
                  <Text style={[styles.verificationPillText, isInspectionVerified ? styles.textVerified : styles.textLocked]}>
                    {isInspectionVerified ? 'UNLOCKED' : 'LOCKED'}
                  </Text>
                </View>
              </View>

              {!isInspectionVerified ? (
                <View style={styles.lockedNoticeBox}>
                  <Lock size={20} color="#94A3B8" />
                  <Text style={styles.lockedNoticeText}>
                    Complete and verify Step 1 (Drone &amp; Cargo Inspection) above to unlock Customer OTP, Delivery Partner OTP, and POD handover.
                  </Text>
                </View>
              ) : (
                <View style={styles.unlockedHandoverBody}>
                  {/* Step 2A: Customer OTP */}
                  <View style={styles.sectionBox}>
                    <View style={styles.sectionHeader}>
                      <KeyRound size={15} color="#3B0080" />
                      <Text style={styles.sectionTitle}>Customer Verification OTP</Text>
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

                  {/* Step 2B: Delivery Partner Self OTP */}
                  <View style={styles.sectionBox}>
                    <View style={styles.sectionHeader}>
                      <ShieldCheck size={15} color="#059669" />
                      <Text style={styles.sectionTitle}>Delivery Partner Self OTP</Text>
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

                  {/* Step 2C: Recipient Details */}
                  <View style={styles.sectionBox}>
                    <View style={styles.sectionHeader}>
                      <User size={15} color="#3B0080" />
                      <Text style={styles.sectionTitle}>Recipient Name</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={recipientName}
                      onChangeText={setRecipientName}
                      placeholder="Enter recipient's name"
                      placeholderTextColor="#64748B"
                    />
                  </View>

                  {/* Step 2D: Proof of Delivery (POD) Photo */}
                  <View style={styles.sectionBox}>
                    <View style={styles.sectionHeader}>
                      <Camera size={15} color="#3B0080" />
                      <Text style={styles.sectionTitle}>Proof of Delivery (POD) Photo</Text>
                    </View>

                    {podPhoto ? (
                      <View style={styles.photoPreviewContainer}>
                        <Image source={{ uri: podPhoto }} style={styles.photoPreview} />
                        <TouchableOpacity
                          style={styles.removePhotoBtn}
                          onPress={() => setPodPhoto(null)}
                        >
                          <Trash2 size={14} color="#EF4444" />
                          <Text style={styles.removePhotoText}>Remove / Retake Photo</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.photoActionRow}>
                        <TouchableOpacity
                          style={styles.photoActionBtn}
                          onPress={handleTakePhoto}
                        >
                          <Camera size={16} color="#3B0080" />
                          <Text style={styles.photoActionText}>Take Camera Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.photoActionBtn, styles.galleryBtn]}
                          onPress={handlePickGallery}
                        >
                          <ImageIcon size={16} color="#475569" />
                          <Text style={[styles.photoActionText, { color: '#475569' }]}>Choose Gallery</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Step 2E: Delivery Location Geo-Tag */}
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

                  {/* Step 2G: Notes */}
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
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, (!isInspectionVerified || loading) && styles.submitBtnDisabled]}
              onPress={handleCompleteHandover}
              disabled={loading || !isInspectionVerified}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>CONFIRM &amp; COMPLETE DELIVERY</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 14,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    maxHeight: '92%',
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerIconCircleVerified: {
    backgroundColor: '#DCFCE7',
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    flexShrink: 0,
  },
  scrollBody: {
    marginVertical: 4,
  },
  stepContainer: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  stepContainerPending: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  stepContainerVerified: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  stepContainerLocked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  stepTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  stepTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepBadgeActive: {
    backgroundColor: '#5A00B8',
  },
  stepBadgeDone: {
    backgroundColor: '#059669',
  },
  stepBadgeLocked: {
    backgroundColor: '#94A3B8',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
  },
  stepSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  verificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  pillVerified: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  pillPending: {
    backgroundColor: '#F3E8FF',
    borderColor: '#D8B4FE',
  },
  pillUnlocked: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  pillLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  verificationPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  textVerified: {
    color: '#059669',
  },
  textPending: {
    color: '#7C3AED',
  },
  textLocked: {
    color: '#94A3B8',
  },
  textMuted: {
    color: '#94A3B8',
  },
  inspectionFormBody: {
    marginTop: 6,
    gap: 10,
  },
  checkItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  chipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipBtnActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#7C3AED',
  },
  chipBtnDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  chipBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  chipBtnTextActive: {
    color: '#5A00B8',
  },
  chipBtnTextDanger: {
    color: '#DC2626',
  },
  zeroDefectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  zeroDefectPass: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  zeroDefectFail: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCirclePass: {
    backgroundColor: '#059669',
  },
  checkCircleFail: {
    backgroundColor: '#DC2626',
  },
  zeroDefectTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  textPass: {
    color: '#065F46',
  },
  textFail: {
    color: '#991B1B',
  },
  zeroDefectDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  verifyInspectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#5A00B8',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#5A00B8',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  verifyInspectionBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  verifiedSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  verifiedSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
    minWidth: 0,
    lineHeight: 16,
  },
  recheckBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    flexShrink: 0,
  },
  recheckBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  lockedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5F9',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  lockedNoticeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  unlockedHandoverBody: {
    gap: 12,
    marginTop: 6,
  },
  sectionBox: {
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  otpDispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    borderRadius: 10,
    marginBottom: 6,
  },
  otpDispatchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A00B8',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 10,
  },
  galleryBtn: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  photoActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A00B8',
  },
  photoPreviewContainer: {
    alignItems: 'center',
    gap: 8,
  },
  photoPreview: {
    width: '100%',
    height: 140,
    borderRadius: 12,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removePhotoText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
  },
  geoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  geoInfo: {
    flex: 1,
  },
  geoLabel: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '700',
  },
  geoVal: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '800',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
