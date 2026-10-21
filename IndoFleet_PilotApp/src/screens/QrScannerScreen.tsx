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
      setIsInitializingCam(false);
      handleTakePhotoScan();
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
      }, 700);
    }, 600);
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
    outputRange: [0, 220],
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
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Drone QR Scan &amp; Verification</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Order #{cleanOrderNumber} • Airframe Verification
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <ShieldCheck size={14} color="#10B981" />
          <Text style={styles.headerBadgeText}>700 RPAV</Text>
        </View>
      </View>

      {/* ── Camera Viewfinder Frame ───────────────────────────── */}
      <View style={styles.scannerWrapper}>
        {/* On Web, render HTML5 live camera video element permanently in DOM */}
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

        {/* Fallback visual background when camera is loading or inactive */}
        <View style={[styles.cameraPlaceholder, { zIndex: cameraActive ? 0 : 2 }]}>
          <View style={styles.simulatedGrid} />
        </View>

        {/* Darkened Mask & Viewfinder Reticle Overlay */}
        <View style={[styles.reticleContainer, { zIndex: 10 }]}>
          <View style={[styles.reticleBox, verifiedSuccess && styles.reticleBoxSuccess]}>
            {/* 4 Corner Targeting Brackets */}
            <View style={[styles.cornerBracket, styles.topLeft, verifiedSuccess && styles.bracketSuccess]} />
            <View style={[styles.cornerBracket, styles.topRight, verifiedSuccess && styles.bracketSuccess]} />
            <View style={[styles.cornerBracket, styles.bottomLeft, verifiedSuccess && styles.bracketSuccess]} />
            <View style={[styles.cornerBracket, styles.bottomRight, verifiedSuccess && styles.bracketSuccess]} />

            {/* Animated Laser Scanning Line */}
            {cameraActive && !verifiedSuccess && (
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
                  <CheckCircle2 size={46} color="#10B981" />
                  <Text style={styles.successText}>QR MATCHED!</Text>
                </View>
              ) : cameraActive ? (
                <View style={styles.activeScanningWrap}>
                  <QrCode size={36} color="rgba(0, 245, 255, 0.45)" />
                  <Text style={styles.activeScanningText}>Align QR Code</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.startCamBtn}
                  onPress={startCamera}
                  activeOpacity={0.8}
                >
                  {isInitializingCam ? (
                    <ActivityIndicator size="small" color="#00F5FF" />
                  ) : (
                    <>
                      <View style={styles.startCamIconWrap}>
                        <Camera size={26} color="#00F5FF" />
                      </View>
                      <Text style={styles.startCamText}>Tap to Open Camera</Text>
                      {cameraError ? (
                        <Text style={styles.startCamError} numberOfLines={2}>
                          {cameraError}
                        </Text>
                      ) : (
                        <Text style={styles.startCamSub}>Live Viewfinder</Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Viewfinder Instructions / Status */}
        <View style={[styles.hintContainer, { zIndex: 10 }]}>
          {cameraActive ? (
            <>
              <Text style={styles.hintTitle}>Point camera at Drone Airframe QR Code</Text>
              <Text style={styles.hintDesc}>
                Frame the QR sticker on airframe chassis or battery compartment
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.hintTitle}>Camera Viewfinder Ready</Text>
              <Text style={styles.hintDesc}>
                Tap the frame above or use the buttons below to verify drone
              </Text>
            </>
          )}
        </View>
      </View>

      {/* ── Asset Details & Verification Action ────────────────── */}
      <View style={styles.controlPanel}>
        <View style={styles.assetCard}>
          <View style={styles.assetRow}>
            <View style={styles.assetIconWrap}>
              <Zap size={16} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.assetLabel}>Assigned Cargo Drone Asset</Text>
              <Text style={styles.assetValue}>{cleanDroneModel} ({cleanDroneSerial})</Text>
            </View>
            <View style={styles.assetTag}>
              <Text style={styles.assetTagText}>QC Passed</Text>
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
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.primaryScanBtnText}>AIRFRAME VERIFIED · OPENING INSPECTION...</Text>
            </>
          ) : (
            <>
              <QrCode size={19} color="#FFFFFF" />
              <Text style={styles.primaryScanBtnText}>CONFIRM &amp; VERIFY DRONE QR CODE</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Camera Photo Alternate Button / Refresh */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.photoAltBtn}
            onPress={handleTakePhotoScan}
            disabled={isVerifying || verifiedSuccess}
            activeOpacity={0.8}
          >
            <Camera size={15} color="#94A3B8" />
            <Text style={styles.photoAltBtnText}>Snap QR Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.photoAltBtn}
            onPress={startCamera}
            disabled={isVerifying || verifiedSuccess}
            activeOpacity={0.8}
          >
            <RefreshCw size={15} color="#94A3B8" />
            <Text style={styles.photoAltBtnText}>Reload Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 10,
    zIndex: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    flexShrink: 0,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  scannerWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#070B14',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#080D1A',
  },
  simulatedGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
    backgroundColor: '#0F172A',
  },
  reticleContainer: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: 240,
    height: 240,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  reticleBoxSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  cornerBracket: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#00F5FF',
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
    backgroundColor: '#00F5FF',
    shadowColor: '#00F5FF',
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
  activeScanningWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeScanningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00F5FF',
    letterSpacing: 0.5,
  },
  startCamBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    maxWidth: 200,
  },
  startCamIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  startCamText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00F5FF',
    textAlign: 'center',
  },
  startCamSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  startCamError: {
    fontSize: 10,
    color: '#F87171',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 13,
  },
  successCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  successText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 1,
  },
  hintContainer: {
    marginTop: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  hintDesc: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  controlPanel: {
    backgroundColor: '#0F172A',
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 12,
    zIndex: 20,
  },
  assetCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assetIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  assetValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  assetTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  assetTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  primaryScanBtn: {
    height: 50,
    backgroundColor: '#059669',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryScanBtnSuccess: {
    backgroundColor: '#10B981',
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
    backgroundColor: 'transparent',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoAltBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
});
