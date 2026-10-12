import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, HelpCircle } from 'lucide-react-native';

interface NotFoundScreenProps {
  onNavigate: (screen: string) => void;
}

export const NotFoundScreen: React.FC<NotFoundScreenProps> = ({ onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ERROR 404</Text>
        </View>

        <Text style={styles.errorCode}>404</Text>

        <Text style={styles.title}>Screen Not Found</Text>
        <Text style={styles.desc}>
          The page or screen you are looking for doesn&apos;t exist or has been moved.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => onNavigate('dashboard')}
          activeOpacity={0.85}
        >
          <Home size={16} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => onNavigate('support')}
          activeOpacity={0.7}
        >
          <HelpCircle size={16} color="#3B0080" />
          <Text style={styles.secondaryBtnText}>Help &amp; Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3B0080',
    letterSpacing: 0.5,
  },
  errorCode: {
    fontSize: 56,
    fontWeight: '900',
    color: '#3B0080',
    letterSpacing: -1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  desc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B0080',
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 16,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B0080',
  },
});
