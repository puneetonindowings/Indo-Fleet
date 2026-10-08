import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import {
  Home,
  MapPin,
  AlertOctagon,
  HelpCircle,
  User,
} from 'lucide-react-native';

interface BottomNavProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  onTriggerSos: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeScreen,
  onNavigate,
  onTriggerSos,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Home / Dashboard Tab */}
      <TouchableOpacity
        style={styles.navTab}
        onPress={() => onNavigate('dashboard')}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, activeScreen === 'dashboard' && styles.iconWrapActive]}>
          <Home
            size={20}
            color={activeScreen === 'dashboard' ? '#3B0080' : '#64748B'}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            activeScreen === 'dashboard' && styles.tabLabelActive,
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* 2. Map Tab */}
      <TouchableOpacity
        style={styles.navTab}
        onPress={() => onNavigate('radar')}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, activeScreen === 'radar' && styles.iconWrapActive]}>
          <MapPin
            size={20}
            color={activeScreen === 'radar' ? '#3B0080' : '#64748B'}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            activeScreen === 'radar' && styles.tabLabelActive,
          ]}
        >
          Map
        </Text>
      </TouchableOpacity>

      {/* 3. Center Floating SOS Button */}
      <View style={styles.centerSosContainer}>
        <TouchableOpacity
          style={styles.sosButton}
          onPress={onTriggerSos}
          activeOpacity={0.85}
        >
          <View style={styles.sosInnerGlow}>
            <AlertOctagon size={24} color="#FFFFFF" />
            <Text style={styles.sosText}>SOS</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 4. Help Tab */}
      <TouchableOpacity
        style={styles.navTab}
        onPress={() => onNavigate('support')}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, activeScreen === 'support' && styles.iconWrapActive]}>
          <HelpCircle
            size={20}
            color={activeScreen === 'support' ? '#3B0080' : '#64748B'}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            activeScreen === 'support' && styles.tabLabelActive,
          ]}
        >
          Help
        </Text>
      </TouchableOpacity>

      {/* 5. Profile Tab */}
      <TouchableOpacity
        style={styles.navTab}
        onPress={() => onNavigate('profile')}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, activeScreen === 'profile' && styles.iconWrapActive]}>
          <User
            size={20}
            color={activeScreen === 'profile' ? '#3B0080' : '#64748B'}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            activeScreen === 'profile' && styles.tabLabelActive,
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 8,
    height: 64,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
    position: 'relative',
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    width: 34,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  iconWrapActive: {
    backgroundColor: '#EDE9FE',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#3B0080',
    fontWeight: '800',
  },
  centerSosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    top: -14, // Floating slightly above the bottom bar
  },
  sosButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  sosInnerGlow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: -2,
  },
});
