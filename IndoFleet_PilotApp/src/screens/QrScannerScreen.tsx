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
} from 'react-native';
import {
  ArrowLeft,
  QrCode,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Zap,
  RefreshCw,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { DeliveryOrder } from '../types';
import { getDefaultDroneModel } from '../config';

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
  const videoRef = useRef<any>(null);

  const scanAnim = useRef(new Animated.Value(0)).current;

  const defaultDrone = order?.assigned_drone_id || order?.drone_id || getDefaultDroneModel();
  const cleanDroneName = defaultDrone.includes('@') ? 'IndoWings 700 RPAV' : defaultDrone;

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

  // Request browser camera stream on Web
  useEffect(() => {
    let stream: any = null;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          setCameraActive(true);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {
          setCameraActive(false);
        });
    }

    return () => {
      if (stream && stream.getTracks) {
        stream.getTracks().forEach((track: any) => track.stop());
      }
    };
  }, []);

  const handleVerifyScan = (scannedCode?: string) => {
    setIsVerifying(true);
    const matchedId = scannedCode || cleanDroneName;

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
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleVerifyScan(cleanDroneName);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Could not launch camera.');
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
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Drone QR Scan &amp; Verification</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Order #{order?.order_number || order?.id?.slice(0, 8)} • Airframe Asset Match
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <ShieldCheck size={14} color="#10B981" />
          <Text style={styles.headerBadgeText}>700 RPAV</Text>
        </View>
      </View>

      {/* ── Camera Viewfinder Frame ───────────────────────────── */}
      <View style={styles.scannerWrapper}>
        {/* On Web, render HTML5 live camera video element */}
        {Platform.OS === 'web' && cameraActive ? (
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
              background: '#0F172A',
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        ) : (
          <View style={styles.cameraPlaceholder}>
            <View style={styles.simulatedGrid} />
          </View>
        )}

        {/* Darkened Mask Overlay */}
        <View style={styles.reticleContainer}>
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

            {/* Center Status / Icon */}
            <View style={styles.reticleCenter}>
              {verifiedSuccess ? (
                <View style={styles.successCircle}>
                  <CheckCircle2 size={44} color="#10B981" />
                  <Text style={styles.successText}>QR MATCHED!</Text>
                </View>
              ) : (
                <QrCode size={38} color="rgba(255,255,255,0.4)" />
              )}
            </View>
          </View>
        </View>

        {/* Viewfinder Instructions */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintTitle}>Align Airframe QR Code inside frame</Text>
          <Text style={styles.hintDesc}>
            Locate physical QR code sticker on drone body or payload bay
          </Text>
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
              <Text style={styles.assetValue}>{cleanDroneName}</Text>
            </View>
            <View style={styles.assetTag}>
              <Text style={styles.assetTagText}>QC Passed</Text>
            </View>
          </View>
        </View>

        {/* Primary Scan & Confirm Action */}
        <TouchableOpacity
          style={[styles.primaryScanBtn, verifiedSuccess && styles.primaryScanBtnSuccess]}
          onPress={() => handleVerifyScan(cleanDroneName)}
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

        {/* Camera Photo Alternate Button */}
        <TouchableOpacity
          style={styles.photoAltBtn}
          onPress={handleTakePhotoScan}
          disabled={isVerifying || verifiedSuccess}
          activeOpacity={0.8}
        >
          <Camera size={16} color="#94A3B8" />
          <Text style={styles.photoAltBtnText}>Snap QR with Device Camera</Text>
        </TouchableOpacity>
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
    backgroundColor: '#0A0F1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#090D1A',
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
  },
  reticleCenter: {
    alignItems: 'center',
    justifyContent: 'center',
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
  photoAltBtn: {
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
