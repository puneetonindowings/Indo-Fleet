import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Headphones,
  Phone,
  Mail,
  Send,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { UserProfile } from '../types';
import { submitSupportTicket } from '../services/api';

interface SupportScreenProps {
  user: UserProfile | null;
}

export const SupportScreen: React.FC<SupportScreenProps> = ({ user }) => {
  const [category, setCategory] = useState('Delivery Route Issue');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    'Delivery Route Issue',
    'Customer Address Unreachable',
    'Vehicle / Battery Issue',
    'OTP / Handover Problem',
    'App / Connectivity Problem',
  ];

  const handleCallHotline = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleSubmitTicket = async () => {
    if (!message.trim()) {
      Alert.alert('Message Required', 'Please describe the support issue you are experiencing.');
      return;
    }

    setLoading(true);
    try {
      const res = await submitSupportTicket({
        pilot_id: user?.id || 'DELIVERY',
        pilot_name: user?.name || 'Delivery Partner',
        issue_category: category,
        priority,
        message: message.trim(),
      });

      setMessage('');
      Alert.alert(
        'Ticket Dispatched',
        `Support request #${res.ticket_id} submitted. The 24x7 IndoFleet Control Desk has been notified.`
      );
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Could not send support request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 24x7 Hotline Card */}
      <View style={styles.hotlineCard}>
        <View style={styles.hotlineHeader}>
          <Headphones size={22} color="#3B0080" />
          <View style={styles.hotlineTitleGroup}>
            <Text style={styles.hotlineTitle}>Support & Control Desk</Text>
            <Text style={styles.hotlineSub}>Instant Assistance & Operations Hotline</Text>
          </View>
        </View>

        <View style={styles.hotlineButtons}>
          <TouchableOpacity
            style={styles.hotlineBtn}
            onPress={() => handleCallHotline('+917669478937')}
            activeOpacity={0.8}
          >
            <Phone size={15} color="#10B981" />
            <Text style={styles.hotlineBtnText}>Dispatch Desk: +91 7669478937</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.hotlineBtn}
            onPress={() => handleCallHotline('18005727363')}
            activeOpacity={0.8}
          >
            <Phone size={15} color="#38BDF8" />
            <Text style={styles.hotlineBtnText}>Toll-Free Helpline: 1800 572 7363</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Support Ticket Form */}
      <View style={styles.ticketCard}>
        <Text style={styles.ticketCardTitle}>SUBMIT OPERATIONAL ASSISTANCE TICKET</Text>

        {/* Category Picker */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>ISSUE CATEGORY</Text>
          <View style={styles.categoryWrap}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  category === cat && styles.categoryPillActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Priority Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>SEVERITY / PRIORITY</Text>
          <View style={styles.priorityRow}>
            {(['normal', 'high', 'urgent'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityPill,
                  priority === p && (p === 'urgent' ? styles.urgentPill : styles.priorityPillActive),
                ]}
                onPress={() => setPriority(p)}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === p && styles.priorityTextActive,
                  ]}
                >
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Message Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>DETAILS & SITUATION DESCRIPTION</Text>
          <TextInput
            style={styles.textArea}
            value={message}
            onChangeText={setMessage}
            placeholder="Explain the operational issue or roadblock..."
            placeholderTextColor="#64748B"
            multiline={true}
            numberOfLines={4}
          />
        </View>

        {/* Submit Ticket */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmitTicket}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Send size={16} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>TRANSMIT TICKET TO GCS</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  hotlineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  hotlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  hotlineTitleGroup: {
    flex: 1,
  },
  hotlineTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#3B0080',
    letterSpacing: 0.5,
  },
  hotlineSub: {
    fontSize: 11,
    color: '#64748B',
  },
  hotlineButtons: {
    gap: 10,
  },
  hotlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hotlineBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  ticketCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#3B0080',
    letterSpacing: 0.8,
    marginBottom: 18,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
  },
  categoryText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#3B0080',
    fontWeight: '900',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priorityPillActive: {
    backgroundColor: '#3B0080',
    borderColor: '#3B0080',
  },
  urgentPill: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  priorityTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    fontSize: 14,
    padding: 14,
    height: 110,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B0080',
    borderRadius: 25,
    height: 52,
    marginTop: 8,
    shadowColor: '#3B0080',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
