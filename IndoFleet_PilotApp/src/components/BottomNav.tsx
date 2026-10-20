import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import {
  Home,
  MapPin,
  AlertOctagon,
  User,
  Clock,
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
            color={activeScreen === 'dashboard' ? '#5A00B8' : '#64748B'}
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
        {activeScreen === 'dashboard' ? <View style={styles.activeDot} /> : null}
      </TouchableOpacity>

      {/* 2. History Tab */}
      <TouchableOpacity
        style={styles.navTab}
        onPress={() => onNavigate('history')}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, activeScreen === 'history' && styles.iconWrapActive]}>
          <Clock
            size={20}
            color={activeScreen === 'history' ? '#5A00B8' : '#64748B'}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            activeScreen === 'history' && styles.tabLabelActive,
          ]}
        >
          History
        </Text>
        {activeScreen === 'history' ? <View style={styles.activeDot} /> : null}
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

      {/* 4. Map Tab */}
      <TouchableOpacity
        style={styles.navTab}
        onPress={() => onNavigate('radar')}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, activeScreen === 'radar' && styles.iconWrapActive]}>
          <MapPin
            size={20}
            color={activeScreen === 'radar' ? '#5A00B8' : '#64748B'}
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
        {activeScreen === 'radar' ? <View style={styles.activeDot} /> : null}
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
            color={activeScreen === 'profile' ? '#5A00B8' : '#64748B'}
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
        {activeScreen === 'profile' ? <View style={styles.activeDot} /> : null}
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    height: 72,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'android' ? 14 : 22,
    borderRadius: 36,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 54,
  },
  iconWrap: {
    width: 48,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  iconWrapActive: {
    backgroundColor: '#F3E8FF',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#5A00B8',
    fontWeight: '800',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5A00B8',
    marginTop: 2,
  },
  centerSosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    marginTop: -26,
  },
  sosButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
  },
  sosInnerGlow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: -2,
  },
});
