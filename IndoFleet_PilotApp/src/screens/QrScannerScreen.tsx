import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  BackHandler,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import {
  ArrowLeft,
  QrCode,
  Camera,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  X,
  Image as ImageIcon,
  Check,
  Scan,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import jsQR from 'jsqr';
import { DeliveryOrder } from '../types';

interface QrScannerScreenProps {
  order: DeliveryOrder | null;
  onBack: () => void;
  onScannedSuccess: (droneId: string) => void;
}

export const QrScannerScreen: React.FC<QrScannerScreenProps> = ({
  order,
  onBack,
  onScannedSuccess,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [verifiedDroneId, setVerifiedDroneId] = useState<string | null>(null);

  // Mismatch Error Modal state
  const [mismatchError, setMismatchError] = useState<{
    scanned: string;
    expected: string;
  } | null>(null);

  // Manual code entry state
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Live Camera Viewfinder State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializingCam, setIsInitializingCam] = useState(false);
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);

  const scanAnim = useRef(new Animated.Value(0)).current;

  // Expected Drone assigned to this order (hidden from screen until verified match)
  const rawExpectedId = (order?.assigned_drone_id || order?.drone_id || '').trim();
  const expectedDroneId = rawExpectedId && !rawExpectedId.includes('@') ? rawExpectedId : 'RPAV-700-01';
  const expectedDroneModel = order?.drone_model && !order.drone_model.includes('@') ? order.drone_model : 'IndoWings 700 RPAV';
  const cleanOrderNumber = order?.order_number || order?.id || 'DELIVERY';

  // Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      onBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onBack]);

  // Animate laser scanner line
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanAnim]);

  // Request live camera stream
  const startCamera = async () => {
    setIsInitializingCam(true);
    setCameraError(null);

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        if (streamRef.current && streamRef.current.getTracks) {
          streamRef.current.getTracks().forEach((track: any) => track.stop());
        }

        let stream: any = null;

        // Try rear / environment camera first (smartphones / tablets)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (firstErr) {
          // Fallback to any attached webcam
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (secErr: any) {
            console.log('Webcam not detected on device:', secErr);
            if (secErr?.name === 'NotAllowedError' || secErr?.name === 'PermissionDeniedError') {
              setCameraError('Camera access denied. Please click the camera icon in browser URL bar to allow.');
            } else if (secErr?.name === 'NotFoundError' || secErr?.name === 'DevicesNotFoundError') {
              setCameraError('No physical camera device detected on this machine. Use "Snap QR Photo" or enter the Drone ID below.');
            } else {
              setCameraError('Camera device unavailable. Use photo capture or manual entry below.');
            }
          }
        }

        if (stream) {
          streamRef.current = stream;
          setCameraActive(true);
          setCameraError(null);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            try {
              await videoRef.current.play();
            } catch {}
          }
        } else {
          setCameraActive(false);
        }
      } catch (err: any) {
        setCameraActive(false);
        setCameraError('Camera initialization error');
      } finally {
        setIsInitializingCam(false);
      }
    } else {
      setIsInitializingCam(false);
      setCameraActive(true);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current && streamRef.current.getTracks) {
        streamRef.current.getTracks().forEach((track: any) => {
          try {
            track.stop();
          } catch {}
        });
      }
    };
  }, []);

  // Continuous frame analysis via jsQR on web live stream
  useEffect(() => {
    let animId: number;

    const checkFrame = () => {
      if (
        Platform.OS === 'web' &&
        cameraActive &&
        videoRef.current &&
        !verifiedSuccess &&
        !isVerifying &&
        !mismatchError
      ) {
        try {
          const video = videoRef.current;
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            if (!canvasRef.current && typeof document !== 'undefined') {
              canvasRef.current = document.createElement('canvas');
            }
            const canvas = canvasRef.current;
            if (canvas) {
              const w = Math.min(640, video.videoWidth);
              const h = Math.round((video.videoHeight / video.videoWidth) * w);
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0, w, h);
                const imgData = ctx.getImageData(0, 0, w, h);
                const code = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: 'dontInvert',
                });
                if (code && code.data && code.data.trim()) {
                  handleValidateScannedCode(code.data.trim());
                  return;
                }
              }
            }
          }
        } catch {}
      }
      animId = requestAnimationFrame(checkFrame);
    };

    if (cameraActive) {
      animId = requestAnimationFrame(checkFrame);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [cameraActive, verifiedSuccess, isVerifying, mismatchError]);

  // Decode QR from Image URI via Canvas + jsQR
  const decodeQrFromUri = async (uri: string): Promise<string | null> => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 800;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0, w, h);
            const imgData = ctx.getImageData(0, 0, w, h);
            const code = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'attemptBoth',
            });
            resolve(code?.data ? code.data.trim() : null);
          } catch (e) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = uri;
      });
    }
    return null;
  };

  // Extract Clean Drone Serial from Scanned Text (URLs, JSON, or plain text)
  const extractDroneId = (text: string): string => {
    let raw = text.trim();
    // Case 1: JSON payload
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.drone_id || parsed.id || parsed.serial) {
          return String(parsed.drone_id || parsed.id || parsed.serial).trim();
        }
      } catch {}
    }
    // Case 2: URL like https://indofleet.com/drone/RPAV-700-01
    if (raw.includes('/drone/')) {
      const parts = raw.split('/drone/');
      if (parts[1]) return parts[1].split(/[?#&/]/)[0].trim();
    }
    // Case 3: Prefixed format INDOFLEET:DRONE:RPAV-700-01
    if (raw.includes(':')) {
      const parts = raw.split(':');
      const last = parts[parts.length - 1];
      if (last) return last.trim();
    }
    return raw;
  };

  // Main Validation: Compare Scanned Drone ID vs Order's Assigned Drone ID
  const handleValidateScannedCode = (scannedRaw: string) => {
    if (isVerifying || verifiedSuccess) return;

    const extractedCode = extractDroneId(scannedRaw);
    if (!extractedCode) return;

    setIsVerifying(true);
    setMismatchError(null);

    // Normalization for comparison
    const normScanned = extractedCode.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const normExpected = expectedDroneId.toUpperCase().replace(/[^A-Z0-9-]/g, '');

    const isMatch = normScanned === normExpected || normScanned.includes(normExpected) || normExpected.includes(normScanned);

    setTimeout(() => {
      setIsVerifying(false);

      if (isMatch) {
        // MATCH SUCCESS!
        setVerifiedDroneId(expectedDroneId);
        setVerifiedSuccess(true);
        setMismatchError(null);

        // Proceed to Pre-Flight Inspection after confirmation feedback
        setTimeout(() => {
          onScannedSuccess(expectedDroneId);
        }, 900);
      } else {
        // MISMATCH ERROR! DO NOT PROCEED!
        setVerifiedSuccess(false);
        setMismatchError({
          scanned: extractedCode,
          expected: expectedDroneId,
        });
      }
    }, 400);
  };

  // Take photo of drone QR with phone camera
  const handleTakePhotoScan = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission Required', 'Please enable camera access to scan QR code.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photoUri = result.assets[0].uri;
        setIsVerifying(true);
        const decoded = await decodeQrFromUri(photoUri);
        setIsVerifying(false);

        if (decoded) {
          handleValidateScannedCode(decoded);
        } else {
          // If optical image couldn't read QR, prompt pilot with manual serial prompt
          Alert.alert(
            'QR Not Recognized',
            'Could not clearly detect a QR code in the captured photo. Please hold camera closer to the sticker or enter the Drone ID below.',
            [
              { text: 'Try Again', onPress: handleTakePhotoScan },
              { text: 'Enter ID Manually', onPress: () => setShowManualInput(true) },
            ]
          );
        }
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e?.message || 'Failed to open camera.');
    }
  };

  // Upload QR photo from gallery
  const handleUploadPhotoScan = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photoUri = result.assets[0].uri;
        setIsVerifying(true);
        const decoded = await decodeQrFromUri(photoUri);
        setIsVerifying(false);

        if (decoded) {
          handleValidateScannedCode(decoded);
        } else {
          Alert.alert(
            'QR Not Found',
            'No QR code detected in this image. Please select a clear picture of the drone airframe QR sticker.'
          );
        }
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e?.message || 'Failed to pick image.');
    }
  };

  // Handle Manual Code Submit
  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      Alert.alert('Empty Code', 'Please enter the drone ID (e.g. RPAV-700-01) printed on the airframe.');
      return;
    }
    handleValidateScannedCode(manualCode.trim());
  };

  const laserTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 210],
  });

  return (
    <View style={styles.container}>
      {/* ── Top Header (Order ID Only - Drone ID is Hidden Until Scanned) ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Drone QR Airframe Scanner</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Order #{cleanOrderNumber}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Scan size={14} color="#5A00B8" />
          <Text style={styles.headerBadgeText}>Scan Required</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ── Scanner Viewport Container ─────────────────────────── */}
        <View style={styles.scannerWrapper}>
          <View style={styles.viewfinderCard}>
            {/* HTML5 live camera video element */}
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
                  backgroundColor: '#070B14',
                  borderRadius: 24,
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
                    opacity: cameraActive ? 1 : 0,
                    transition: 'opacity 0.25s ease-in-out',
                  }}
                />
              </div>
            )}

            {/* Dark optical viewfinder backdrop */}
            <View style={[styles.cameraPlaceholder, { zIndex: cameraActive && Platform.OS === 'web' ? 0 : 2 }]}>
              <View style={styles.simulatedGrid} />
            </View>

            {/* Viewfinder Top HUD */}
            <View style={[styles.scannerTopHud, { zIndex: 12 }]}>
              <View style={styles.scannerLivePill}>
                <View
                  style={[
                    styles.scannerLiveDot,
                    verifiedSuccess && styles.scannerLiveDotSuccess,
                    Boolean(mismatchError) && styles.scannerLiveDotError,
                  ]}
                />
                <Text style={styles.scannerLiveText}>
                  {verifiedSuccess
                    ? 'AIRFRAME VERIFIED'
                    : mismatchError
                    ? 'MISMATCH ERROR'
                    : cameraActive
                    ? 'OPTICAL SCANNER ACTIVE'
                    : 'AWAITING CAMERA SCAN'}
                </Text>
              </View>
            </View>

            {/* Target Reticle Overlay */}
            <View style={[styles.reticleContainer, { zIndex: 10 }]}>
              <View
                style={[
                  styles.reticleBox,
                  verifiedSuccess && styles.reticleBoxSuccess,
                  Boolean(mismatchError) && styles.reticleBoxError,
                ]}
              >
                {/* 4 Corner Targeting Brackets */}
                <View style={[styles.cornerBracket, styles.topLeft, verifiedSuccess && styles.bracketSuccess, Boolean(mismatchError) && styles.bracketError]} />
                <View style={[styles.cornerBracket, styles.topRight, verifiedSuccess && styles.bracketSuccess, Boolean(mismatchError) && styles.bracketError]} />
                <View style={[styles.cornerBracket, styles.bottomLeft, verifiedSuccess && styles.bracketSuccess, Boolean(mismatchError) && styles.bracketError]} />
                <View style={[styles.cornerBracket, styles.bottomRight, verifiedSuccess && styles.bracketSuccess, Boolean(mismatchError) && styles.bracketError]} />

                {/* Animated Laser Scanning Line */}
                {!verifiedSuccess && !mismatchError && (
                  <Animated.View
                    style={[
                      styles.laserLine,
                      {
                        transform: [{ translateY: laserTranslateY }],
                      },
                    ]}
                  />
                )}

                {/* Center Status / Icon */}
                <View style={styles.reticleCenter}>
                  {verifiedSuccess ? (
                    <View style={styles.successCircle}>
                      <CheckCircle2 size={54} color="#10B981" />
                      <Text style={styles.successText}>AIRFRAME MATCHED!</Text>
                      <Text style={styles.successSubtext}>Drone: {verifiedDroneId}</Text>
                    </View>
                  ) : mismatchError ? (
                    <View style={styles.errorCenterWrap}>
                      <AlertTriangle size={50} color="#EF4444" />
                      <Text style={styles.errorCenterTitle}>MISMATCH DETECTED</Text>
                      <Text style={styles.errorCenterSub}>Wrong Airframe Scanned</Text>
                    </View>
                  ) : isVerifying ? (
                    <View style={styles.activeScanningWrap}>
                      <ActivityIndicator size="large" color="#A855F7" />
                      <Text style={[styles.activeScanningText, { color: '#E9D5FF' }]}>Verifying Airframe QR...</Text>
                    </View>
                  ) : (
                    <View style={styles.activeScanningWrap}>
                      <View style={styles.qrTargetCircle}>
                        <QrCode size={40} color="#A855F7" />
                      </View>
                      <Text style={styles.activeScanningText}>Align Drone QR Within Frame</Text>
                      <Text style={styles.activeScanningSub}>Point camera at physical drone sticker</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Bottom Viewfinder Hint */}
            <View style={[styles.viewfinderBottomHud, { zIndex: 12 }]}>
              <Text style={styles.viewfinderBottomText}>
                Locate QR sticker on drone chassis or battery compartment
              </Text>
            </View>
          </View>
        </View>

        {/* ── MISMATCH ERROR BANNER (When wrong drone is scanned) ──── */}
        {mismatchError && (
          <View style={styles.mismatchBanner}>
            <View style={styles.mismatchHeader}>
              <AlertTriangle size={20} color="#DC2626" />
              <Text style={styles.mismatchTitle}>AIRFRAME MISMATCH ERROR!</Text>
            </View>
            <Text style={styles.mismatchDesc}>
              The scanned drone does not match the drone assigned for this delivery sortie:
            </Text>
            <View style={styles.mismatchCompareGrid}>
              <View style={styles.mismatchBoxScanned}>
                <Text style={styles.mismatchLabel}>Scanned Airframe:</Text>
                <Text style={styles.mismatchValueScanned}>{mismatchError.scanned}</Text>
                <Text style={styles.mismatchSubScanned}>❌ Incorrect Drone</Text>
              </View>
              <View style={styles.mismatchBoxExpected}>
                <Text style={styles.mismatchLabel}>Assigned for Order:</Text>
                <Text style={styles.mismatchValueExpected}>{mismatchError.expected}</Text>
                <Text style={styles.mismatchSubExpected}>✓ Required Drone</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.mismatchResetBtn}
              onPress={() => {
                setMismatchError(null);
                setManualCode('');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.mismatchResetBtnText}>Scan Again (Find Correct Drone)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Controls & Authentic Actions (No Dummy Instant Verify) ── */}
        <View style={styles.controlPanel}>
          {/* Order Details Card (Only Order info, NO pre-revealed drone ID) */}
          <View style={styles.orderCard}>
            <View style={styles.orderCardHeader}>
              <View>
                <Text style={styles.orderLabel}>DELIVERY DISPATCH ORDER</Text>
                <Text style={styles.orderValue}>Order #{cleanOrderNumber}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>Awaiting Airframe Match</Text>
              </View>
            </View>
            <Text style={styles.orderNotice}>
              For flight safety compliance, you must scan the physical QR code on the drone chassis. IndoFleet will verify the airframe matches this order before unlocking pre-flight inspection.
            </Text>
          </View>

          {/* Primary Action: Open Hardware Camera Shutter */}
          <TouchableOpacity
            style={[styles.primaryActionBtn, isVerifying && { opacity: 0.7 }]}
            onPress={handleTakePhotoScan}
            disabled={isVerifying || verifiedSuccess}
            activeOpacity={0.85}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Camera size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionBtnText}>OPEN CAMERA TO SNAP QR</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Actions: Gallery Upload & Manual Code Entry */}
          <View style={styles.secondaryActionRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleUploadPhotoScan}
              disabled={isVerifying || verifiedSuccess}
              activeOpacity={0.8}
            >
              <ImageIcon size={15} color="#5A00B8" />
              <Text style={styles.secondaryBtnText}>Upload QR Image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setShowManualInput(!showManualInput)}
              disabled={isVerifying || verifiedSuccess}
              activeOpacity={0.8}
            >
              <QrCode size={15} color="#5A00B8" />
              <Text style={styles.secondaryBtnText}>
                {showManualInput ? 'Hide Serial Entry' : 'Enter Serial Manually'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Manual Drone Serial Entry Input Box */}
          {showManualInput && (
            <View style={styles.manualEntryCard}>
              <Text style={styles.manualEntryTitle}>Enter Drone Serial / QR Text</Text>
              <Text style={styles.manualEntrySub}>
                Type the airframe serial printed under the QR code sticker to test matching:
              </Text>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualTextInput}
                  placeholder="e.g. RPAV-700-01"
                  placeholderTextColor="#94A3B8"
                  value={manualCode}
                  onChangeText={setManualCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.manualSubmitBtn}
                  onPress={handleManualSubmit}
                  disabled={isVerifying || !manualCode.trim()}
                  activeOpacity={0.85}
                >
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.manualSubmitBtnText}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Success Reveal Card (Shown ONLY after successful match) */}
          {verifiedSuccess && verifiedDroneId && (
            <View style={styles.verifiedSuccessCard}>
              <View style={styles.verifiedSuccessRow}>
                <CheckCircle2 size={24} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifiedSuccessTitle}>✓ Airframe Authenticated!</Text>
                  <Text style={styles.verifiedSuccessDesc}>
                    Drone <Text style={{ fontWeight: '800' }}>{verifiedDroneId}</Text> ({expectedDroneModel}) matches Order #{cleanOrderNumber}. Opening Pre-Flight Inspection...
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
    zIndex: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    flexShrink: 0,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5A00B8',
  },
  scannerWrapper: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderCard: {
    width: '100%',
    maxWidth: 420,
    height: 340,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0A1128',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cameraPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#070B14',
  },
  simulatedGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
    backgroundColor: '#1E293B',
  },
  scannerTopHud: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  scannerLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  scannerLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  scannerLiveDotSuccess: {
    backgroundColor: '#10B981',
  },
  scannerLiveDotError: {
    backgroundColor: '#EF4444',
  },
  scannerLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  reticleContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: 220,
    height: 220,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(10, 17, 40, 0.25)',
  },
  reticleBoxSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  reticleBoxError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  cornerBracket: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#C084FC',
  },
  bracketSuccess: {
    borderColor: '#10B981',
  },
  bracketError: {
    borderColor: '#EF4444',
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
  laserLine: {
    position: 'absolute',
    top: 4,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: '#C084FC',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  reticleCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  qrTargetCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  activeScanningWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeScanningText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  activeScanningSub: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 4,
    textAlign: 'center',
  },
  successCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  successText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  successSubtext: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  errorCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  errorCenterTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#EF4444',
  },
  errorCenterSub: {
    fontSize: 10,
    color: '#FCA5A5',
  },
  viewfinderBottomHud: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  viewfinderBottomText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
  },
  mismatchBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    gap: 12,
  },
  mismatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mismatchTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.4,
  },
  mismatchDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  mismatchCompareGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  mismatchBoxScanned: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  mismatchBoxExpected: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  mismatchLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mismatchValueScanned: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
    marginTop: 2,
  },
  mismatchSubScanned: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
    marginTop: 2,
  },
  mismatchValueExpected: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
    marginTop: 2,
  },
  mismatchSubExpected: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  mismatchResetBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mismatchResetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  controlPanel: {
    paddingHorizontal: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  orderValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  orderNotice: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  primaryActionBtn: {
    backgroundColor: '#5A00B8',
    paddingVertical: 15,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#5A00B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A00B8',
  },
  manualEntryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  manualEntryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  manualEntrySub: {
    fontSize: 11,
    color: '#64748B',
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  manualTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  manualSubmitBtn: {
    backgroundColor: '#5A00B8',
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  manualSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  verifiedSuccessCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  verifiedSuccessRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  verifiedSuccessTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#065F46',
  },
  verifiedSuccessDesc: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 18,
  },
});
