import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Server, User, CheckCircle2, XCircle, RefreshCw, X } from 'lucide-react-native';
import { getServerUrl, setServerUrl, getPilotName, setPilotName, DEFAULT_SERVER_URL } from '../config';
import { checkServerHealth } from '../services/api';

interface ServerSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const [url, setUrl] = useState('');
  const [pilot, setPilot] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    const currentUrl = await getServerUrl();
    const currentPilot = await getPilotName();
    setUrl(currentUrl);
    setPilot(currentPilot);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await checkServerHealth(url.trim());
    setTesting(false);
    setTestResult(result);
  };

  const handleSave = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Server URL cannot be empty.');
      return;
    }
    await setServerUrl(url.trim());
    await setPilotName(pilot.trim() || 'Pilot-1');
    onSaved();
    onClose();
  };

  const handleResetDefault = () => {
    setUrl(DEFAULT_SERVER_URL);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <Server size={22} color="#8B5CF6" />
              <Text style={styles.title}>Delivery & Server Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.instruction}>
            Enter the IndoFleet backend API endpoint. Use local Wi-Fi IP for direct mobile testing or production URL.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>SERVER BACKEND URL</Text>
            <View style={styles.inputContainer}>
              <Server size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={url}
                onChangeText={setUrl}
                placeholder="http://192.168.x.x:5000"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.quickLinks}>
              <TouchableOpacity onPress={handleResetDefault} style={styles.quickLinkBtn}>
                <Text style={styles.quickLinkText}>Use Default LAN IP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setUrl('http://10.0.2.2:5000')}
                style={styles.quickLinkBtn}
              >
                <Text style={styles.quickLinkText}>Android Emulator</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>DELIVERY CALLSIGN / ID</Text>
            <View style={styles.inputContainer}>
              <User size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={pilot}
                onChangeText={setPilot}
                placeholder="e.g. Delivery Partner 01"
                placeholderTextColor="#64748B"
              />
            </View>
          </View>

          {testResult && (
            <View
              style={[
                styles.testResultBox,
                testResult.ok ? styles.testSuccessBox : styles.testErrorBox,
              ]}
            >
              {testResult.ok ? (
                <CheckCircle2 size={18} color="#10B981" />
              ) : (
                <XCircle size={18} color="#EF4444" />
              )}
              <Text
                style={[
                  styles.testResultText,
                  testResult.ok ? styles.testSuccessText : styles.testErrorText,
                ]}
              >
                {testResult.message}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestConnection}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <>
                  <RefreshCw size={16} color="#8B5CF6" />
                  <Text style={styles.testBtnText}>Test Ping</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save & Sync</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 4,
  },
  instruction: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    color: '#F8FAFC',
    fontSize: 14,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  quickLinkBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  quickLinkText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  testSuccessBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
  },
  testErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
  },
  testResultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  testSuccessText: {
    color: '#10B981',
  },
  testErrorText: {
    color: '#EF4444',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  testBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  testBtnText: {
    color: '#8B5CF6',
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
