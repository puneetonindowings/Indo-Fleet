import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  BackHandler,
  Modal,
} from 'react-native';
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  X,
  Battery,
  BatteryLow,
  Camera,
  Video,
  ImageIcon,
  ArrowLeft,
  Check,
  Trash2,
  QrCode,
  KeyRound,
  User,
  Lock,
  RefreshCw,
  Square,
  Upload,
  Plane,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { DeliveryOrder, UserProfile, TelemetryStats } from '../types';
import {
  submitPostDeliveryInspection,
  completeDeliveryHandover,
  requestCustomerDeliveryOtp,
  requestPilotDeliveryOtp,
} from '../services/api';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Types & constants                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

interface InspectionScreenProps {
  order: DeliveryOrder | null;
  inspectedDroneId?: string;
  inspectedDroneIds?: string[];
  stage?: 'hub_pickup' | 'customer_delivery';
  pilotUser: UserProfile | null;
  currentCoords?: { latitude: number; longitude: number } | null;
  telemetry?: TelemetryStats;
  onBack: () => void;
  onSuccess: (droneId: string, isAllCompleted: boolean, inspectionId?: string) => void;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  uri: string;
  base64?: string;
  name?: string;
}

type Tone = 'ok' | 'neutral' | 'bad';

interface ChecklistOption {
  id: string;
  label: string;
  hint?: string;
  tone: Tone;
}

const C = {
  brand: '#5A00B8',
  brandDark: '#3B0080',
  brandSoft: '#F3E8FF',
  brandLine: '#D8B4FE',
  ink: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  faint: '#94A3B8',
  line: '#E2E8F0',
  surface: '#FFFFFF',
  page: '#F8FAFC',
  ok: '#059669',
  okSoft: '#ECFDF5',
  okLine: '#A7F3D0',
  warn: '#D97706',
  warnSoft: '#FFFBEB',
  warnLine: '#FDE68A',
  bad: '#DC2626',
  badSoft: '#FEF2F2',
  badLine: '#FECACA',
};

const MAX_MEDIA_ITEMS = 10;

const PROPELLER_OPTIONS: ChecklistOption[] = [
  { id: 'SPINS_FREE_NO_DEBRIS', label: 'Spins free, no debris', tone: 'ok' },
  { id: 'BLADE_DEFECT', label: 'Blade defect or nick', hint: 'Report in remarks', tone: 'bad' },
];

const CARGO_OPTIONS: ChecklistOption[] = [
  { id: 'CLEAN_RELEASE', label: 'Clean release', tone: 'ok' },
  { id: 'MANUAL_ASSIST', label: 'Needed manual assist', tone: 'neutral' },
  { id: 'JAMMED_DEFECT', label: 'Cargo jam defect', hint: 'Report in remarks', tone: 'bad' },
];

const LANDING_OPTIONS: ChecklistOption[] = [
  { id: 'SAFE_FLAT', label: 'Safe, flat ground', tone: 'ok' },
  { id: 'ROUGH_TERRAIN', label: 'Rough terrain', tone: 'neutral' },
  { id: 'IMPACT_COLLISION', label: 'Hard impact', hint: 'Report in remarks', tone: 'bad' },
];

const toneColors = (tone: Tone) => {
  if (tone === 'ok') return { fg: C.ok, bg: C.okSoft, line: C.ok };
  if (tone === 'bad') return { fg: C.bad, bg: C.badSoft, line: C.bad };
  return { fg: C.brand, bg: C.brandSoft, line: C.brand };
};

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 6);

/* ────────────────────────────────────────────────────────────────────────── */
/*  Small reusable pieces                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const SectionCard: React.FC<{
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: any;
}> = ({ icon, iconBg = C.brandSoft, title, subtitle, right, children, style }) => (
  <View style={[styles.card, style]}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
    {children}
  </View>
);

const OptionGroup: React.FC<{
  title: string;
  options: ChecklistOption[];
  value: string;
  onChange: (id: string) => void;
}> = ({ title, options, value, onChange }) => (
  <View style={styles.checkItem}>
    <Text style={styles.itemTitle}>{title}</Text>
    <View style={{ gap: 8 }}>
      {options.map((opt) => {
        const selected = value === opt.id;
        const t = toneColors(opt.tone);
        return (
          <TouchableOpacity
            key={opt.id}
            onPress={() => onChange(opt.id)}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[
              styles.optionBtn,
              selected && { borderColor: t.line, backgroundColor: t.bg },
            ]}
          >
            <View style={[styles.radioOuter, selected && { borderColor: t.fg }]}>
              {selected ? <View style={[styles.radioInner, { backgroundColor: t.fg }]} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionBtnText, selected && { color: t.fg, fontWeight: '800' }]}>
                {opt.label}
              </Text>
              {selected && opt.hint ? <Text style={[styles.optionHint, { color: t.fg }]}>{opt.hint}</Text> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

/* ────────────────────────────────────────────────────────────────────────── */
/*  Screen                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export const InspectionScreen: React.FC<InspectionScreenProps> = ({
  order,
  inspectedDroneId,
  inspectedDroneIds = [],
  stage = 'customer_delivery',
  pilotUser,
  currentCoords,
  telemetry,
  onBack,
  onSuccess,
}) => {
  const isHub = stage === 'hub_pickup';
  const rawDroneId = (inspectedDroneId || order?.assigned_drone_id || order?.drone_id || '').trim();
  const cleanDroneSerial = rawDroneId && !rawDroneId.includes('@') ? rawDroneId : '';
  const cleanDroneModel =
    order?.drone_model && !order.drone_model.includes('@') ? order.drone_model : order?.drone_model || 'Drone RPAV';
  const cleanOrderNumber = order?.order_number || order?.id || 'DELIVERY';

  const telemetryBattery =
    telemetry?.batteryPct != null && telemetry.batteryPct > 0 ? Math.round(telemetry.batteryPct) : null;

  const [droneId, setDroneId] = useState<string>(cleanDroneSerial);

  useEffect(() => {
    if (inspectedDroneId) setDroneId(inspectedDroneId);
  }, [inspectedDroneId]);

  const totalDronesCount = Math.max(
    order?.units_count || 1,
    (order?.reserved_inventory_ids || []).length,
    (order?.items || []).length,
    1
  );

  const prevInspectedList = useMemo(
    () => Array.from(new Set([...(inspectedDroneIds || []), ...(order?.inspected_drone_ids || [])])),
    [inspectedDroneIds, order?.inspected_drone_ids]
  );

  const currentDroneNumber = Math.min(prevInspectedList.length + 1, totalDronesCount);
  const isFinalDrone = prevInspectedList.length + 1 >= totalDronesCount;

  /* ── Checklist state ─────────────────────────────────────────────────── */
  const [cargoBayCondition, setCargoBayCondition] = useState<string>('');
  const [landingSurface, setLandingSurface] = useState<string>('');
  const [propellerCheck, setPropellerCheck] = useState<string>('');
  const [manualBattery, setManualBattery] = useState<string>('');
  const [zeroDefectCertified, setZeroDefectCertified] = useState<boolean>(false);
  const [fieldNotes, setFieldNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  /* ── Handover state ──────────────────────────────────────────────────── */
  const [recipientName, setRecipientName] = useState<string>(order?.recipient_name || order?.customer_name || '');
  const [customerOtp, setCustomerOtp] = useState<string>('');
  const [pilotOtp, setPilotOtp] = useState<string>('');
  const [podPhoto, setPodPhoto] = useState<string | null>(null);
  const [requestingCustOtp, setRequestingCustOtp] = useState<boolean>(false);
  const [requestingPilotOtp, setRequestingPilotOtp] = useState<boolean>(false);

  /* ── Media state ─────────────────────────────────────────────────────── */
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  /* ── Camera state ────────────────────────────────────────────────────── */
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video' | 'pod'>('photo');
  const [camStreamActive, setCamStreamActive] = useState<boolean>(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const videoRef = useRef<any>(null);
  const nativeCameraRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const recordedChunksRef = useRef<any[]>([]);
  const discardRecordingRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  /* ── Derived values ──────────────────────────────────────────────────── */
  const manualBatteryNum = manualBattery.trim() === '' ? NaN : parseInt(manualBattery, 10);
  const manualBatteryValid = !isNaN(manualBatteryNum) && manualBatteryNum >= 0 && manualBatteryNum <= 100;
  const effectiveBattery: number | null =
    telemetryBattery != null ? telemetryBattery : manualBatteryValid ? manualBatteryNum : null;

  const hasDefect =
    cargoBayCondition === 'JAMMED_DEFECT' ||
    landingSurface === 'IMPACT_COLLISION' ||
    propellerCheck === 'BLADE_DEFECT';

  const needsHandover = !isHub && isFinalDrone;
  const photoCount = mediaItems.filter((m) => m.type === 'image').length;
  const videoCount = mediaItems.filter((m) => m.type === 'video').length;

  // A defect and a "zero defect" certification can never both be true.
  useEffect(() => {
    if (hasDefect && zeroDefectCertified) setZeroDefectCertified(false);
  }, [hasDefect, zeroDefectCertified]);

  const missingItems = useMemo(() => {
    const list: string[] = [];
    if (!propellerCheck) list.push('Propellers & rotor blades');
    if (!cargoBayCondition) list.push('Cargo bay & release');
    if (!landingSurface) list.push('Landing gear & surface');
    if (effectiveBattery == null) list.push('Battery level (0–100%)');
    if (hasDefect) {
      if (fieldNotes.trim().length < 5) list.push('Remarks describing the defect');
    } else if (!zeroDefectCertified) {
      list.push('Zero-defect certification');
    }
    if (needsHandover) {
      if (!recipientName.trim()) list.push('Recipient name');
      if (customerOtp.length !== 6) list.push('Customer OTP (6 digits)');
      if (pilotOtp.length !== 6) list.push('Delivery partner OTP (6 digits)');
    }
    return list;
  }, [
    propellerCheck,
    cargoBayCondition,
    landingSurface,
    effectiveBattery,
    hasDefect,
    fieldNotes,
    zeroDefectCertified,
    needsHandover,
    recipientName,
    customerOtp,
    pilotOtp,
  ]);

  const checklistDone = [propellerCheck, cargoBayCondition, landingSurface, effectiveBattery != null ? 'x' : ''].filter(
    Boolean
  ).length;

  /* ── Cleanup ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current?.getTracks) {
        streamRef.current.getTracks().forEach((t: any) => {
          try {
            t.stop();
          } catch {}
        });
      }
    };
  }, []);

  /* ── Camera helpers ──────────────────────────────────────────────────── */
  const addMedia = useCallback((item: MediaItem) => {
    setMediaItems((prev) => {
      if (prev.length >= MAX_MEDIA_ITEMS) {
        Alert.alert('Evidence limit reached', `You can attach up to ${MAX_MEDIA_ITEMS} photos and videos per drone.`);
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  };

  const closeInAppCamera = useCallback(() => {
    stopTimer();
    // If a web recording is still running when the sheet is dismissed, throw it away.
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      discardRecordingRef.current = true;
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecordingVideo(false);
    if (streamRef.current?.getTracks) {
      streamRef.current.getTracks().forEach((t: any) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setCamStreamActive(false);
    setCameraModalOpen(false);
  }, []);

  // Hardware back: close the camera first, only then leave the screen.
  useEffect(() => {
    const onBackPress = () => {
      if (cameraModalOpen) {
        closeInAppCamera();
        return true;
      }
      if (previewUri) {
        setPreviewUri(null);
        return true;
      }
      onBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onBack, cameraModalOpen, previewUri, closeInAppCamera]);

  const openInAppCamera = async (mode: 'photo' | 'video' | 'pod') => {
    setCameraMode(mode);
    setCamError(null);
    setCameraModalOpen(true);

    if (Platform.OS !== 'web') {
      if (!cameraPermission || !cameraPermission.granted) {
        try {
          const res = await requestCameraPermission();
          if (!res.granted) setCamError('Camera permission is required to capture inspection evidence.');
        } catch (permErr: any) {
          setCamError(permErr.message || 'Camera permission request failed.');
        }
      }
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        if (streamRef.current?.getTracks) {
          streamRef.current.getTracks().forEach((t: any) => {
            try {
              t.stop();
            } catch {}
          });
        }
        let stream: any = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: mode === 'video',
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: mode === 'video' });
        }
        if (stream) {
          streamRef.current = stream;
          setCamStreamActive(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            try {
              await videoRef.current.play();
            } catch {}
          }
        }
      } catch (err: any) {
        setCamError(err?.message || 'Camera access is not available in this browser. Allow camera permission and try again.');
      }
    } else {
      setCamError('This browser does not support live camera capture.');
    }
  };

  const triggerFallbackFileInput = (acceptType: string) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptType;
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      const isVideo = file.type.startsWith('video');
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        if (cameraMode === 'pod') {
          setPodPhoto(dataUrl);
        } else {
          addMedia({
            id: makeId('media'),
            type: isVideo ? 'video' : 'image',
            uri: dataUrl,
            base64: dataUrl,
            name: file.name,
          });
        }
        closeInAppCamera();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const captureFrameFromCamera = async () => {
    // Native (expo-camera)
    if (Platform.OS !== 'web') {
      if (!nativeCameraRef.current) return;
      try {
        const photo = await nativeCameraRef.current.takePictureAsync({ quality: 0.7, base64: true, skipProcessing: false });
        if (photo?.uri) {
          const data = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
          if (cameraMode === 'pod') {
            setPodPhoto(data);
          } else {
            addMedia({ id: makeId('photo'), type: 'image', uri: photo.uri, base64: data, name: `Photo_${Date.now()}.jpg` });
          }
          closeInAppCamera();
        }
      } catch (camErr: any) {
        Alert.alert('Could not take photo', camErr.message || 'Please try again.');
      }
      return;
    }

    // Web (canvas)
    if (videoRef.current && typeof document !== 'undefined') {
      try {
        const video = videoRef.current;
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          if (cameraMode === 'pod') {
            setPodPhoto(dataUrl);
          } else {
            addMedia({
              id: makeId('photo'),
              type: 'image',
              uri: dataUrl,
              base64: dataUrl,
              name: `Photo_${new Date().toLocaleTimeString().replace(/:/g, '-')}.jpg`,
            });
          }
          closeInAppCamera();
          return;
        }
      } catch {}
    }
    triggerFallbackFileInput('image/*');
  };

  const startVideoRecording = async () => {
    // Native
    if (Platform.OS !== 'web') {
      if (!nativeCameraRef.current) return;
      setIsRecordingVideo(true);
      startTimer();
      try {
        const result = await nativeCameraRef.current.recordAsync({ maxDuration: 60 });
        if (result?.uri) {
          addMedia({ id: makeId('video'), type: 'video', uri: result.uri, name: `Video_${Date.now()}.mp4` });
        }
      } catch (err: any) {
        Alert.alert('Recording error', err?.message || 'Could not record video.');
      } finally {
        // recordAsync resolves once stopRecording() finishes writing the file,
        // so it is now safe to tear down the camera.
        closeInAppCamera();
      }
      return;
    }

    // Web (MediaRecorder)
    if (!streamRef.current) return;
    try {
      recordedChunksRef.current = [];
      discardRecordingRef.current = false;
      const MR = (window as any).MediaRecorder;
      let recorder: any;
      try {
        recorder = new MR(streamRef.current, { mimeType: 'video/webm' });
      } catch {
        recorder = new MR(streamRef.current);
      }

      recorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          recordedChunksRef.current = [];
          return;
        }
        const mime = recorder.mimeType || 'video/webm';
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const videoUrl = URL.createObjectURL(blob);
        const reader = new FileReader();
        reader.onloadend = () => {
          addMedia({
            id: makeId('video'),
            type: 'video',
            uri: videoUrl,
            base64: reader.result as string,
            name: `Video_${Date.now()}.${ext}`,
          });
        };
        reader.readAsDataURL(blob);
        closeInAppCamera();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecordingVideo(true);
      startTimer();
    } catch (err: any) {
      Alert.alert('Recording error', 'Could not record video: ' + (err?.message || 'unknown error'));
    }
  };

  const stopVideoRecording = () => {
    stopTimer();
    setIsRecordingVideo(false);

    if (Platform.OS !== 'web') {
      // The pending recordAsync() promise handles saving and closing.
      try {
        nativeCameraRef.current?.stopRecording();
      } catch {}
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const handlePickFromGallery = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,video/*';
      input.multiple = true;
      input.onchange = (e: any) => {
        const files = e.target?.files;
        if (!files || files.length === 0) return;
        Array.from(files).forEach((file: any) => {
          const reader = new FileReader();
          const isVideo = file.type.startsWith('video');
          reader.onload = (evt) => {
            const dataUrl = evt.target?.result as string;
            addMedia({
              id: makeId('gallery'),
              type: isVideo ? 'video' : 'image',
              uri: dataUrl,
              base64: dataUrl,
              name: file.name || (isVideo ? 'Video' : 'Photo'),
            });
          };
          reader.readAsDataURL(file);
        });
      };
      input.click();
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Gallery permission needed', 'Allow photo library access to choose inspection media.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets?.length) {
        result.assets.forEach((asset) => {
          const isVideo = asset.type === 'video' || (asset.uri && asset.uri.toLowerCase().endsWith('.mp4'));
          const data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          addMedia({
            id: makeId('gallery'),
            type: isVideo ? 'video' : 'image',
            uri: asset.uri,
            base64: isVideo ? undefined : data,
            name: `${isVideo ? 'Video' : 'Photo'}_${Date.now()}`,
          });
        });
      }
    } catch (err: any) {
      Alert.alert('Gallery error', err.message || 'Could not pick media from the gallery.');
    }
  };

  const handleRemoveMedia = (id: string) => setMediaItems((prev) => prev.filter((m) => m.id !== id));

  /* ── OTP requests ────────────────────────────────────────────────────── */
  const handleRequestCustOtp = async () => {
    if (!order) return;
    setRequestingCustOtp(true);
    try {
      const res = await requestCustomerDeliveryOtp(order.id);
      Alert.alert('Customer OTP sent', res.message || 'A verification code was sent to the customer’s registered contact.');
    } catch (err: any) {
      Alert.alert('Could not send OTP', err.message || 'Could not request the customer OTP.');
    } finally {
      setRequestingCustOtp(false);
    }
  };

  const handleRequestPilotOtp = async () => {
    if (!order) return;
    setRequestingPilotOtp(true);
    try {
      const res = await requestPilotDeliveryOtp(order.id, pilotUser?.email, pilotUser?.phone, pilotUser?.name);
      Alert.alert('Delivery partner OTP sent', res.message || 'An OTP was sent to your registered email.');
    } catch (err: any) {
      Alert.alert('Could not send OTP', err.message || 'Could not request the delivery partner OTP.');
    } finally {
      setRequestingPilotOtp(false);
    }
  };

  /* ── Submit ──────────────────────────────────────────────────────────── */
  const confirmDefectReport = () =>
    new Promise<boolean>((resolve) => {
      Alert.alert(
        'Report defect on this airframe?',
        'This inspection will be recorded as FAILED and flagged for the fleet team. Your remarks and evidence will be attached.',
        [
          { text: 'Go back', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Report defect', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });

  const handleSubmit = async () => {
    if (loading) return;

    if (missingItems.length > 0) {
      Alert.alert(
        'Complete these before submitting',
        missingItems.map((m) => `• ${m}`).join('\n')
      );
      return;
    }

    if (hasDefect) {
      const confirmed = await confirmDefectReport();
      if (!confirmed) return;
    }

    const targetDrone = (droneId || cleanDroneSerial || inspectedDroneId || 'DRONE').trim();
    const overallVerdict = hasDefect ? 'FAILED' : 'PASSED';
    const battery = effectiveBattery ?? 0;

    const photoRefs = mediaItems.filter((m) => m.type === 'image').map((m) => m.base64 || m.uri);
    const videoRefs = mediaItems.filter((m) => m.type === 'video').map((m) => m.uri);
    const mediaEvidence = mediaItems.map((m) => ({ type: m.type, uri: m.base64 || m.uri, name: m.name }));

    setLoading(true);
    try {
      const res = await submitPostDeliveryInspection({
        drone_id: targetDrone,
        delivery_id: order?.id,
        stage: isHub ? 'hub_pickup' : 'customer_delivery',
        inspection_type: isHub ? 'HUB_PRE_FLIGHT_CHECK' : 'DELIVERY_PERSON_CHECK',
        cargo_bay_condition: cargoBayCondition,
        landing_surface: landingSurface,
        propeller_debris_check: propellerCheck,
        field_battery_level: battery,
        zero_defect_certified: zeroDefectCertified,
        delivery_handover_notes: fieldNotes.trim() || undefined,
        body_condition: hasDefect ? 'DAMAGED' : 'GOOD',
        propeller_condition: propellerCheck === 'BLADE_DEFECT' ? 'DAMAGED' : 'GOOD',
        battery_condition: battery < 20 ? 'LOW' : 'NORMAL',
        landing_gear_condition: landingSurface === 'IMPACT_COLLISION' ? 'DAMAGED' : 'GOOD',
        overall_inspection: overallVerdict,
        remarks:
          fieldNotes.trim() ||
          (isHub
            ? 'Hub pre-acceptance inspection passed with zero defects.'
            : 'Delivery completed with 0 defects. Drone verified.'),
        photo_references: photoRefs,
        video_references: videoRefs,
        media_evidence: mediaEvidence,
      });

      const inspectionId = res?.inspection_id || 'INS-VERIFIED';
      const isReinspection = prevInspectedList.includes(targetDrone);

      if (isReinspection) {
        Alert.alert(
          'Inspection updated',
          `The report for airframe "${targetDrone}" was updated and saved.`,
          [
            {
              text: 'Return to manifest',
              onPress: () =>
                onSuccess(targetDrone, isHub ? true : prevInspectedList.length >= totalDronesCount, inspectionId),
            },
          ]
        );
        return;
      }

      if (!isFinalDrone) {
        const remaining = totalDronesCount - (prevInspectedList.length + 1);
        Alert.alert(
          isHub ? 'Hub inspection saved' : 'Inspection saved',
          `Airframe "${targetDrone}" is recorded.\n\n${remaining} more drone${remaining === 1 ? '' : 's'} left for Order #${cleanOrderNumber}. Scan the next one to continue.`,
          [{ text: 'Scan next drone', onPress: () => onSuccess(targetDrone, false, inspectionId) }]
        );
        return;
      }

      if (isHub) {
        Alert.alert(
          'Hub inspection complete',
          `All ${totalDronesCount} drone${totalDronesCount === 1 ? '' : 's'} for Order #${cleanOrderNumber} are inspected. You can now accept the order.`,
          [{ text: 'Accept order', onPress: () => onSuccess(targetDrone, true, inspectionId) }]
        );
        return;
      }

      if (order?.id) {
        await completeDeliveryHandover({
          order_id: order.id,
          customer_otp: customerOtp.trim(),
          pilot_otp: pilotOtp.trim(),
          recipient_name: recipientName.trim(),
          pod_photo: podPhoto || undefined,
          final_latitude: currentCoords?.latitude,
          final_longitude: currentCoords?.longitude,
          delivery_notes: fieldNotes.trim() || 'Verified via drone field check, customer OTP and delivery partner OTP',
          pilot_name: pilotUser?.name || 'Delivery Partner',
          inspection_id: inspectionId,
        });
      }

      Alert.alert(
        'Delivery completed',
        `All ${totalDronesCount} drone${totalDronesCount === 1 ? '' : 's'} in Order #${cleanOrderNumber} are inspected. Both OTPs were verified and recorded.`,
        [{ text: 'Back to dashboard', onPress: () => onSuccess(targetDrone, true, inspectionId) }]
      );
    } catch (err: any) {
      Alert.alert('Submission failed', err.message || 'Could not complete the submission. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Render helpers ──────────────────────────────────────────────────── */
  const batteryTone =
    effectiveBattery == null ? C.muted : effectiveBattery >= 50 ? C.ok : effectiveBattery >= 20 ? C.warn : C.bad;
  const batteryNote =
    effectiveBattery == null
      ? 'No live reading. Enter the level shown on the battery display.'
      : effectiveBattery >= 50
        ? 'Charge level is healthy.'
        : effectiveBattery >= 20
          ? 'Charge is moderate. Plan a recharge or battery swap.'
          : 'Charge is low. Recharge or swap the battery before the next sortie.';

  const submitLabel = isHub
    ? isFinalDrone
      ? 'Complete hub verification'
      : `Certify drone ${currentDroneNumber} and scan next`
    : isFinalDrone
      ? 'Confirm and complete delivery'
      : `Certify drone ${currentDroneNumber} and scan next`;

  const recSeconds = `${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`;

  const showNativePermissionBox = Platform.OS !== 'web' && !cameraPermission?.granted;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={20} color={C.ink} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{isHub ? 'Hub safety inspection' : 'Delivery safety inspection'}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Order #{cleanOrderNumber}
          </Text>
        </View>

        <View style={styles.headerBadge}>
          <ShieldCheck size={14} color={C.ok} />
          <Text style={styles.headerBadgeText}>700 RPAV</Text>
        </View>
      </View>

      {/* ── Multi-drone progress ───────────────────────────────────────── */}
      {totalDronesCount > 1 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            {Array.from({ length: totalDronesCount }).map((_, i) => {
              const done = i < prevInspectedList.length;
              const current = i === currentDroneNumber - 1 && !done;
              return (
                <View
                  key={i}
                  style={[
                    styles.progressSeg,
                    done && { backgroundColor: C.ok },
                    current && { backgroundColor: C.brand },
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.progressText}>
            Drone {currentDroneNumber} of {totalDronesCount} · {prevInspectedList.length} inspected
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Airframe info ──────────────────────────────────────────── */}
        <SectionCard
          icon={<QrCode size={18} color={C.brand} />}
          title="Airframe"
          subtitle={`Aircraft ${currentDroneNumber} of ${totalDronesCount}`}
          right={
            <View style={styles.verifiedTag}>
              <CheckCircle size={12} color={C.ok} />
              <Text style={styles.verifiedTagText}>QR verified</Text>
            </View>
          }
        >
          <View style={styles.autoAssetRow}>
            <View style={styles.assetBadge}>
              <Plane size={16} color={C.brand} />
              <Text style={styles.assetModelText} numberOfLines={1}>
                {cleanDroneModel}
              </Text>
            </View>
            <View style={styles.serialPill}>
              <Text style={styles.serialLabel}>ID</Text>
              <Text style={styles.serialValue} numberOfLines={1}>
                {droneId || cleanDroneSerial || '—'}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Customer</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {order?.customer_name || 'Standard consignment'}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Inspector</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {pilotUser?.name || 'Authorized courier'}
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* ── Evidence ───────────────────────────────────────────────── */}
        <SectionCard
          icon={<Camera size={18} color={C.brand} />}
          iconBg="#EDE9FE"
          title="Photo and video evidence"
          subtitle="Shown to the admin and fleet teams"
          right={
            <View style={styles.mediaCounterBadge}>
              <Text style={styles.mediaCounterText}>
                {photoCount} photo{photoCount === 1 ? '' : 's'} · {videoCount} video{videoCount === 1 ? '' : 's'}
              </Text>
            </View>
          }
        >
          <View style={styles.mediaActionRow}>
            <TouchableOpacity
              onPress={() => openInAppCamera('photo')}
              style={[styles.mediaActionBtn, { backgroundColor: C.brandSoft, borderColor: C.brandLine }]}
              activeOpacity={0.7}
            >
              <Camera size={18} color={C.brand} />
              <Text style={[styles.mediaActionBtnText, { color: C.brand }]}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openInAppCamera('video')}
              style={[styles.mediaActionBtn, { backgroundColor: C.badSoft, borderColor: C.badLine }]}
              activeOpacity={0.7}
            >
              <Video size={18} color={C.bad} />
              <Text style={[styles.mediaActionBtnText, { color: C.bad }]}>Video</Text>
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

          {mediaItems.length === 0 ? (
            <View style={styles.emptyMediaBox}>
              <Camera size={26} color={C.faint} />
              <Text style={styles.emptyMediaText}>No evidence added yet</Text>
              <Text style={styles.emptyMediaSubtext}>
                Capture the propellers, landing gear and cargo bay. Take a close-up of any defect.
              </Text>
            </View>
          ) : (
            <View style={styles.mediaGrid}>
              {mediaItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.mediaThumbnailWrap}
                  activeOpacity={item.type === 'image' ? 0.8 : 1}
                  onPress={() => item.type === 'image' && setPreviewUri(item.base64 || item.uri)}
                >
                  {item.type === 'image' ? (
                    <Image source={{ uri: item.base64 || item.uri }} style={styles.mediaThumbnail} />
                  ) : (
                    <View style={styles.videoThumbnailPlaceholder}>
                      <Video size={26} color={C.brand} />
                      <Text style={styles.videoTag}>Video clip</Text>
                      {item.name ? (
                        <Text style={styles.videoNameText} numberOfLines={1}>
                          {item.name}
                        </Text>
                      ) : null}
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => handleRemoveMedia(item.id)}
                    style={styles.removeMediaBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Remove media"
                  >
                    <X size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </SectionCard>

        {/* ── Checklist ──────────────────────────────────────────────── */}
        <SectionCard
          icon={<ShieldCheck size={18} color={C.brand} />}
          title="Physical safety checklist"
          subtitle={`${checklistDone} of 4 checks done`}
        >
          <OptionGroup title="1. Propellers and rotor blades" options={PROPELLER_OPTIONS} value={propellerCheck} onChange={setPropellerCheck} />
          <OptionGroup title="2. Cargo bay and release mechanism" options={CARGO_OPTIONS} value={cargoBayCondition} onChange={setCargoBayCondition} />
          <OptionGroup title="3. Landing gear and surface" options={LANDING_OPTIONS} value={landingSurface} onChange={setLandingSurface} />

          {/* 4. Battery */}
          <View style={[styles.checkItem, { marginBottom: 0 }]}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>4. Battery level</Text>
              {telemetryBattery != null && (
                <View style={styles.autoSyncPill}>
                  <View style={styles.autoSyncDot} />
                  <Text style={styles.autoSyncText}>Live telemetry</Text>
                </View>
              )}
            </View>

            <View style={styles.batteryDisplayBox}>
              <View style={styles.batteryHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {effectiveBattery != null && effectiveBattery < 20 ? (
                    <BatteryLow size={20} color={batteryTone} />
                  ) : (
                    <Battery size={20} color={batteryTone} />
                  )}
                  <Text style={styles.batteryStateText}>Battery remaining</Text>
                </View>
                <Text style={[styles.batteryPctValue, { color: batteryTone }]}>
                  {effectiveBattery != null ? `${effectiveBattery}%` : '—'}
                </Text>
              </View>

              <View style={styles.batteryBarTrack}>
                <View
                  style={[
                    styles.batteryBarFill,
                    { width: `${effectiveBattery ?? 0}%`, backgroundColor: batteryTone },
                  ]}
                />
              </View>

              {telemetryBattery == null && (
                <View style={[styles.inputFieldRow, { marginTop: 0 }]}>
                  <Battery size={16} color={C.muted} />
                  <TextInput
                    style={styles.textInputMain}
                    value={manualBattery}
                    onChangeText={(t) => setManualBattery(t.replace(/\D/g, '').slice(0, 3))}
                    placeholder="Battery % (0–100)"
                    placeholderTextColor={C.faint}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
              )}

              <Text style={styles.batterySubNote}>{batteryNote}</Text>
            </View>
          </View>
        </SectionCard>

        {/* ── Certification / defect state ───────────────────────────── */}
        {hasDefect ? (
          <View style={[styles.certifyCard, styles.certifyCardDefect]}>
            <View style={[styles.certifyCheckbox, { backgroundColor: C.bad }]}>
              <AlertTriangle size={14} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.certifyTitle, { color: '#991B1B' }]}>Defect reported</Text>
              <Text style={styles.certifySubtitle}>
                This airframe will be recorded as failed. Describe the defect in the remarks below and attach a close-up photo.
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setZeroDefectCertified(!zeroDefectCertified)}
            style={[styles.certifyCard, zeroDefectCertified ? styles.certifyCardActive : styles.certifyCardInactive]}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: zeroDefectCertified }}
          >
            <View style={[styles.certifyCheckbox, zeroDefectCertified ? styles.checkboxChecked : styles.checkboxUnchecked]}>
              {zeroDefectCertified && <Check size={16} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.certifyTitle, { color: zeroDefectCertified ? '#065F46' : C.body }]}>
                Certify zero defects
              </Text>
              <Text style={styles.certifySubtitle}>
                I confirm the airframe is intact, no defects were observed, and it is safe for transport or redeployment.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Customer handover (final drone, customer stage) ────────── */}
        {!isHub &&
          (isFinalDrone ? (
            <SectionCard
              icon={<CheckCircle size={18} color={C.ok} />}
              iconBg={C.okSoft}
              title="Customer handover"
              subtitle="Confirm the recipient and collect both OTPs"
            >
              <View style={styles.formItem}>
                <Text style={styles.formItemLabel}>Recipient name *</Text>
                <View style={styles.inputFieldRow}>
                  <User size={16} color={C.muted} />
                  <TextInput
                    style={styles.textInputMain}
                    value={recipientName}
                    onChangeText={setRecipientName}
                    placeholder="Person receiving the package"
                    placeholderTextColor={C.faint}
                  />
                </View>
              </View>

              <View style={styles.formItem}>
                <View style={styles.formItemHeaderRow}>
                  <Text style={styles.formItemLabel}>Customer OTP *</Text>
                  <TouchableOpacity onPress={handleRequestCustOtp} disabled={requestingCustOtp} style={styles.otpActionBtn}>
                    {requestingCustOtp ? (
                      <ActivityIndicator size="small" color={C.brand} />
                    ) : (
                      <>
                        <RefreshCw size={11} color={C.brand} />
                        <Text style={styles.otpActionBtnText}>Send to customer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.inputFieldRow}>
                  <KeyRound size={16} color={C.muted} />
                  <TextInput
                    style={styles.textInputMain}
                    value={customerOtp}
                    onChangeText={(t) => setCustomerOtp(digitsOnly(t))}
                    placeholder="6-digit code from the customer"
                    placeholderTextColor={C.faint}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <View style={styles.formItem}>
                <View style={styles.formItemHeaderRow}>
                  <Text style={styles.formItemLabel}>Delivery partner OTP *</Text>
                  <TouchableOpacity onPress={handleRequestPilotOtp} disabled={requestingPilotOtp} style={styles.otpActionBtn}>
                    {requestingPilotOtp ? (
                      <ActivityIndicator size="small" color={C.brand} />
                    ) : (
                      <>
                        <RefreshCw size={11} color={C.brand} />
                        <Text style={styles.otpActionBtnText}>Send to my email</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.inputFieldRow}>
                  <ShieldCheck size={16} color={C.muted} />
                  <TextInput
                    style={styles.textInputMain}
                    value={pilotOtp}
                    onChangeText={(t) => setPilotOtp(digitsOnly(t))}
                    placeholder="6-digit code from your email"
                    placeholderTextColor={C.faint}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <View style={[styles.formItem, { marginBottom: 0 }]}>
                <Text style={styles.formItemLabel}>Proof of delivery photo (optional)</Text>
                {podPhoto ? (
                  <View style={styles.podPhotoPreviewWrap}>
                    <Image source={{ uri: podPhoto }} style={styles.podPhotoPreview} />
                    <TouchableOpacity onPress={() => setPodPhoto(null)} style={styles.removePodBtn}>
                      <Trash2 size={14} color="#FFFFFF" />
                      <Text style={styles.removePodBtnText}>Retake</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => openInAppCamera('pod')} style={styles.capturePodBtn}>
                    <Camera size={16} color={C.ok} />
                    <Text style={styles.capturePodBtnText}>Take proof of delivery photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </SectionCard>
          ) : (
            <SectionCard
              icon={<Lock size={18} color={C.muted} />}
              iconBg="#F1F5F9"
              title="Customer handover is locked"
              subtitle={`Inspect all ${totalDronesCount} aircraft to unlock the OTP step. ${totalDronesCount - prevInspectedList.length} to go.`}
              style={{ backgroundColor: C.page }}
            />
          ))}

        {isHub && (
          <SectionCard
            icon={<ShieldCheck size={18} color={C.brand} />}
            iconBg="#EDE9FE"
            title="Hub pre-acceptance check"
            subtitle={`Aircraft ${currentDroneNumber} of ${totalDronesCount}. Order acceptance unlocks once all ${totalDronesCount} are certified.`}
            style={{ backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }}
          />
        )}

        {/* ── Remarks ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>
            Remarks{hasDefect ? ' (required for a defect)' : ' (optional)'}
          </Text>
          <TextInput
            style={[styles.notesInput, hasDefect && fieldNotes.trim().length < 5 && { borderColor: C.bad }]}
            value={fieldNotes}
            onChangeText={setFieldNotes}
            placeholder={
              hasDefect
                ? 'Describe what is damaged and where.'
                : 'Weather, site conditions, or anything the team should know.'
            }
            placeholderTextColor={C.faint}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Sticky submit bar ──────────────────────────────────────────── */}
      <View style={styles.footerBar}>
        <Text style={[styles.footerStatus, missingItems.length === 0 && { color: C.ok }]} numberOfLines={1}>
          {missingItems.length === 0
            ? hasDefect
              ? 'Ready to report defect'
              : 'Ready to submit'
            : `${missingItems.length} item${missingItems.length === 1 ? '' : 's'} left · ${missingItems[0]}`}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[
            styles.submitBtn,
            hasDefect && { backgroundColor: C.bad },
            missingItems.length > 0 && styles.submitBtnIncomplete,
            loading && styles.submitBtnDisabled,
          ]}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              {hasDefect ? <AlertTriangle size={20} color="#FFFFFF" /> : <CheckCircle size={20} color="#FFFFFF" />}
              <Text style={styles.submitBtnText}>{hasDefect ? 'Report defect and continue' : submitLabel}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Image preview ──────────────────────────────────────────────── */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <TouchableOpacity style={styles.previewBackdrop} activeOpacity={1} onPress={() => setPreviewUri(null)}>
          {previewUri ? <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" /> : null}
          <View style={styles.previewClose}>
            <X size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Camera modal ───────────────────────────────────────────────── */}
      <Modal visible={cameraModalOpen} animationType="slide" transparent onRequestClose={closeInAppCamera}>
        <View style={styles.camModalBackdrop}>
          <View style={styles.camModalCard}>
            <View style={styles.camModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.camModalTitle}>
                  {cameraMode === 'video' ? 'Record airframe video' : cameraMode === 'pod' ? 'Proof of delivery photo' : 'Inspection camera'}
                </Text>
                <Text style={styles.camModalSubtitle}>
                  {cameraMode === 'video'
                    ? 'Walk around the airframe and show the propellers'
                    : cameraMode === 'pod'
                      ? 'Include the package and a door or landmark'
                      : 'Keep the chassis or cargo bay inside the frame'}
                </Text>
              </View>
              <TouchableOpacity onPress={closeInAppCamera} style={styles.camModalCloseBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={C.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.camViewfinderWrap}>
              {/* Native preview */}
              {Platform.OS !== 'web' && cameraPermission?.granted && (
                <CameraView
                  ref={nativeCameraRef}
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  mode={cameraMode === 'video' ? 'video' : 'picture'}
                />
              )}

              {/* Web preview */}
              {Platform.OS === 'web' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0F172A',
                    zIndex: 1,
                  }}
                >
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: camStreamActive ? 1 : 0 }}
                  />
                </div>
              )}

              {/* Overlay: permission / error / reticle */}
              <View style={[styles.camOverlay, { zIndex: 5 }]} pointerEvents="box-none">
                {showNativePermissionBox ? (
                  <View style={styles.camErrorBox}>
                    <AlertTriangle size={32} color="#F59E0B" />
                    <Text style={styles.camErrorTitle}>Camera access needed</Text>
                    <Text style={styles.camErrorDesc}>Allow camera access to capture inspection photos and video.</Text>
                    <TouchableOpacity onPress={requestCameraPermission} style={styles.camFallbackBtn}>
                      <Text style={styles.camFallbackBtnText}>Allow camera</Text>
                    </TouchableOpacity>
                  </View>
                ) : camError ? (
                  <View style={styles.camErrorBox}>
                    <AlertTriangle size={32} color="#F59E0B" />
                    <Text style={styles.camErrorTitle}>Camera unavailable</Text>
                    <Text style={styles.camErrorDesc}>{camError}</Text>
                    {Platform.OS === 'web' && (
                      <TouchableOpacity
                        onPress={() => triggerFallbackFileInput(cameraMode === 'video' ? 'video/*' : 'image/*')}
                        style={styles.camFallbackBtn}
                      >
                        <Upload size={14} color="#FFFFFF" />
                        <Text style={styles.camFallbackBtnText}>Upload a file instead</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={styles.camReticleFrame} pointerEvents="none">
                    <View style={[styles.cornerBracket, styles.topLeft]} />
                    <View style={[styles.cornerBracket, styles.topRight]} />
                    <View style={[styles.cornerBracket, styles.bottomLeft]} />
                    <View style={[styles.cornerBracket, styles.bottomRight]} />
                  </View>
                )}
              </View>

              {isRecordingVideo && (
                <View style={[styles.camRecordingBadge, { zIndex: 10 }]}>
                  <View style={styles.recordingRedDot} />
                  <Text style={styles.recordingTimerText}>REC {recSeconds}</Text>
                </View>
              )}
            </View>

            <View style={styles.camControlsRow}>
              {cameraMode === 'video' ? (
                isRecordingVideo ? (
                  <TouchableOpacity onPress={stopVideoRecording} style={styles.camStopRecBtn} activeOpacity={0.8}>
                    <Square size={20} color="#FFFFFF" />
                    <Text style={styles.camStopRecBtnText}>Stop and save clip</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={startVideoRecording} style={styles.camStartRecBtn} activeOpacity={0.8}>
                    <View style={styles.recIconDot} />
                    <Text style={styles.camStartRecBtnText}>Start recording</Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity onPress={captureFrameFromCamera} style={styles.camCaptureBtn} activeOpacity={0.85}>
                  <Camera size={22} color="#FFFFFF" />
                  <Text style={styles.camCaptureBtnText}>Take photo</Text>
                </TouchableOpacity>
              )}

              {Platform.OS === 'web' && (
                <TouchableOpacity
                  onPress={() => triggerFallbackFileInput(cameraMode === 'video' ? 'video/*' : 'image/*')}
                  style={styles.camSecondaryUploadBtn}
                  activeOpacity={0.7}
                >
                  <Upload size={14} color={C.brand} />
                  <Text style={styles.camSecondaryUploadText}>Choose a file from device</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Styles                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },

  /* header */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 1 },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.okSoft,
    borderWidth: 1,
    borderColor: C.okLine,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerBadgeText: { fontSize: 11, fontWeight: '800', color: C.ok },

  /* multi-drone progress */
  progressWrap: {
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  progressTrack: { flexDirection: 'row', gap: 4 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.line },
  progressText: { fontSize: 11, fontWeight: '700', color: C.muted, marginTop: 6 },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },

  /* cards */
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  cardSubtitle: { fontSize: 12, color: C.muted, marginTop: 1, lineHeight: 16 },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: C.ink, marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  /* airframe */
  autoAssetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.page,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 10,
    gap: 8,
  },
  assetBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  assetModelText: { fontSize: 14, fontWeight: '800', color: '#1E1B4B', flexShrink: 1 },
  serialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.brandSoft,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    maxWidth: '55%',
  },
  serialLabel: { fontSize: 10, fontWeight: '700', color: '#6B21A8' },
  serialValue: { fontSize: 12, fontWeight: '900', color: '#581C87', flexShrink: 1 },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.okSoft,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.okLine,
  },
  verifiedTagText: { fontSize: 11, fontWeight: '800', color: '#065F46' },
  metaRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 11, fontWeight: '700', color: C.faint },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 2 },

  /* media */
  mediaCounterBadge: {
    backgroundColor: C.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.brandLine,
  },
  mediaCounterText: { fontSize: 11, fontWeight: '800', color: C.brand },
  mediaActionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  mediaActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  mediaActionBtnText: { fontSize: 12, fontWeight: '800' },
  emptyMediaBox: {
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.page,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    borderStyle: 'dashed',
  },
  emptyMediaText: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 8 },
  emptyMediaSubtext: { fontSize: 11, color: C.faint, textAlign: 'center', marginTop: 2, lineHeight: 15 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mediaThumbnailWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#F1F5F9',
  },
  mediaThumbnail: { width: 88, height: 88, borderRadius: 12, resizeMode: 'cover' },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: C.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTag: { fontSize: 10, fontWeight: '800', color: '#6B21A8', marginTop: 4 },
  videoNameText: { fontSize: 9, fontWeight: '700', color: '#6B21A8', marginTop: 2, paddingHorizontal: 4, textAlign: 'center' },
  removeMediaBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* checklist */
  checkItem: { marginBottom: 18 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: C.page,
  },
  optionBtnText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  optionHint: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  /* battery */
  autoSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.okSoft,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.okLine,
    marginBottom: 8,
  },
  autoSyncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  autoSyncText: { fontSize: 10, fontWeight: '800', color: '#065F46' },
  batteryDisplayBox: {
    backgroundColor: C.page,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.line,
    gap: 10,
  },
  batteryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  batteryStateText: { fontSize: 13, fontWeight: '700', color: C.ink },
  batteryPctValue: { fontSize: 18, fontWeight: '900' },
  batteryBarTrack: { height: 8, backgroundColor: C.line, borderRadius: 4, overflow: 'hidden' },
  batteryBarFill: { height: '100%', borderRadius: 4 },
  batterySubNote: { fontSize: 11, color: C.muted, fontWeight: '500', lineHeight: 15 },

  /* certification */
  certifyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  certifyCardActive: { backgroundColor: C.okSoft, borderColor: C.ok },
  certifyCardInactive: { backgroundColor: C.surface, borderColor: '#CBD5E1' },
  certifyCardDefect: { backgroundColor: C.badSoft, borderColor: '#F87171' },
  certifyCheckbox: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: C.ok },
  checkboxUnchecked: { backgroundColor: C.surface, borderWidth: 2, borderColor: '#CBD5E1' },
  certifyTitle: { fontSize: 14, fontWeight: '800' },
  certifySubtitle: { fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 17 },

  /* forms */
  formItem: { marginBottom: 14 },
  formItemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  formItemLabel: { fontSize: 12, fontWeight: '700', color: C.body },
  otpActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minHeight: 26,
  },
  otpActionBtnText: { fontSize: 11, fontWeight: '700', color: C.brand },
  inputFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.page,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  textInputMain: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14, color: C.ink, fontWeight: '600' },
  capturePodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.okSoft,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.okLine,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  capturePodBtnText: { fontSize: 13, fontWeight: '700', color: C.ok },
  podPhotoPreviewWrap: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    height: 150,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: C.line,
    marginTop: 4,
  },
  podPhotoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removePodBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removePodBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  notesInput: {
    backgroundColor: C.page,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    fontSize: 13,
    color: C.ink,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  /* sticky footer */
  footerBar: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    gap: 8,
  },
  footerStatus: { fontSize: 12, fontWeight: '700', color: C.muted },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.ok,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnIncomplete: { backgroundColor: '#64748B' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.2 },

  /* preview */
  previewBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.92)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '80%' },
  previewClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* camera modal */
  camModalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  camModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  camModalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 },
  camModalTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  camModalSubtitle: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 16 },
  camModalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  camViewfinderWrap: {
    width: '100%',
    height: 300,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: C.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  camReticleFrame: { width: 220, height: 220, position: 'relative' },
  cornerBracket: { position: 'absolute', width: 26, height: 26, borderColor: '#FFFFFF' },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  camErrorBox: { alignItems: 'center', paddingHorizontal: 20 },
  camErrorTitle: { fontSize: 14, fontWeight: '800', color: '#FBBF24', marginTop: 8 },
  camErrorDesc: { fontSize: 12, color: '#CBD5E1', textAlign: 'center', marginTop: 4, marginBottom: 12, lineHeight: 17 },
  camFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  camFallbackBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  camRecordingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  recordingRedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  recordingTimerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  camControlsRow: { marginTop: 14, gap: 10 },
  camCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.brand,
    paddingVertical: 15,
    borderRadius: 16,
  },
  camCaptureBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  camStartRecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.bad,
    paddingVertical: 15,
    borderRadius: 16,
  },
  recIconDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  camStartRecBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  camStopRecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.ok,
    paddingVertical: 15,
    borderRadius: 16,
  },
  camStopRecBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  camSecondaryUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.page,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  camSecondaryUploadText: { color: C.brand, fontSize: 12, fontWeight: '700' },
});