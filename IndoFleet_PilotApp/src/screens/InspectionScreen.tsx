import React, { useState, useEffect, useRef } from 'react';
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
  Square,
  Upload,
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
  const cleanDroneModel = order?.drone_model && !order.drone_model.includes('@') ? order.drone_model : (order?.drone_model || 'Drone RPAV');
  const cleanOrderNumber = order?.order_number || order?.id || 'DELIVERY';
  const autoBatteryPct = telemetry?.batteryPct != null && telemetry.batteryPct > 0 ? telemetry.batteryPct : 0;
  const [droneId, setDroneId] = useState<string>(cleanDroneSerial);

  useEffect(() => {
    if (inspectedDroneId) {
      setDroneId(inspectedDroneId);
    }
  }, [inspectedDroneId]);

  const totalDronesCount = Math.max(
    order?.units_count || 1,
    (order?.reserved_inventory_ids || []).length,
    (order?.items || []).length,
    1
  );

  const prevInspectedList = Array.from(new Set([
    ...(inspectedDroneIds || []),
    ...(order?.inspected_drone_ids || [])
  ]));

  const currentDroneNumber = Math.min(prevInspectedList.length + 1, totalDronesCount);
  const isFinalDrone = (prevInspectedList.length + 1) >= totalDronesCount;

  // Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      onBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onBack]);

  // Field Verification Specific Checklist (Delivery Person)
  const [cargoBayCondition, setCargoBayCondition] = useState<string>('');
  const [landingSurface, setLandingSurface] = useState<string>('');
  const [propellerCheck, setPropellerCheck] = useState<string>('');
  const [fieldBattery, setFieldBattery] = useState<string>(telemetry?.batteryPct ? String(telemetry.batteryPct) : '');
  const [zeroDefectCertified, setZeroDefectCertified] = useState<boolean>(false);
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

  // Camera Modal States (Works seamlessly on Web & Mobile)
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
  const timerRef = useRef<any>(null);

  // Native Camera Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // Clean up camera stream and recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current && streamRef.current.getTracks) {
        streamRef.current.getTracks().forEach((track: any) => {
          try {
            track.stop();
          } catch {}
        });
      }
    };
  }, []);

  const openInAppCamera = async (mode: 'photo' | 'video' | 'pod') => {
    setCameraMode(mode);
    setCamError(null);
    setCameraModalOpen(true);

    if (Platform.OS !== 'web') {
      if (!cameraPermission || !cameraPermission.granted) {
        try {
          const res = await requestCameraPermission();
          if (!res.granted) {
            setCamError('Camera permission required. Please grant camera access.');
          }
        } catch (permErr: any) {
          setCamError(permErr.message || 'Camera permission request failed');
        }
      }
      return;
    }

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        if (streamRef.current && streamRef.current.getTracks) {
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
        } catch (firstErr) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: mode === 'video',
          });
        }

        if (stream) {
          streamRef.current = stream;
          setCamStreamActive(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            try {
              await videoRef.current.play();
            } catch (playErr) {
              console.log('Video play deferred:', playErr);
            }
          }
        }
      } catch (err: any) {
        console.warn('In-app camera getUserMedia error:', err);
        setCamError(err?.message || 'Camera access not available in this browser. Please allow camera permissions.');
      }
    }
  };

  const closeInAppCamera = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecordingVideo(false);
    if (streamRef.current && streamRef.current.getTracks) {
      streamRef.current.getTracks().forEach((track: any) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setCamStreamActive(false);
    setCameraModalOpen(false);
  };

  const captureFrameFromCamera = async () => {
    // 1. Native Mobile Capture via expo-camera CameraView
    if (Platform.OS !== 'web') {
      if (nativeCameraRef.current) {
        try {
          const photo = await nativeCameraRef.current.takePictureAsync({
            quality: 0.7,
            base64: true,
            skipProcessing: false,
          });
          if (photo?.uri) {
            const base64Data = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
            if (cameraMode === 'pod') {
              setPodPhoto(base64Data);
              closeInAppCamera();
            } else {
              const newItem: MediaItem = {
                id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: 'image',
                uri: photo.uri,
                base64: base64Data,
                name: `Photo_${Date.now()}.jpg`,
              };
              setMediaItems((prev) => [...prev, newItem]);
              closeInAppCamera();
            }
            return;
          }
        } catch (camErr: any) {
          Alert.alert('Camera Capture Error', camErr.message || 'Could not snap photo.');
        }
      }
      return;
    }

    // 2. Web Browser Canvas Capture
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
            closeInAppCamera();
          } else {
            const newItem: MediaItem = {
              id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: 'image',
              uri: dataUrl,
              base64: dataUrl,
              name: `Photo_${new Date().toLocaleTimeString().replace(/:/g, '-')}.jpg`,
            };
            setMediaItems((prev) => [...prev, newItem]);
            closeInAppCamera();
          }
          return;
        }
      } catch (e) {
        console.warn('Canvas frame capture error:', e);
      }
    }
    // Fallback if canvas capture failed
    triggerFallbackFileInput('image/*');
  };

  const startVideoRecording = async () => {
    // 1. Native Mobile Video Recording via expo-camera CameraView
    if (Platform.OS !== 'web') {
      if (nativeCameraRef.current) {
        setIsRecordingVideo(true);
        setRecordingSeconds(0);
        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);

        try {
          const videoResult = await nativeCameraRef.current.recordAsync({ maxDuration: 60 });
          if (videoResult?.uri) {
            const newItem: MediaItem = {
              id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: 'video',
              uri: videoResult.uri,
              name: `Video_${Date.now()}.mp4`,
            };
            setMediaItems((prev) => [...prev, newItem]);
          }
        } catch (err: any) {
          console.warn('Native video record error:', err);
        }
      }
      return;
    }

    // 2. Web Browser MediaRecorder
    if (!streamRef.current) return;
    try {
      recordedChunksRef.current = [];
      let mediaRecorder: any;
      try {
        mediaRecorder = new (window as any).MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      } catch {
        mediaRecorder = new (window as any).MediaRecorder(streamRef.current);
      }

      mediaRecorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(blob);
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          const newItem: MediaItem = {
            id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'video',
            uri: videoUrl,
            base64: base64Data,
            name: `Video_${Date.now()}.mp4`,
          };
          setMediaItems((prev) => [...prev, newItem]);
        };
        reader.readAsDataURL(blob);
        closeInAppCamera();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecordingVideo(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Start video recording error:', err);
      Alert.alert('Recording Error', 'Could not record video: ' + err.message);
    }
  };

  const stopVideoRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecordingVideo(false);

    if (Platform.OS !== 'web') {
      if (nativeCameraRef.current) {
        try {
          nativeCameraRef.current.stopRecording();
        } catch {}
      }
      closeInAppCamera();
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const triggerFallbackFileInput = (acceptType: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = acceptType;
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          const isVideo = file.type.startsWith('video');
          reader.onload = (readEvt) => {
            const dataUrl = readEvt.target?.result as string;
            if (cameraMode === 'pod') {
              setPodPhoto(dataUrl);
            } else {
              const newItem: MediaItem = {
                id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: isVideo ? 'video' : 'image',
                uri: dataUrl,
                base64: dataUrl,
                name: file.name,
              };
              setMediaItems((prev) => [...prev, newItem]);
            }
            closeInAppCamera();
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  // Camera Photo Capture (In-App live viewfinder for instant capture & auto-save)
  const handleTakePhoto = () => {
    openInAppCamera('photo');
  };

  // Video Recording Capture (In-App 360° video recorder with live timer)
  const handleRecordVideo = () => {
    openInAppCamera('video');
  };

  // Gallery Picker (Photos & Videos with multi-selection support)
  const handlePickFromGallery = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.multiple = true;
        input.onchange = (e: any) => {
          const files = e.target?.files;
          if (files && files.length > 0) {
            Array.from(files).forEach((file: any) => {
              const reader = new FileReader();
              const isVideo = file.type.startsWith('video');
              reader.onload = (readEvt) => {
                const dataUrl = readEvt.target?.result as string;
                const newItem: MediaItem = {
                  id: `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  type: isVideo ? 'video' : 'image',
                  uri: dataUrl,
                  base64: dataUrl,
                  name: file.name || (isVideo ? 'Video' : 'Photo'),
                };
                setMediaItems((prev) => [...prev, newItem]);
              };
              reader.readAsDataURL(file);
            });
          }
        };
        input.click();
      } catch (err: any) {
        console.warn('Web file input error:', err);
      }
    } else {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Gallery Permission Required', 'Please enable photo library access to choose inspection media.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsMultipleSelection: true,
          quality: 0.7,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          result.assets.forEach((asset) => {
            const isVideo = asset.type === 'video' || (asset.uri && asset.uri.toLowerCase().endsWith('.mp4'));
            const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            const newItem: MediaItem = {
              id: `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: isVideo ? 'video' : 'image',
              uri: asset.uri,
              base64: isVideo ? undefined : base64Data,
              name: `${isVideo ? 'Video' : 'Photo'}_${Date.now()}`,
            };
            setMediaItems((prev) => [...prev, newItem]);
          });
        }
      } catch (err: any) {
        Alert.alert('Gallery Error', err.message || 'Could not pick media from gallery.');
      }
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

  // POD Photo Capture (In-App Camera)
  const handleTakePodPhoto = () => {
    openInAppCamera('pod');
  };

  const handleSubmit = async () => {
    const targetDrone = (droneId || cleanDroneSerial || inspectedDroneId || 'DRONE').trim();

    // Airframe checks are required for every individual drone
    if (!cargoBayCondition) {
      Alert.alert('Cargo Bay Check Required', 'Please select the cargo bay condition.');
      return;
    }

    if (!landingSurface) {
      Alert.alert('Landing Surface Check Required', 'Please select the landing surface condition.');
      return;
    }

    if (!propellerCheck) {
      Alert.alert('Propeller Check Required', 'Please verify the propeller status.');
      return;
    }

    if (!fieldBattery.trim()) {
      Alert.alert('Battery Reading Required', 'Please enter the current drone battery percentage.');
      return;
    }

    if (!zeroDefectCertified) {
      Alert.alert('Airframe Certification Required', 'Please check the box to certify zero critical airframe defects.');
      return;
    }

    // Customer OTP is only mandatory when certifying the final drone for customer handover (never at hub)
    if (!isHub && isFinalDrone) {
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
      // 1. Submit Airframe & Payload Inspection Report for this drone
      const res = await submitPostDeliveryInspection({
        drone_id: targetDrone,
        delivery_id: order?.id,
        stage: isHub ? 'hub_pickup' : 'customer_delivery',
        inspection_type: isHub ? 'HUB_PRE_FLIGHT_CHECK' : 'DELIVERY_PERSON_CHECK',
        cargo_bay_condition: cargoBayCondition,
        landing_surface: landingSurface,
        propeller_debris_check: propellerCheck,
        field_battery_level: autoBatteryPct,
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
            ? (isHub ? 'Hub pre-acceptance inspection passed with zero defects.' : 'Delivery completed with 0 defects. Drone verified.')
            : 'Defect flagged during airframe inspection.'),
        photo_references: photoRefs,
        video_references: videoRefs,
        media_evidence: mediaEvidence,
      });

      const inspectionId = res?.inspection_id || 'INS-VERIFIED';

      if (!isFinalDrone) {
        // Multi-Drone: intermediate drone passed inspection!
        const remaining = totalDronesCount - (prevInspectedList.length + 1);
        Alert.alert(
          isHub ? 'Hub Airframe Certified' : 'Airframe Inspection Certified',
          `Drone "${targetDrone}" ${isHub ? 'Hub verification' : 'inspection'} submitted successfully.\n\n${remaining} more drone(s) remaining for Order #${cleanOrderNumber}. Please scan and inspect the next drone.`,
          [
            {
              text: 'Scan Next Drone',
              onPress: () => onSuccess(targetDrone, false, inspectionId),
            },
          ]
        );
        return;
      }

      // Final Drone:
      if (isHub) {
        Alert.alert(
          'Hub Inspection Completed Successfully',
          `All ${totalDronesCount} drone(s) for Order #${cleanOrderNumber} inspected & approved at Hub.\nYou can now proceed to accept the order.`,
          [
            {
              text: 'Proceed to Accept Order',
              onPress: () => onSuccess(targetDrone, true, inspectionId),
            },
          ]
        );
        return;
      }

      // 2. Final Drone at Customer Location: Complete Delivery Handover & Customer POD in Database
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
        `All ${totalDronesCount} drone(s) in Order #${cleanOrderNumber} inspected & certified.\nCustomer OTP & Delivery Partner OTP verified and recorded.`,
        [
          {
            text: 'Return to Dashboard',
            onPress: () => onSuccess(targetDrone, true, inspectionId),
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
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Order #{cleanOrderNumber} · Airframe Verification
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
        {/* Airframe Info Card (Auto-Fetched from Digital Flight Manifest) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <QrCode size={18} color="#5a00b8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Airframe Safety Inspection</Text>
              <Text style={styles.cardSubtitle}>
                Sortie Aircraft #{currentDroneNumber} of {totalDronesCount} · Order #{cleanOrderNumber}
              </Text>
            </View>
            <View style={styles.verifiedTag}>
              <CheckCircle size={12} color="#059669" />
              <Text style={styles.verifiedTagText}>QR VERIFIED</Text>
            </View>
          </View>

          <View style={styles.autoAssetRow}>
            <View style={styles.assetBadge}>
              <ShieldCheck size={16} color="#5a00b8" />
              <Text style={styles.assetModelText}>{cleanDroneModel}</Text>
            </View>
            <View style={styles.serialPill}>
              <Text style={styles.serialLabel}>AIRFRAME ID:</Text>
              <Text style={styles.serialValue}>{droneId || cleanDroneSerial}</Text>
            </View>
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
                    <Image source={{ uri: item.base64 || item.uri }} style={styles.mediaThumbnail} />
                  ) : (
                    <View style={styles.videoThumbnailPlaceholder}>
                      <Video size={26} color="#5A00B8" />
                      <Text style={styles.videoTag}>VIDEO CLIP</Text>
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

          {/* 4. Battery Level (Auto-Fetched from Live Telemetry) */}
          <View style={styles.checkItem}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.itemTitle}>4. Battery Health Level (SOC)</Text>
              <View style={styles.autoSyncPill}>
                <View style={styles.autoSyncDot} />
                <Text style={styles.autoSyncText}>TELEMETRY AUTO-SYNC</Text>
              </View>
            </View>
            <View style={styles.batteryDisplayBox}>
              <View style={styles.batteryHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Battery size={20} color="#059669" />
                  <Text style={styles.batteryStateText}>Avionics Battery Remaining</Text>
                </View>
                <Text style={styles.batteryPctValue}>{autoBatteryPct}% SOC</Text>
              </View>
              <View style={styles.batteryBarTrack}>
                <View style={[styles.batteryBarFill, { width: `${autoBatteryPct}%` }]} />
              </View>
              <Text style={styles.batterySubNote}>Optimal operational state. Zero voltage drift observed.</Text>
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

        {/* ── STEP 3: CUSTOMER DELIVERY HANDOVER & OTP VERIFICATION (Only for destination delivery handover) ── */}
        {!isHub && (
          isFinalDrone ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <CheckCircle size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Customer Delivery Handover & OTP</Text>
                  <Text style={styles.cardSubtitle}>
                    All Airframes Verified — Verify recipient name and collect customer & partner OTPs
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
          ) : (
            <View style={[styles.card, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: '#F1F5F9' }]}>
                  <Lock size={18} color="#64748B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Customer Delivery Handover & OTP (Step 3)</Text>
                  <Text style={styles.cardSubtitle}>
                    Multi-Drone Sortie: Airframe #{currentDroneNumber} of {totalDronesCount}. Customer OTP handover will unlock once all {totalDronesCount} aircraft have been inspected.
                  </Text>
                </View>
              </View>
            </View>
          )
        )}

        {/* Hub Pre-Acceptance Confirmation Card */}
        {isHub && (
          <View style={[styles.card, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
                <ShieldCheck size={18} color="#5A00B8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: '#3B0080' }]}>Hub Pre-Acceptance Safety Verification</Text>
                <Text style={styles.cardSubtitle}>
                  Inspecting Airframe #{currentDroneNumber} of {totalDronesCount} at Dispatch Hub. Once all {totalDronesCount} aircraft are certified, order acceptance will unlock.
                </Text>
              </View>
            </View>
          </View>
        )}

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
              <Text style={styles.submitBtnText}>
                {isHub
                  ? (isFinalDrone
                    ? 'COMPLETE HUB VERIFICATION'
                    : `CERTIFY HUB DRONE #${currentDroneNumber} & SCAN NEXT`)
                  : (isFinalDrone
                    ? 'CONFIRM & COMPLETE DELIVERY'
                    : `CERTIFY DRONE #${currentDroneNumber} & SCAN NEXT`)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── LIVE AIRFRAME CAMERA & RECORDER MODAL ───────────────── */}
      <Modal
        visible={cameraModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeInAppCamera}
      >
        <View style={styles.camModalBackdrop}>
          <View style={styles.camModalCard}>
            {/* Modal Header */}
            <View style={styles.camModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.camModalTitle}>
                  {cameraMode === 'video'
                    ? 'Record Airframe Video'
                    : cameraMode === 'pod'
                    ? 'Package POD Photo'
                    : 'Drone Inspection Camera'}
                </Text>
                <Text style={styles.camModalSubtitle}>
                  {cameraMode === 'video'
                    ? 'Capture 360° airframe & propeller condition'
                    : cameraMode === 'pod'
                    ? 'Snap customer parcel handover with door / landmark'
                    : 'Align drone chassis or cargo bay in viewfinder'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeInAppCamera}
                style={styles.camModalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Viewfinder Display */}
            <View style={styles.camViewfinderWrap}>
              {/* Native Mobile CameraView */}
              {Platform.OS !== 'web' && (
                cameraPermission?.granted ? (
                  <CameraView
                    ref={nativeCameraRef}
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    mode={cameraMode === 'video' ? 'video' : 'picture'}
                  />
                ) : (
                  <View style={styles.camErrorBox}>
                    <AlertTriangle size={32} color="#F59E0B" />
                    <Text style={styles.camErrorTitle}>Camera Permission Required</Text>
                    <Text style={styles.camErrorDesc}>
                      Please grant camera access to capture airframe inspection photos and video.
                    </Text>
                    <TouchableOpacity
                      onPress={requestCameraPermission}
                      style={styles.camFallbackBtn}
                    >
                      <Text style={styles.camFallbackBtnText}>Grant Camera Access</Text>
                    </TouchableOpacity>
                  </View>
                )
              )}

              {/* HTML5 live camera video element for Web */}
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
                    backgroundColor: '#F8FAFC',
                    borderRadius: 16,
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
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: camStreamActive ? 1 : 0,
                    }}
                  />
                </div>
              )}

              {/* Viewfinder Reticle & Target Box */}
              <View style={[styles.camReticleFrame, { zIndex: 5 }]}>
                <View style={[styles.cornerBracket, styles.topLeft]} />
                <View style={[styles.cornerBracket, styles.topRight]} />
                <View style={[styles.cornerBracket, styles.bottomLeft]} />
                <View style={[styles.cornerBracket, styles.bottomRight]} />

                {camError ? (
                  <View style={styles.camErrorBox}>
                    <AlertTriangle size={32} color="#F59E0B" />
                    <Text style={styles.camErrorTitle}>Camera Feed Unavailable</Text>
                    <Text style={styles.camErrorDesc}>{camError}</Text>
                    <TouchableOpacity
                      onPress={() => triggerFallbackFileInput(cameraMode === 'video' ? 'video/*' : 'image/*')}
                      style={styles.camFallbackBtn}
                    >
                      <Upload size={14} color="#FFFFFF" />
                      <Text style={styles.camFallbackBtnText}>Upload File Instead</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.camCrosshairWrap}>
                    <View style={styles.camCrosshairCenter} />
                  </View>
                )}
              </View>

              {/* Recording Status Pill */}
              {isRecordingVideo && (
                <View style={[styles.camRecordingBadge, { zIndex: 10 }]}>
                  <View style={styles.recordingRedDot} />
                  <Text style={styles.recordingTimerText}>
                    REC {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                    {String(recordingSeconds % 60).padStart(2, '0')}
                  </Text>
                </View>
              )}
            </View>

            {/* Shutter / Action Controls */}
            <View style={styles.camControlsRow}>
              {cameraMode === 'video' ? (
                isRecordingVideo ? (
                  <TouchableOpacity
                    onPress={stopVideoRecording}
                    style={styles.camStopRecBtn}
                    activeOpacity={0.8}
                  >
                    <Square size={20} color="#FFFFFF" />
                    <Text style={styles.camStopRecBtnText}>Stop &amp; Save Video Clip</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={startVideoRecording}
                    style={styles.camStartRecBtn}
                    activeOpacity={0.8}
                  >
                    <View style={styles.recIconDot} />
                    <Text style={styles.camStartRecBtnText}>Start Video Recording</Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  onPress={captureFrameFromCamera}
                  style={styles.camCaptureBtn}
                  activeOpacity={0.85}
                >
                  <Camera size={22} color="#FFFFFF" />
                  <Text style={styles.camCaptureBtnText}>Click Photo &amp; Save</Text>
                </TouchableOpacity>
              )}

              {/* Secondary Upload Fallback */}
              <TouchableOpacity
                onPress={() => triggerFallbackFileInput(cameraMode === 'video' ? 'video/*' : 'image/*')}
                style={styles.camSecondaryUploadBtn}
                activeOpacity={0.7}
              >
                <Upload size={14} color="#5A00B8" />
                <Text style={styles.camSecondaryUploadText}>Choose File from Device</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  autoAssetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 8,
  },
  assetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  assetModelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  serialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  serialLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B21A8',
  },
  serialValue: {
    fontSize: 11,
    fontWeight: '900',
    color: '#581C87',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
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
    backgroundColor: '#F1F5F9',
  },
  mediaThumbnail: {
    width: 88,
    height: 88,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTag: {
    fontSize: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '900',
    color: '#6B21A8',
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
  autoSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  autoSyncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  autoSyncText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.3,
  },
  batteryDisplayBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  batteryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batteryStateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  batteryPctValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#059669',
  },
  batteryBarTrack: {
    height: 7,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  batteryBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  batterySubNote: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  // In-App Camera Modal Styles
  camModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  camModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  camModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  camModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  camModalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  camModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camViewfinderWrap: {
    width: '100%',
    height: 280,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camReticleFrame: {
    width: 220,
    height: 220,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#A855F7',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 10,
  },
  camCrosshairWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camCrosshairCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A855F7',
  },
  camErrorBox: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  camErrorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
    marginTop: 8,
  },
  camErrorDesc: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  camFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5A00B8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  camFallbackBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  camRecordingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  recordingRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  recordingTimerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  camControlsRow: {
    marginTop: 14,
    gap: 10,
  },
  camCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5A00B8',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#5A00B8',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  camCaptureBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  camStartRecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#DC2626',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  recIconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  camStartRecBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  camStopRecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  camStopRecBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  camSecondaryUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  camSecondaryUploadText: {
    color: '#5A00B8',
    fontSize: 11,
    fontWeight: '700',
  },
  videoNameText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#6B21A8',
    marginTop: 2,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
});
