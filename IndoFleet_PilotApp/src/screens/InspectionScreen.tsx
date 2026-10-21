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
  Image,
} from 'react-native';
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  X,
  PackageCheck,
  Battery,
  Camera,
  Video,
  ImageIcon,
  ArrowLeft,
  Check,
  Trash2,
  FileText,
  QrCode,
  Flame,
  KeyRound,
  User,
  Lock,
  Unlock,
  RefreshCw,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { DeliveryOrder, UserProfile } from '../types';
import {
  submitPostDeliveryInspection,
  completeDeliveryHandover,
  requestCustomerDeliveryOtp,
  requestPilotDeliveryOtp,
} from '../services/api';

interface InspectionScreenProps {
  order: DeliveryOrder | null;
  pilotUser: UserProfile | null;
  currentCoords?: { latitude: number; longitude: number } | null;
  onBack: () => void;
  onSuccess: (inspectionId?: string) => void;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  uri: string;
  base64?: string;
  name?: string;
}

export const InspectionScreen: React.FC<InspectionScreenProps> = ({
  order,
  pilotUser,
  currentCoords,
  onBack,
  onSuccess,
}) => {
  const defaultDrone = order?.assigned_drone_id || order?.drone_id || 'RPAV-000001';
  const cleanDroneName = defaultDrone.includes('@') ? 'IndoWings 700 RPAV' : defaultDrone;
  const [droneId, setDroneId] = useState<string>(cleanDroneName);

  // Field Verification Specific Checklist (Delivery Person)
  const [cargoBayCondition, setCargoBayCondition] = useState<string>('CLEAN_RELEASE');
  const [landingSurface, setLandingSurface] = useState<string>('SAFE_FLAT');
  const [propellerCheck, setPropellerCheck] = useState<string>('SPINS_FREE_NO_DEBRIS');
  const [fieldBattery, setFieldBattery] = useState<string>('78');
  const [zeroDefectCertified, setZeroDefectCertified] = useState<boolean>(true);
  const [fieldNotes, setFieldNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Handover Verification States
  const [recipientName, setRecipientName] = useState<string>(order?.recipient_name || order?.customer_name || '');
  const [customerOtp, setCustomerOtp] = useState<string>('');
  const [pilotOtp, setPilotOtp] = useState<string>('');
  const [podPhoto, setPodPhoto] = useState<string | null>(null);
  const [requestingCustOtp, setRequestingCustOtp] = useState<boolean>(false);
  const [requestingPilotOtp, setRequestingPilotOtp] = useState<boolean>(false);

  // Photo & Video Media Evidence
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  // Camera Photo Capture
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission Required', 'Please enable camera access to take inspection photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const newItem: MediaItem = {
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'image',
          uri: asset.uri,
          base64: base64Data,
          name: `Photo_${Date.now()}.jpg`,
        };
        setMediaItems((prev) => [...prev, newItem]);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Could not open camera.');
    }
  };

  // Video Recording Capture
  const handleRecordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission Required', 'Please enable camera access to record inspection video.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 30, // 30-sec airframe inspection clip
        quality: 0.4,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newItem: MediaItem = {
          id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'video',
          uri: asset.uri,
          name: `Video_${Date.now()}.mp4`,
        };
        setMediaItems((prev) => [...prev, newItem]);
      }
    } catch (err: any) {
      Alert.alert('Video Capture Error', err.message || 'Could not record video.');
    }
  };

  // Gallery Picker (Photos & Videos)
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Gallery Permission Required', 'Please enable library access to choose inspection media.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video' || (asset.uri && asset.uri.endsWith('.mp4'));
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const newItem: MediaItem = {
          id: `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: isVideo ? 'video' : 'image',
          uri: asset.uri,
          base64: isVideo ? undefined : base64Data,
          name: `${isVideo ? 'Video' : 'Photo'}_${Date.now()}`,
        };
        setMediaItems((prev) => [...prev, newItem]);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Could not pick media from gallery.');
    }
  };

  const handleRemoveMedia = (id: string) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRequestCustOtp = async () => {
    if (!order) return;
    setRequestingCustOtp(true);
    try {
      const res = await requestCustomerDeliveryOtp(order.id);
      Alert.alert(
        'Customer OTP Dispatched',
        res.message || 'Verification code sent to customer registered contact.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not request customer OTP.');
    } finally {
      setRequestingCustOtp(false);
    }
  };

  const handleRequestPilotOtp = async () => {
    if (!order) return;
    setRequestingPilotOtp(true);
    try {
      const res = await requestPilotDeliveryOtp(
        order.id,
        pilotUser?.email,
        pilotUser?.phone,
        pilotUser?.name
      );
      Alert.alert(
        'Delivery OTP Dispatched',
        res.message || 'Delivery Partner OTP sent to your registered email.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not request delivery OTP.');
    } finally {
      setRequestingPilotOtp(false);
    }
  };

  const handleTakePodPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission Required', 'Please enable camera access to take POD photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.4,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setPodPhoto(base64Data);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Could not take POD photo.');
    }
  };

  const handleSubmit = async () => {
    const targetDrone = (droneId || defaultDrone).trim();
    if (!targetDrone) {
      Alert.alert('Drone ID Required', 'Please enter or confirm the drone airframe ID.');
      return;
    }

    if (!recipientName.trim()) {
      Alert.alert('Recipient Name Required', 'Please enter the name of the recipient taking delivery.');
      return;
    }

    if (!customerOtp.trim()) {
      Alert.alert('Customer OTP Required', 'Please enter the 6-digit verification OTP provided by the customer.');
      return;
    }

    if (!pilotOtp.trim()) {
      Alert.alert('Delivery Partner OTP Required', 'Please enter your 6-digit Delivery Partner verification OTP.');
      return;
    }

    const hasAnyDefect =
      cargoBayCondition === 'JAMMED_DEFECT' ||
      landingSurface === 'IMPACT_COLLISION' ||
      propellerCheck === 'BLADE_DEFECT' ||
      !zeroDefectCertified;

    const overallVerdict = hasAnyDefect ? 'FAILED' : 'PASSED';
    const parsedBattery = parseInt(fieldBattery, 10);

    // Prepare photos and videos
    const photoRefs = mediaItems
      .filter((m) => m.type === 'image')
      .map((m) => m.base64 || m.uri);

    const videoRefs = mediaItems
      .filter((m) => m.type === 'video')
      .map((m) => m.uri);

    const mediaEvidence = mediaItems.map((m) => ({
      type: m.type,
      uri: m.base64 || m.uri,
      name: m.name,
    }));

    setLoading(true);
    try {
      // 1. Submit Post-Delivery Airframe & Payload Inspection Report
      const res = await submitPostDeliveryInspection({
        drone_id: targetDrone,
        delivery_id: order?.id,
        inspection_type: 'DELIVERY_PERSON_CHECK',
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
        remarks:
          fieldNotes.trim() ||
          (zeroDefectCertified
            ? 'Delivery completed with 0 defects. Drone verified and media captured.'
            : 'Field defect flagged during delivery handover inspection.'),
        photo_references: photoRefs,
        video_references: videoRefs,
        media_evidence: mediaEvidence,
      });

      const inspectionId = res?.inspection_id || 'INS-VERIFIED';

      // 2. Complete Delivery Handover & Customer POD in Database
      if (order?.id) {
        await completeDeliveryHandover({
          order_id: order.id,
          customer_otp: customerOtp.trim(),
          pilot_otp: pilotOtp.trim(),
          recipient_name: recipientName.trim(),
          pod_photo: podPhoto || undefined,
          final_latitude: currentCoords?.latitude,
          final_longitude: currentCoords?.longitude,
          delivery_notes: fieldNotes.trim() || 'Verified via Drone Field Check, Customer OTP & Delivery Partner OTP',
          pilot_name: pilotUser?.name || 'Delivery Partner',
          inspection_id: inspectionId,
        });
      }

      Alert.alert(
        'Delivery Completed Successfully',
        `Order #${order?.order_number || ''} marked as Delivered.\nAirframe Inspection, Customer OTP & Delivery Partner OTP verified and archived in flight logs.`,
        [
          {
            text: 'Return to Dashboard',
            onPress: () => onSuccess(inspectionId),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Delivery Submission Error', err.message || 'Failed to complete delivery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const photoCount = mediaItems.filter((m) => m.type === 'image').length;
  const videoCount = mediaItems.filter((m) => m.type === 'video').length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* ── TOP HEADER BAR ────────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Drone Safety Inspection</Text>
          <Text style={styles.headerSubtitle}>
            Order #{order?.id?.slice(0, 8) || 'DELIVERY'} · Airframe Verification
          </Text>
        </View>

        <View style={styles.headerBadge}>
          <ShieldCheck size={14} color="#059669" />
          <Text style={styles.headerBadgeText}>700 RPAV</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Airframe Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <QrCode size={18} color="#5a00b8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Assigned Airframe Asset</Text>
              <Text style={styles.cardSubtitle}>
                Verified against digital delivery manifest
              </Text>
            </View>
          </View>

          <View style={styles.droneIdRow}>
            <Text style={styles.droneIdLabel}>Airframe ID:</Text>
            <TextInput
              style={styles.droneIdInput}
              value={droneId}
              onChangeText={setDroneId}
              placeholder="e.g. RPAV-000001"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Order Consignment</Text>
              <Text style={styles.metaValue}>{order?.customer_name || 'Standard Consignment'}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Assigned Pilot</Text>
              <Text style={styles.metaValue}>{pilotUser?.name || 'Authorized Courier'}</Text>
            </View>
          </View>
        </View>

        {/* ── PHOTO & VIDEO EVIDENCE UPLOAD ────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
              <Camera size={18} color="#5a00b8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Photo & Video Evidence</Text>
              <Text style={styles.cardSubtitle}>
                Capture live drone condition for Admin & Fleet Dashboards
              </Text>
            </View>
            <View style={styles.mediaCounterBadge}>
              <Text style={styles.mediaCounterText}>
                {photoCount}P · {videoCount}V
              </Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.mediaActionRow}>
            <TouchableOpacity
              onPress={handleTakePhoto}
              style={[styles.mediaActionBtn, { backgroundColor: '#F3E8FF', borderColor: '#D8B4FE' }]}
              activeOpacity={0.7}
            >
              <Camera size={18} color="#5a00b8" />
              <Text style={[styles.mediaActionBtnText, { color: '#5a00b8' }]}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRecordVideo}
              style={[styles.mediaActionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
              activeOpacity={0.7}
            >
              <Video size={18} color="#DC2626" />
              <Text style={[styles.mediaActionBtnText, { color: '#DC2626' }]}>Record Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickFromGallery}
              style={[styles.mediaActionBtn, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}
              activeOpacity={0.7}
            >
              <ImageIcon size={18} color="#0284C7" />
              <Text style={[styles.mediaActionBtnText, { color: '#0284C7' }]}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Media Items Gallery Grid */}
          {mediaItems.length === 0 ? (
            <View style={styles.emptyMediaBox}>
              <Camera size={26} color="#94A3B8" />
              <Text style={styles.emptyMediaText}>
                No photos or videos captured yet.
              </Text>
              <Text style={styles.emptyMediaSubtext}>
                Tap buttons above to record drone condition, propellers, and cargo bay.
              </Text>
            </View>
          ) : (
            <View style={styles.mediaGrid}>
              {mediaItems.map((item) => (
                <View key={item.id} style={styles.mediaThumbnailWrap}>
                  {item.type === 'image' ? (
                    <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
                  ) : (
                    <View style={styles.videoThumbnailPlaceholder}>
                      <Video size={28} color="#A855F7" />
                      <Text style={styles.videoTag}>VIDEO CLIP</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => handleRemoveMedia(item.id)}
                    style={styles.removeMediaBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.mediaTypePill}>
                    <Text style={styles.mediaTypePillText}>
                      {item.type === 'video' ? 'VIDEO' : 'PHOTO'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── AIRFRAME COMPONENT CHECKLIST ────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Physical Safety Checklist</Text>

          {/* 1. Propellers & Motors */}
          <View style={styles.checkItem}>
            <Text style={styles.itemTitle}>1. Propellers & Rotor Blades</Text>
            <View style={styles.optionRow}>
              {[
                { id: 'SPINS_FREE_NO_DEBRIS', label: 'Spins Free / No Debris', color: '#059669' },
                { id: 'BLADE_DEFECT', label: 'Blade Defect / Nick', color: '#DC2626' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setPropellerCheck(opt.id)}
                  style={[
                    styles.optionBtn,
                    propellerCheck === opt.id && {
                      borderColor: opt.color,
                      backgroundColor: opt.id === 'BLADE_DEFECT' ? '#FEF2F2' : '#ECFDF5',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      propellerCheck === opt.id && { color: opt.color, fontWeight: '800' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 2. Cargo Bay Release */}
          <View style={styles.checkItem}>
            <Text style={styles.itemTitle}>2. Cargo Bay & Release Mechanism</Text>
            <View style={styles.optionRow}>
              {[
                { id: 'CLEAN_RELEASE', label: 'Clean Release' },
                { id: 'MANUAL_ASSIST', label: 'Manual Assist' },
                { id: 'JAMMED_DEFECT', label: 'Cargo Jam Defect' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setCargoBayCondition(opt.id)}
                  style={[
                    styles.optionBtn,
                    cargoBayCondition === opt.id && {
                      borderColor: opt.id === 'JAMMED_DEFECT' ? '#DC2626' : '#5a00b8',
                      backgroundColor: opt.id === 'JAMMED_DEFECT' ? '#FEF2F2' : '#F3E8FF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      cargoBayCondition === opt.id && {
                        color: opt.id === 'JAMMED_DEFECT' ? '#DC2626' : '#5a00b8',
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 3. Landing Surface & Landing Gear */}
          <View style={styles.checkItem}>
            <Text style={styles.itemTitle}>3. Landing Gear & Surface</Text>
            <View style={styles.optionRow}>
              {[
                { id: 'SAFE_FLAT', label: 'Safe Flat Ground' },
                { id: 'ROUGH_TERRAIN', label: 'Rough Terrain' },
                { id: 'IMPACT_COLLISION', label: 'Hard Impact' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setLandingSurface(opt.id)}
                  style={[
                    styles.optionBtn,
                    landingSurface === opt.id && {
                      borderColor: opt.id === 'IMPACT_COLLISION' ? '#DC2626' : '#5a00b8',
                      backgroundColor: opt.id === 'IMPACT_COLLISION' ? '#FEF2F2' : '#F3E8FF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      landingSurface === opt.id && {
                        color: opt.id === 'IMPACT_COLLISION' ? '#DC2626' : '#5a00b8',
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 4. Battery Level */}
          <View style={styles.checkItem}>
            <Text style={styles.itemTitle}>4. Battery Health Level (%)</Text>
            <View style={styles.batteryInputRow}>
              <Battery size={20} color="#059669" />
              <TextInput
                style={styles.batteryInput}
                value={fieldBattery}
                onChangeText={setFieldBattery}
                keyboardType="numeric"
                maxLength={3}
                placeholder="75"
              />
              <Text style={styles.batteryUnit}>% SOC</Text>
            </View>
          </View>
        </View>

        {/* ── ZERO-DEFECT QUALITY CERTIFICATION ────────────────────── */}
        <TouchableOpacity
          onPress={() => setZeroDefectCertified(!zeroDefectCertified)}
          style={[
            styles.certifyCard,
            zeroDefectCertified ? styles.certifyCardActive : styles.certifyCardInactive,
          ]}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.certifyCheckbox,
              zeroDefectCertified ? styles.checkboxChecked : styles.checkboxUnchecked,
            ]}
          >
            {zeroDefectCertified && <Check size={16} color="#FFFFFF" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.certifyTitle,
                zeroDefectCertified ? styles.certifyTitleActive : styles.certifyTitleInactive,
              ]}
            >
              Zero-Defect Quality Handover Certified
            </Text>
            <Text style={styles.certifySubtitle}>
              I confirm the airframe is completely intact, zero defects observed, and safe for transport or re-deployment.
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── STEP 3: CUSTOMER DELIVERY HANDOVER & OTP VERIFICATION ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
              <CheckCircle size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Customer Delivery Handover & OTP</Text>
              <Text style={styles.cardSubtitle}>
                Verify recipient name and collect customer & partner OTPs
              </Text>
            </View>
          </View>

          {/* Recipient Name */}
          <View style={styles.formItem}>
            <Text style={styles.formItemLabel}>Recipient Name *</Text>
            <View style={styles.inputFieldRow}>
              <User size={16} color="#64748B" />
              <TextInput
                style={styles.textInputMain}
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Name of person receiving package"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Customer OTP */}
          <View style={styles.formItem}>
            <View style={styles.formItemHeaderRow}>
              <Text style={styles.formItemLabel}>Customer Verification OTP *</Text>
              <TouchableOpacity
                onPress={handleRequestCustOtp}
                disabled={requestingCustOtp}
                style={styles.otpActionBtn}
              >
                {requestingCustOtp ? (
                  <ActivityIndicator size="small" color="#5A00B8" />
                ) : (
                  <>
                    <RefreshCw size={11} color="#5A00B8" />
                    <Text style={styles.otpActionBtnText}>Send Customer OTP</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.inputFieldRow}>
              <KeyRound size={16} color="#64748B" />
              <TextInput
                style={styles.textInputMain}
                value={customerOtp}
                onChangeText={setCustomerOtp}
                placeholder="Enter 6-digit Customer OTP"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          {/* Delivery Partner OTP */}
          <View style={styles.formItem}>
            <View style={styles.formItemHeaderRow}>
              <Text style={styles.formItemLabel}>Delivery Partner OTP *</Text>
              <TouchableOpacity
                onPress={handleRequestPilotOtp}
                disabled={requestingPilotOtp}
                style={styles.otpActionBtn}
              >
                {requestingPilotOtp ? (
                  <ActivityIndicator size="small" color="#5A00B8" />
                ) : (
                  <>
                    <RefreshCw size={11} color="#5A00B8" />
                    <Text style={styles.otpActionBtnText}>Send to My Email</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.inputFieldRow}>
              <ShieldCheck size={16} color="#64748B" />
              <TextInput
                style={styles.textInputMain}
                value={pilotOtp}
                onChangeText={setPilotOtp}
                placeholder="Enter 6-digit Partner OTP"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          {/* POD Photo Capture */}
          <View style={styles.formItem}>
            <Text style={styles.formItemLabel}>Proof of Delivery (POD) Photo (Optional)</Text>
            {podPhoto ? (
              <View style={styles.podPhotoPreviewWrap}>
                <Image source={{ uri: podPhoto }} style={styles.podPhotoPreview} />
                <TouchableOpacity onPress={() => setPodPhoto(null)} style={styles.removePodBtn}>
                  <Trash2 size={14} color="#FFFFFF" />
                  <Text style={styles.removePodBtnText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={handleTakePodPhoto} style={styles.capturePodBtn}>
                <Camera size={16} color="#059669" />
                <Text style={styles.capturePodBtnText}>Snap Customer Package POD Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── INSPECTION NOTES ────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Handover Notes & Remarks</Text>
          <TextInput
            style={styles.notesInput}
            value={fieldNotes}
            onChangeText={setFieldNotes}
            placeholder="Add any observations, weather notes, or consignment handover comments..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* ── SUBMIT BUTTON ────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>CONFIRM & COMPLETE DELIVERY</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  droneIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 10,
  },
  droneIdLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginRight: 8,
  },
  droneIdInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '800',
    color: '#0F172A',
    paddingVertical: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  mediaCounterBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  mediaCounterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5a00b8',
  },
  mediaActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  mediaActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  mediaActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyMediaBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyMediaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
  },
  emptyMediaSubtext: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaThumbnailWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#0F172A',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E1B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTag: {
    fontSize: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '900',
    color: '#E9D5FF',
    marginTop: 4,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTypePill: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaTypePillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  checkItem: {
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  optionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  batteryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  batteryInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
  },
  batteryUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  certifyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  certifyCardActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  certifyCardInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  certifyCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#059669',
  },
  checkboxUnchecked: {
    backgroundColor: '#FCA5A5',
  },
  certifyTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  certifyTitleActive: {
    color: '#065F46',
  },
  certifyTitleInactive: {
    color: '#991B1B',
  },
  certifySubtitle: {
    fontSize: 10,
    color: '#475569',
    marginTop: 3,
    lineHeight: 14,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  formItem: {
    marginBottom: 12,
  },
  formItemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  formItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  otpActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  otpActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5A00B8',
  },
  inputFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  textInputMain: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  capturePodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  capturePodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  podPhotoPreviewWrap: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    height: 140,
    backgroundColor: '#0F172A',
    marginTop: 4,
  },
  podPhotoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePodBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  removePodBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
