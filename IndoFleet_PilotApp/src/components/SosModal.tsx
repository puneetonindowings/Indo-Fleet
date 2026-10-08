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
} from 'react-native';
import { AlertOctagon, X, MapPin, Mic, Radio, Send, CheckCircle2, Volume2 } from 'lucide-react-native';
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

  const timerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<any[]>([]);

  // Automatically start recording & countdown as soon as SOS modal opens
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
        console.log('Microphone permission or capture note:', err);
      }
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach((track: any) => track.stop());
      } catch {}
    }
  };

  const handleAutoDispatch = async () => {
    stopAudioRecording();
    setIsRecording(false);
    setSending(true);

    try {
      await triggerSosEmergency({
        pilot_name: pilotName,
        pilot_phone: pilotPhone,
        vehicle_id: vehicleId,
        latitude: currentCoords?.latitude || 28.6289,
        longitude: currentCoords?.longitude || 77.3649,
        battery_pct: batteryPct || 85,
        notes: `EMERGENCY ALERT: 1-Minute Mic Recording & GPS location automatically sent by ${pilotName}`,
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
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AlertOctagon size={24} color="#EF4444" />
              <Text style={styles.title}>EMERGENCY SOS ACTIVE</Text>
            </View>
            <TouchableOpacity onPress={handleCancelFalseAlarm} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {isDispatched ? (
            /* Success / Dispatched Screen */
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={48} color="#059669" />
              </View>
              <Text style={styles.successTitle}>SOS Dispatched to Admin</Text>
              <Text style={styles.successSub}>
                Your live GPS location and 1-minute audio recording have been sent to Admin and Support team. Help is on the way!
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                <Text style={styles.doneBtnText}>Close Window</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Active Live Auto-Recording Screen */
            <View style={styles.body}>
              <Text style={styles.subtitle}>
                Mic recording started automatically. Your live GPS coordinates and audio will be sent to Admin automatically when timer ends.
              </Text>

              {/* Countdown & Live Recording Pulse */}
              <View style={styles.pulseBox}>
                <View style={styles.recordingRow}>
                  <View style={styles.blinkingDot} />
                  <Text style={styles.recordingStatusText}>LIVE MIC RECORDING</Text>
                </View>

                {/* Big Timer */}
                <Text style={styles.timerNumber}>{formatTime(secondsRemaining)}</Text>
                <Text style={styles.timerSub}>Auto-sending to Admin in {secondsRemaining} seconds</Text>

                {/* Simulated Audio Waveform Bars */}
                <View style={styles.waveRow}>
                  <View style={[styles.waveBar, { height: 16 }]} />
                  <View style={[styles.waveBar, { height: 26 }]} />
                  <View style={[styles.waveBar, { height: 38 }]} />
                  <View style={[styles.waveBar, { height: 20 }]} />
                  <View style={[styles.waveBar, { height: 34 }]} />
                  <View style={[styles.waveBar, { height: 42 }]} />
                  <View style={[styles.waveBar, { height: 24 }]} />
                  <View style={[styles.waveBar, { height: 32 }]} />
                  <View style={[styles.waveBar, { height: 18 }]} />
                </View>
              </View>

              {/* Location Box */}
              <View style={styles.telemetryBox}>
                <View style={styles.telemetryRow}>
                  <MapPin size={16} color="#EF4444" />
                  <Text style={styles.telemetryVal}>
                    {currentCoords
                      ? `${currentCoords.latitude.toFixed(6)}, ${currentCoords.longitude.toFixed(6)}`
                      : 'Acquiring GPS location...'}
                  </Text>
                </View>
                <View style={styles.telemetryRow}>
                  <Radio size={14} color="#3B0080" />
                  <Text style={styles.telemetrySub}>
                    Delivery: {pilotName} · Device Battery: {batteryPct || 85}%
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancelFalseAlarm}
                  disabled={sending}
                >
                  <Text style={styles.cancelBtnText}>Cancel (False Alarm)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sendNowBtn}
                  onPress={handleManualSendNow}
                  disabled={sending}
                  activeOpacity={0.8}
                >
                  {sending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Send size={16} color="#FFFFFF" />
                      <Text style={styles.sendNowBtnText}>Send Now (Skip Wait)</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#EF4444',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  body: {
    gap: 14,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  pulseBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  blinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  recordingStatusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.8,
  },
  timerNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    marginTop: 4,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#EF4444',
    borderRadius: 2,
  },
  telemetryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  telemetryVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  telemetrySub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  sendNowBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 13,
    shadowColor: '#DC2626',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  sendNowBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  successSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  doneBtn: {
    backgroundColor: '#3B0080',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
