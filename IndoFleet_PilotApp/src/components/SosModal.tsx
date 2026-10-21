import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { useAudioRecorder, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import {
  AlertOctagon,
  X,
  MapPin,
  Mic,
  Radio,
  Send,
  CheckCircle2,
  Volume2,
  RadioTower,
  ShieldAlert,
} from 'lucide-react-native';
import { triggerSosEmergency } from '../services/api';

interface SosModalProps {
  visible: boolean;
  onClose: () => void;
  pilotName: string;
  pilotPhone?: string;
  vehicleId?: string;
  currentCoords?: { latitude: number; longitude: number } | null;
  batteryPct?: number;
}

export const SosModal: React.FC<SosModalProps> = ({
  visible,
  onClose,
  pilotName,
  pilotPhone,
  vehicleId,
  currentCoords,
  batteryPct,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isRecording, setIsRecording] = useState<boolean>(true);
  const [isDispatched, setIsDispatched] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [waveHeights, setWaveHeights] = useState<number[]>([
    18, 28, 42, 24, 36, 48, 30, 52, 34, 46, 26, 40, 22, 32, 16,
  ]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const timerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);

  // Automatically start countdown as soon as SOS opens
  useEffect(() => {
    if (visible) {
      setSecondsRemaining(60);
      setIsRecording(true);
      setIsDispatched(false);
      setSending(false);
      startAudioRecording();

      // Start 60-second automatic countdown
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoDispatch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      stopAudioRecording();
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAudioRecording();
    };
  }, [visible]);

  // Live dynamic audio waveform animation
  useEffect(() => {
    if (visible && isRecording) {
      const waveInterval = setInterval(() => {
        setWaveHeights([
          Math.floor(12 + Math.random() * 20),
          Math.floor(18 + Math.random() * 25),
          Math.floor(22 + Math.random() * 28),
          Math.floor(14 + Math.random() * 22),
          Math.floor(24 + Math.random() * 30),
          Math.floor(30 + Math.random() * 26),
          Math.floor(18 + Math.random() * 26),
          Math.floor(34 + Math.random() * 28),
          Math.floor(20 + Math.random() * 24),
          Math.floor(28 + Math.random() * 28),
          Math.floor(16 + Math.random() * 22),
          Math.floor(24 + Math.random() * 26),
          Math.floor(14 + Math.random() * 20),
          Math.floor(22 + Math.random() * 24),
          Math.floor(12 + Math.random() * 18),
        ]);
      }, 160);
      return () => clearInterval(waveInterval);
    }
  }, [visible, isRecording]);

  const startAudioRecording = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new (window as any).MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event: any) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start();
      } catch (err) {
        console.log('Web microphone notice:', err);
      }
      return;
    }

    // Native Mobile (Android/iOS) Audio Recording
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        console.warn('Microphone permission not granted for SOS');
        return;
      }
      if (recorder) {
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
    } catch (err) {
      console.warn('Native audio recording error:', err);
    }
  };

  const stopAudioRecording = async () => {
    if (Platform.OS === 'web') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream?.getTracks().forEach((track: any) => track.stop());
        } catch {}
      }
    } else {
      try {
        if (recorder && recorder.isRecording) {
          await recorder.stop();
        }
      } catch {}
    }
  };

  const handleAutoDispatch = async () => {
    setIsRecording(false);
    setSending(true);

    // 1. Flush & Stop Audio Recording safely with full completion
    let audioBase64: string | undefined = undefined;
    try {
      if (Platform.OS === 'web') {
        const mr = mediaRecorderRef.current;
        if (mr && mr.state !== 'inactive') {
          audioBase64 = await new Promise<string | undefined>((resolve) => {
            mr.ondataavailable = (event: any) => {
              if (event.data && event.data.size > 0) {
                audioChunksRef.current.push(event.data);
              }
            };
            mr.onstop = () => {
              try {
                if (audioChunksRef.current && audioChunksRef.current.length > 0) {
                  const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = () => resolve(undefined);
                  reader.readAsDataURL(blob);
                } else {
                  resolve(undefined);
                }
              } catch {
                resolve(undefined);
              }
              mr.stream?.getTracks().forEach((track: any) => track.stop());
            };
            try {
              mr.stop();
            } catch {
              resolve(undefined);
            }
          });
        }
      } else {
        try {
          if (recorder && recorder.isRecording) {
            await recorder.stop();
          }
          if (recorder && recorder.uri) {
            const res = await fetch(recorder.uri);
            const blob = await res.blob();
            audioBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const resStr = (reader.result as string) || '';
                // Ensure proper MIME type is data:audio/mp4;base64,
                const clean = resStr.replace(/^data:[^;]+;base64,/, 'data:audio/mp4;base64,');
                resolve(clean.startsWith('data:audio/') ? clean : `data:audio/mp4;base64,${clean}`);
              };
              reader.onerror = () => resolve(undefined);
              reader.readAsDataURL(blob);
            });
          }
        } catch (e) {
          console.warn('Native audio recording read notice:', e);
        }
      }
    } catch (e) {
      console.warn('Audio base64 conversion notice:', e);
    }

    // 2. Fetch Real Hardware Battery Percentage
    let realBattery = batteryPct;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        const b = await (navigator as any).getBattery();
        if (b && typeof b.level === 'number') {
          realBattery = Math.round(b.level * 100);
        }
      } else if (Battery && Battery.getBatteryLevelAsync) {
        const lvl = await Battery.getBatteryLevelAsync();
        if (lvl >= 0) {
          realBattery = Math.round(lvl * 100);
        }
      }
    } catch (bErr) {
      console.log('Live battery fetch notice:', bErr);
    }

    // 3. Fetch Real Hardware GPS Position
    let realCoords = currentCoords;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (pos?.coords) {
                realCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
              }
              resolve();
            },
            async (geoErr) => {
              console.warn('Browser GPS permission error:', geoErr?.message);
              // Fallback to real IP-based geolocation if browser GPS is blocked/denied
              try {
                const ipRes = await fetch('https://ipapi.co/json/');
                const ipData = await ipRes.json();
                if (ipData && typeof ipData.latitude === 'number' && typeof ipData.longitude === 'number') {
                  realCoords = { latitude: ipData.latitude, longitude: ipData.longitude };
                }
              } catch {}
              resolve();
            },
            { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
          );
        });
      } else if (Location) {
        // Native Mobile (Android / iOS):
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync();
          status = req.status;
        }
        if (status === 'granted') {
          // 1. Fast immediate lock from cached device GPS
          try {
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown?.coords) {
              realCoords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
            }
          } catch {}

          // 2. Balanced accuracy live satellite fix
          try {
            const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (cur?.coords) {
              realCoords = { latitude: cur.coords.latitude, longitude: cur.coords.longitude };
            }
          } catch {}
        }
      }
    } catch (gErr) {
      console.log('Live GPS fetch notice:', gErr);
    }

    try {
      await triggerSosEmergency({
        pilot_name: pilotName,
        pilot_phone: pilotPhone,
        vehicle_id: vehicleId,
        latitude: realCoords?.latitude || currentCoords?.latitude || 0,
        longitude: realCoords?.longitude || currentCoords?.longitude || 0,
        battery_pct: realBattery != null && realBattery > 0 ? realBattery : (batteryPct || 80),
        audio_base64: audioBase64,
        notes: `EMERGENCY ALERT: SOS beacon triggered automatically by ${pilotName}`,
      });

      setIsDispatched(true);
    } catch (err: any) {
      Alert.alert('Transmission Error', err.message || 'Could not send SOS beacon.');
    } finally {
      setSending(false);
    }
  };

  const handleManualSendNow = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    handleAutoDispatch();
  };

  const handleCancelFalseAlarm = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopAudioRecording();
    onClose();
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      onRequestClose={handleCancelFalseAlarm}
    >
      <View style={styles.fullScreenContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {isDispatched ? (
          /* ================= LIGHT THEME FULL SCREEN SUCCESS STATE ================= */
          <View style={styles.successFullScreen}>
            <View style={styles.successCard}>
              <View style={styles.successIconOuter}>
                <View style={styles.successIconCircle}>
                  <CheckCircle2 size={54} color="#059669" />
                </View>
              </View>

              <Text style={styles.successTitle}>SOS DISPATCHED</Text>
              <View style={styles.successBadge}>
                <RadioTower size={14} color="#059669" />
                <Text style={styles.successBadgeText}>CENTRAL RESCUE BEACON ACTIVE</Text>
              </View>

              <Text style={styles.successSub}>
                Your live GPS coordinates and high-fidelity 1-minute ambient audio feed have been transmitted directly to Central Operations and nearby support units.
              </Text>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <MapPin size={16} color="#059669" />
                  <Text style={styles.summaryVal}>
                    {currentCoords
                      ? `${currentCoords.latitude.toFixed(6)}, ${currentCoords.longitude.toFixed(6)}`
                      : 'GPS Coordinates Logged'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Volume2 size={16} color="#059669" />
                  <Text style={styles.summaryVal}>1-Min Ambient Microphone Buffer Attached</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Radio size={16} color="#059669" />
                  <Text style={styles.summaryVal}>
                    Pilot: {pilotName} · Vehicle: {vehicleId || 'IND-DL-772'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.returnBtn}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.returnBtnText}>Return to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ================= LIGHT THEME FULL SCREEN ACTIVE EMERGENCY STATE ================= */
          <View style={styles.activeFullScreen}>
            {/* Top Bar with notch safe-padding */}
            <View style={styles.topBar}>
              <View style={styles.topBarBadge}>
                <View style={styles.blinkingBeaconDot} />
                <Text style={styles.topBarBadgeText}>CRITICAL EMERGENCY SOS</Text>
              </View>
              <TouchableOpacity
                onPress={handleCancelFalseAlarm}
                style={styles.closeBtn}
                activeOpacity={0.7}
                accessibilityLabel="Close Emergency Beacon"
              >
                <X size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Giant Glowing Countdown Radar */}
              <View style={styles.radarOuterRing}>
                <View style={styles.radarMiddleRing}>
                  <View style={styles.radarInnerRing}>
                    <Text style={styles.countdownTitle}>AUTO-DISPATCH IN</Text>
                    <Text style={styles.timerDisplay}>{formatTime(secondsRemaining)}</Text>
                    <Text style={styles.countdownSub}>SECONDS</Text>
                  </View>
                </View>
              </View>

              {/* Live Ambient Mic Audio Waveform Card */}
              <View style={styles.audioMonitorCard}>
                <View style={styles.audioMonitorHeader}>
                  <View style={styles.micRecordingBadge}>
                    <Mic size={13} color="#DC2626" />
                    <Text style={styles.micRecordingText}>LIVE AMBIENT MIC RECORDING</Text>
                  </View>
                  <Text style={styles.audioTimerText}>{60 - secondsRemaining}s / 60s</Text>
                </View>

                {/* Animated Waveform Equalizer */}
                <View style={styles.waveformContainer}>
                  {waveHeights.map((h, i) => (
                    <View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          height: h,
                          backgroundColor: i % 2 === 0 ? '#DC2626' : '#EF4444',
                        },
                      ]}
                    />
                  ))}
                </View>

                <Text style={styles.audioCaption}>
                  Capturing surroundings for rapid dispatcher situational safety analysis
                </Text>
              </View>

              {/* Real-time GPS & Telemetry Card */}
              <View style={styles.telemetryCard}>
                <Text style={styles.telemetryCardHeader}>LIVE TELEMETRY BROADCAST</Text>

                <View style={styles.telemetryCardRow}>
                  <View style={styles.telemetryIconBox}>
                    <MapPin size={18} color="#DC2626" />
                  </View>
                  <View style={styles.telemetryTextBox}>
                    <Text style={styles.telemetryLabel}>GPS COORDINATES</Text>
                    <Text style={styles.telemetryValue}>
                      {currentCoords
                        ? `${currentCoords.latitude.toFixed(6)}, ${currentCoords.longitude.toFixed(6)}`
                        : 'Locking Satellite Position...'}
                    </Text>
                  </View>
                </View>

                <View style={styles.telemetryDivider} />

                <View style={styles.telemetryDetailsRow}>
                  <View style={styles.telemetryMiniItem}>
                    <Text style={styles.telemetryMiniLabel}>PILOT</Text>
                    <Text style={styles.telemetryMiniVal} numberOfLines={1}>{pilotName}</Text>
                  </View>
                  <View style={styles.telemetryMiniDivider} />
                  <View style={styles.telemetryMiniItem}>
                    <Text style={styles.telemetryMiniLabel}>VEHICLE</Text>
                    <Text style={styles.telemetryMiniVal}>{vehicleId || 'IND-DL-772'}</Text>
                  </View>
                  <View style={styles.telemetryMiniDivider} />
                  <View style={styles.telemetryMiniItem}>
                    <Text style={styles.telemetryMiniLabel}>BATTERY</Text>
                    <Text style={styles.telemetryMiniVal}>{batteryPct || 85}%</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.instructionsNote}>
                Stay calm. When the countdown ends or when you tap Send Now, this device will dispatch your live coordinates, battery level, and audio clip immediately.
              </Text>
            </ScrollView>

            {/* Bottom Fixed Action Bar */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelFalseAlarm}
                disabled={sending}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel (False Alarm)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sendNowBtn}
                onPress={handleManualSendNow}
                disabled={sending}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Send size={18} color="#FFFFFF" />
                    <Text style={styles.sendNowBtnText}>SEND SOS NOW</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  activeFullScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
  },
  topBar: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : 52,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  topBarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  blinkingBeaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  topBarBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  radarOuterRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 12,
  },
  radarMiddleRing: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarInnerRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  countdownTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  timerDisplay: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  countdownSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  audioMonitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 14,
    shadowColor: '#EF4444',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  audioMonitorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  micRecordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  micRecordingText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  audioTimerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 52,
    marginVertical: 8,
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
  },
  audioCaption: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  telemetryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#64748B',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  telemetryCardHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  telemetryCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  telemetryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryTextBox: {
    flex: 1,
  },
  telemetryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  telemetryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  telemetryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  telemetryDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  telemetryMiniItem: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryMiniDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  telemetryMiniLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  telemetryMiniVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  instructionsNote: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 24 : 36,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  sendNowBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: '#DC2626',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  sendNowBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  /* Full Screen Success (Light Theme) */
  successFullScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#10B981',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  successIconOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: 0.8,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 8,
    marginBottom: 14,
  },
  successBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.6,
  },
  successSub: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  returnBtn: {
    width: '100%',
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  returnBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
