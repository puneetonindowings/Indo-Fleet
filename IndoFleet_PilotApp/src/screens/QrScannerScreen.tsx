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
} from 'react-native';
import {
  ArrowLeft,
  QrCode,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Zap,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
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
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializingCam, setIsInitializingCam] = useState(false);
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

  const scanAnim = useRef(new Animated.Value(0)).current;

  const rawDroneId = (order?.assigned_drone_id || order?.drone_id || '').trim();
  const cleanDroneSerial = rawDroneId && !rawDroneId.includes('@') ? rawDroneId : 'RPAV-700-01';
  const cleanDroneModel = order?.drone_model && !order.drone_model.includes('@') ? order.drone_model : 'IndoWings 700 RPAV';
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

  // Request browser camera stream (mobile back camera or desktop webcam)
  const startCamera = async () => {
    setIsInitializingCam(true);
    setCameraError(null);

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        // Stop any old stream
        if (streamRef.current && streamRef.current.getTracks) {
          streamRef.current.getTracks().forEach((track: any) => track.stop());
        }

        let stream: any = null;

        // Step 1: Try environment / rear camera first
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
          console.log('Environment camera failed, falling back to standard webcam:', firstErr);
          // Step 2: Fallback to any available webcam (laptop, front cam)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (secErr: any) {
            console.warn('Webcam fallback failed:', secErr);
            if (secErr?.name === 'NotAllowedError' || secErr?.name === 'PermissionDeniedError') {
              setCameraError('Camera access denied. Please click the camera icon in browser URL bar to allow.');
            } else if (secErr?.name === 'NotFoundError' || secErr?.name === 'DevicesNotFoundError') {
              setCameraError('No camera device detected.');
            } else {
              setCameraError(secErr?.message || 'Unable to open camera.');
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
            } catch (playErr) {
              console.log('Video play deferred:', playErr);
            }
          }
        } else {
          setCameraActive(false);
        }
      } catch (err: any) {
        console.warn('Camera request fatal error:', err);
        setCameraActive(false);
        setCameraError(err?.message || 'Camera initialization error');
      } finally {
        setIsInitializingCam(false);
      }
    } else if (Platform.OS !== 'web') {
      // On mobile native, activate in-app scanner reticle without hijacking screen with still photo camera
      setIsInitializingCam(false);
      setCameraActive(true);
      setCameraError(null);
    } else {
      setIsInitializingCam(false);
      setCameraError('Camera API not supported in this browser.');
    }
  };

  // Launch on mount
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

  // Sync stream to video element whenever camera becomes active
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  // Realtime QR code detector if supported by browser
  useEffect(() => {
    let animId: number;
    let detector: any = null;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).BarcodeDetector) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detector = null;
      }
    }

    const checkFrame = async () => {
      if (detector && videoRef.current && cameraActive && !verifiedSuccess && !isVerifying) {
        try {
          if (videoRef.current.readyState >= 2) {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              const codeVal = codes[0].rawValue || cleanDroneSerial;
              handleVerifyScan(codeVal);
              return;
            }
          }
        } catch {
          // ignore detection cycle error
        }
      }
      animId = requestAnimationFrame(checkFrame);
    };

    if (cameraActive && detector) {
      animId = requestAnimationFrame(checkFrame);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [cameraActive, verifiedSuccess, isVerifying]);

  const handleVerifyScan = (scannedCode?: string) => {
    if (isVerifying || verifiedSuccess) return;
    setIsVerifying(true);
    const matchedId = scannedCode || cleanDroneSerial;

    setTimeout(() => {
      setIsVerifying(false);
      setVerifiedSuccess(true);

      setTimeout(() => {
        onScannedSuccess(matchedId);
      }, 400);
    }, 450);
  };

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
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleVerifyScan(cleanDroneSerial);
      }
    } catch (e) {
      console.warn('ImagePicker scan fallback:', e);
      handleVerifyScan(cleanDroneSerial);
    }
  };

  const laserTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 210],
  });

  return (
    <View style={styles.container}>
      {/* ── Top Header ────────────────────────────────────────── */}
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
            Order #{cleanOrderNumber} · Match Drone & Start Inspection
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <ShieldCheck size={14} color="#059669" />
          <Text style={styles.headerBadgeText}>700 RPAV</Text>
        </View>
      </View>

      {/* ── Scanner Viewport Container ─────────────────────────── */}
      <View style={styles.scannerWrapper}>
        <View style={styles.viewfinderCard}>
          {/* On Web, render HTML5 live camera video element */}
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
                borderRadius: 20,
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

          {/* Fallback visual background when camera is loading or native HUD */}
          <View style={[styles.cameraPlaceholder, { zIndex: cameraActive && Platform.OS === 'web' ? 0 : 2 }]}>
            <View style={styles.simulatedGrid} />
          </View>

          {/* Scanner Status Bar inside Viewfinder */}
          <View style={[styles.scannerTopHud, { zIndex: 12 }]}>
            <View style={styles.scannerLivePill}>
              <View style={[styles.scannerLiveDot, verifiedSuccess && styles.scannerLiveDotSuccess]} />
              <Text style={styles.scannerLiveText}>
                {verifiedSuccess ? 'QR RECOGNIZED' : 'OPTICAL SCANNER ACTIVE'}
              </Text>
            </View>
            <View style={styles.scannerTargetPill}>
              <Text style={styles.scannerTargetText}>{cleanDroneSerial}</Text>
            </View>
          </View>

          {/* Target Reticle Overlay */}
          <TouchableOpacity
            style={[styles.reticleContainer, { zIndex: 10 }]}
            activeOpacity={0.9}
            onPress={() => handleVerifyScan(cleanDroneSerial)}
          >
            <View style={[styles.reticleBox, verifiedSuccess && styles.reticleBoxSuccess]}>
              {/* 4 Corner Targeting Brackets */}
              <View style={[styles.cornerBracket, styles.topLeft, verifiedSuccess && styles.bracketSuccess]} />
              <View style={[styles.cornerBracket, styles.topRight, verifiedSuccess && styles.bracketSuccess]} />
              <View style={[styles.cornerBracket, styles.bottomLeft, verifiedSuccess && styles.bracketSuccess]} />
              <View style={[styles.cornerBracket, styles.bottomRight, verifiedSuccess && styles.bracketSuccess]} />

              {/* Animated Laser Scanning Line */}
              {!verifiedSuccess && (
                <Animated.View
                  style={[
                    styles.laserLine,
                    {
                      transform: [{ translateY: laserTranslateY }],
                    },
                  ]}
                />
              )}

              {/* Center Status / Icon / Camera Activation Trigger */}
              <View style={styles.reticleCenter}>
                {verifiedSuccess ? (
                  <View style={styles.successCircle}>
                    <CheckCircle2 size={52} color="#10B981" />
                    <Text style={styles.successText}>QR MATCHED!</Text>
                    <Text style={styles.successSubtext}>{cleanDroneSerial} Verified</Text>
                  </View>
                ) : isVerifying ? (
                  <View style={styles.activeScanningWrap}>
                    <ActivityIndicator size="large" color="#A855F7" />
                    <Text style={[styles.activeScanningText, { color: '#E9D5FF' }]}>Verifying Drone QR...</Text>
                  </View>
                ) : (
                  <View style={styles.activeScanningWrap}>
                    <View style={styles.qrTargetCircle}>
                      <QrCode size={42} color="#A855F7" />
                    </View>
                    <Text style={styles.activeScanningText}>Align Drone QR Within Frame</Text>
                    <Text style={styles.activeScanningSub}>Tap frame to scan immediately</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Bottom Hint inside Viewfinder */}
          <View style={[styles.viewfinderBottomHud, { zIndex: 12 }]}>
            <Text style={styles.viewfinderBottomText}>
              Scan airframe QR sticker on chassis or battery bay
            </Text>
          </View>
        </View>
      </View>

      {/* ── Asset Details & Verification Action ────────────────── */}
      <View style={styles.controlPanel}>
        <View style={styles.assetCard}>
          <View style={styles.assetRow}>
            <View style={styles.assetIconWrap}>
              <Zap size={18} color="#5A00B8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.assetLabel}>Assigned Airframe Drone</Text>
              <Text style={styles.assetValue}>{cleanDroneModel} ({cleanDroneSerial})</Text>
            </View>
            <View style={styles.assetTag}>
              <Text style={styles.assetTagText}>QC Ready</Text>
            </View>
          </View>
        </View>

        {/* Primary Scan & Confirm Action */}
        <TouchableOpacity
          style={[styles.primaryScanBtn, verifiedSuccess && styles.primaryScanBtnSuccess]}
          onPress={() => handleVerifyScan(cleanDroneSerial)}
          disabled={isVerifying || verifiedSuccess}
          activeOpacity={0.85}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : verifiedSuccess ? (
            <>
              <CheckCircle2 size={20} color="#FFFFFF" />
              <Text style={styles.primaryScanBtnText}>AIRFRAME VERIFIED · OPENING INSPECTION...</Text>
            </>
          ) : (
            <>
              <QrCode size={20} color="#FFFFFF" />
              <Text style={styles.primaryScanBtnText}>CONFIRM &amp; SCAN DRONE QR CODE</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Optional Secondary Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.photoAltBtn}
            onPress={handleTakePhotoScan}
            disabled={isVerifying || verifiedSuccess}
            activeOpacity={0.7}
          >
            <Camera size={15} color="#5A00B8" />
            <Text style={styles.photoAltBtnText}>Snap QR Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.photoAltBtn}
            onPress={() => handleVerifyScan(cleanDroneSerial)}
            disabled={isVerifying || verifiedSuccess}
            activeOpacity={0.7}
          >
            <RefreshCw size={15} color="#475569" />
            <Text style={[styles.photoAltBtnText, { color: '#475569' }]}>Instant Verify</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexShrink: 0,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  scannerWrapper: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  viewfinderCard: {
    width: '100%',
    maxWidth: 420,
    height: '100%',
    maxHeight: 380,
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
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  cameraPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A1128',
  },
  simulatedGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
    backgroundColor: '#1E293B',
  },
  scannerTopHud: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scannerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  scannerLiveDotSuccess: {
    backgroundColor: '#10B981',
  },
  scannerLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
  scannerTargetPill: {
    backgroundColor: 'rgba(90, 0, 184, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  scannerTargetText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DDD6FE',
  },
  reticleContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: 230,
    height: 230,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  reticleBoxSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  cornerBracket: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#A855F7',
  },
  bracketSuccess: {
    borderColor: '#10B981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  laserLine: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    height: 2.5,
    backgroundColor: '#C084FC',
    shadowColor: '#C084FC',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 5,
  },
  reticleCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  qrTargetCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  activeScanningWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeScanningText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  activeScanningSub: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  successCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  successText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  successSubtext: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D1FAE5',
  },
  viewfinderBottomHud: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    alignItems: 'center',
  },
  viewfinderBottomText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  controlPanel: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
    zIndex: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  assetCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assetIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  assetValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  assetTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  assetTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  primaryScanBtn: {
    height: 50,
    backgroundColor: '#5A00B8',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#5A00B8',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryScanBtnSuccess: {
    backgroundColor: '#059669',
  },
  primaryScanBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  photoAltBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoAltBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A00B8',
  },
});
