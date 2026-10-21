import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, Easing } from 'react-native';
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

const ACTIVE = '#5A00B8';
const INACTIVE = '#64748B';

const TABS = [
  { key: 'dashboard', label: 'Home', icon: Home },
  { key: 'history', label: 'History', icon: Clock },
  { key: 'radar', label: 'Map', icon: MapPin },
  { key: 'profile', label: 'Profile', icon: User },
] as const;

type Tab = (typeof TABS)[number];

/* ── Single tab with an animated pill, icon cross-fade and press spring ────── */
const TabButton: React.FC<{ tab: Tab; active: boolean; onPress: () => void }> = ({
  tab,
  active,
  onPress,
}) => {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: active ? 1 : 0,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [active, progress]);

  const springTo = (value: number) =>
    Animated.spring(press, {
      toValue: value,
      friction: 6,
      tension: 220,
      useNativeDriver: true,
    }).start();

  const Icon = tab.icon;

  return (
    <Pressable
      style={styles.navTab}
      onPress={onPress}
      onPressIn={() => springTo(0.9)}
      onPressOut={() => springTo(1)}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: press }] }}>
        <View style={styles.iconWrap}>
          {/* Purple pill grows in behind the icon */}
          <Animated.View
            style={[
              styles.pill,
              {
                opacity: progress,
                transform: [
                  { scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                  { scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                ],
              },
            ]}
          />
          {/* Grey icon fades out while the purple one fades in */}
          <Animated.View style={[styles.iconLayer, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
            <Icon size={20} color={INACTIVE} />
          </Animated.View>
          <Animated.View
            style={[
              styles.iconLayer,
              {
                opacity: progress,
                transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [3, 0] }) }],
              },
            ]}
          >
            <Icon size={20} color={ACTIVE} />
          </Animated.View>
        </View>

        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>

        <Animated.View
          style={[
            styles.activeDot,
            {
              opacity: progress,
              transform: [{ scale: progress }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

export const BottomNav: React.FC<BottomNavProps> = ({
  activeScreen,
  onNavigate,
  onTriggerSos,
}) => {
  // SOS: soft pulsing ring + press spring
  const pulse = useRef(new Animated.Value(0)).current;
  const sosPress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const sosSpring = (value: number) =>
    Animated.spring(sosPress, {
      toValue: value,
      friction: 6,
      tension: 220,
      useNativeDriver: true,
    }).start();

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {left.map((tab) => (
        <TabButton
          key={tab.key}
          tab={tab}
          active={activeScreen === tab.key}
          onPress={() => onNavigate(tab.key)}
        />
      ))}

      {/* Center floating SOS button */}
      <View style={styles.centerSosContainer}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sosPulse,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
            },
          ]}
        />
        <Animated.View style={{ transform: [{ scale: sosPress }] }}>
          <Pressable
            style={styles.sosButton}
            onPress={onTriggerSos}
            onPressIn={() => sosSpring(0.92)}
            onPressOut={() => sosSpring(1)}
            accessibilityRole="button"
            accessibilityLabel="Trigger SOS emergency alert"
          >
            <View style={styles.sosInnerGlow}>
              <AlertOctagon size={24} color="#FFFFFF" />
              <Text style={styles.sosText}>SOS</Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>

      {right.map((tab) => (
        <TabButton
          key={tab.key}
          tab={tab}
          active={activeScreen === tab.key}
          onPress={() => onNavigate(tab.key)}
        />
      ))}
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
  },
  pill: {
    position: 'absolute',
    width: 48,
    height: 34,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
  },
  iconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: INACTIVE,
    marginTop: 2,
  },
  tabLabelActive: {
    color: ACTIVE,
    fontWeight: '800',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACTIVE,
    marginTop: 2,
  },
  centerSosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    marginTop: -26,
  },
  sosPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
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