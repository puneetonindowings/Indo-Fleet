import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';

import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { FirstTimePasswordModal } from './src/components/FirstTimePasswordModal';
import { AcceptOrderModal } from './src/components/AcceptOrderModal';
import { DispatcherHandoverModal } from './src/components/DispatcherHandoverModal';
import { CustomerDeliveryPodModal } from './src/components/CustomerDeliveryPodModal';
import { SosModal } from './src/components/SosModal';

import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FlightRadarScreen } from './src/screens/FlightRadarScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SupportScreen } from './src/screens/SupportScreen';

import {
  UserProfile,
  DeliveryOrder,
  PilotKpis,
  ChartData,
  TelemetryStats,
} from './src/types';

import {
  checkServerHealth,
  fetchPilotDashboard,
  updatePilotLocation,
} from './src/services/api';

import {
  startTracking,
  stopTracking,
  setLocationUpdateListener,
  calculateDistanceKm,
} from './src/services/locationTask';

import {
  getAuthToken,
  getUserProfile,
  setAuthToken,
  setUserProfile,
} from './src/config';

export default function App() {
  // Session & Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [activeScreen, setActiveScreen] = useState<string>('dashboard');

  // Modals
  const [sosModalOpen, setSosModalOpen] = useState<boolean>(false);

  // Active Order & Sortie Action Modals
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [acceptModalOpen, setAcceptModalOpen] = useState<boolean>(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState<boolean>(false);
  const [podModalOpen, setPodModalOpen] = useState<boolean>(false);

  // Dashboard & Telemetry State
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [kpis, setKpis] = useState<PilotKpis>({
    total_assigned: 0,
    total_delivered: 0,
    total_missed: 0,
    total_queue: 0,
    todays_total: 0,
    todays_assigned: 0,
    todays_delivered: 0,
    todays_missed: 0,
    todays_queue: 0,
    completion_rate: 0,
  });
  const [chartData, setChartData] = useState<ChartData>({
    weekly_trend: [
      { day: 'Mon', completed: 0, missed: 0 },
      { day: 'Tue', completed: 0, missed: 0 },
      { day: 'Wed', completed: 0, missed: 0 },
      { day: 'Thu', completed: 0, missed: 0 },
      { day: 'Fri', completed: 0, missed: 0 },
      { day: 'Sat', completed: 0, missed: 0 },
      { day: 'Sun', completed: 0, missed: 0 },
    ],
    hourly_active: [
      { time: '08:00', orders: 0 },
      { time: '11:00', orders: 0 },
      { time: '14:00', orders: 0 },
      { time: '17:00', orders: 0 },
      { time: '20:00', orders: 0 },
    ],
  });

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryStats>({
    packetsSent: 0,
    lastSyncTime: null,
    speedKmh: 0,
    altitudeM: 0,
    headingDeg: 0,
    batteryPct: 100,
    distanceRemainingKm: null,
    isSyncing: false,
    lastError: null,
  });

  const foregroundWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const activeOrderRef = useRef<DeliveryOrder | null>(null);
  activeOrderRef.current = selectedOrder;

  useEffect(() => {
    bootstrapApp();

    // Background location listener
    setLocationUpdateListener((data) => {
      if (data.success && data.payload) {
        handleIncomingTelemetry(data.payload);
      }
    });

    // Health ping loop every 20s
    const healthInterval = setInterval(() => {
      checkServer();
    }, 20000);

    return () => {
      clearInterval(healthInterval);
      stopTracking();
      if (foregroundWatcherRef.current) {
        foregroundWatcherRef.current.remove();
      }
    };
  }, []);

  const bootstrapApp = async () => {
    await checkServer();
    const token = await getAuthToken();
    const profile = await getUserProfile();

    if (token && profile) {
      setCurrentUser(profile);
      if (profile.must_change_password) {
        setMustChangePassword(true);
      }
      await loadDashboardData(profile.id);
    }
    await updateBatteryLevel();
  };

  const updateBatteryLevel = async () => {
    try {
      const level = await Battery.getBatteryLevelAsync();
      if (level >= 0) {
        setTelemetry((prev) => ({ ...prev, batteryPct: Math.round(level * 100) }));
      }
    } catch {}
  };

  const checkServer = async () => {
    const health = await checkServerHealth();
    setServerConnected(health.ok);
  };

  const loadDashboardData = async (pilotId?: string) => {
    try {
      setRefreshing(true);
      const data = await fetchPilotDashboard(pilotId || currentUser?.id);
      if (data.kpis) setKpis(data.kpis);
      if (data.chart_data) setChartData(data.chart_data);
      if (Array.isArray(data.active_orders)) {
        setOrders(data.active_orders);
        if (selectedOrder) {
          const updated = data.active_orders.find((o) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
    } catch (err: any) {
      console.log('Dashboard load error:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleIncomingTelemetry = (payload: any) => {
    setCurrentCoords({
      latitude: payload.latitude,
      longitude: payload.longitude,
    });

    let distRemaining: number | null = null;
    const active = activeOrderRef.current;
    if (active) {
      const targetLat = active.destination_location?.latitude || active.delivery_lat;
      const targetLng = active.destination_location?.longitude || active.delivery_lng;
      if (targetLat && targetLng) {
        distRemaining = calculateDistanceKm(
          payload.latitude,
          payload.longitude,
          targetLat,
          targetLng
        );
      }
    }

    setTelemetry((prev) => ({
      ...prev,
      packetsSent: prev.packetsSent + 1,
      lastSyncTime: new Date().toISOString(),
      speedKmh: payload.speed || 0,
      altitudeM: payload.altitude || 45,
      headingDeg: payload.heading || 0,
      batteryPct: payload.battery_pct != null ? payload.battery_pct : prev.batteryPct,
      distanceRemainingKm: distRemaining,
      lastError: null,
    }));
  };

  const startForegroundWatcher = async (orderId: string) => {
    if (foregroundWatcherRef.current) {
      foregroundWatcherRef.current.remove();
    }

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2500,
          distanceInterval: 2,
        },
        async (loc) => {
          let batteryPct = telemetry.batteryPct;
          try {
            const b = await Battery.getBatteryLevelAsync();
            if (b >= 0) batteryPct = Math.round(b * 100);
          } catch {}

          const payload = {
            order_id: orderId,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            altitude: loc.coords.altitude != null ? Math.round(loc.coords.altitude) : 45,
            speed: loc.coords.speed != null && loc.coords.speed >= 0 ? Math.round(loc.coords.speed * 3.6) : 0,
            heading: loc.coords.heading != null && loc.coords.heading >= 0 ? Math.round(loc.coords.heading) : 0,
            accuracy: loc.coords.accuracy != null ? Math.round(loc.coords.accuracy) : 5,
            battery_pct: batteryPct,
            pilot_id: currentUser?.name || 'Delivery',
            timestamp: new Date().toISOString(),
          };

          try {
            await updatePilotLocation(payload);
            handleIncomingTelemetry(payload);
          } catch (err: any) {
            console.warn('Foreground update error:', err.message);
          }
        }
      );
      foregroundWatcherRef.current = sub;
    } catch (err) {
      console.warn('Foreground watcher error:', err);
    }
  };

  const handleLoginSuccess = async (user: UserProfile, mustChange?: boolean) => {
    setCurrentUser(user);
    if (mustChange || user.must_change_password) {
      setMustChangePassword(true);
    } else {
      setMustChangePassword(false);
      await loadDashboardData(user.id);
    }
  };

  const handleLogout = async () => {
    await setAuthToken(null);
    await setUserProfile(null);
    await stopTracking();
    if (foregroundWatcherRef.current) {
      foregroundWatcherRef.current.remove();
      foregroundWatcherRef.current = null;
    }
    setCurrentUser(null);
    setSelectedOrder(null);
    setIsTracking(false);
    setActiveScreen('dashboard');
  };

  // Sortie Flow Triggers
  const handleOpenAcceptModal = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setAcceptModalOpen(true);
  };

  const handleOpenStartFlightModal = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setHandoverModalOpen(true);
  };

  const handleOpenPodModal = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setPodModalOpen(true);
  };

  const handleFlightStarted = async () => {
    if (!selectedOrder) return;
    await startTracking(selectedOrder.id);
    await startForegroundWatcher(selectedOrder.id);
    setIsTracking(true);
    setActiveScreen('radar');
    await loadDashboardData();
  };

  const handlePodDelivered = async () => {
    await stopTracking();
    if (foregroundWatcherRef.current) {
      foregroundWatcherRef.current.remove();
      foregroundWatcherRef.current = null;
    }
    setIsTracking(false);
    setSelectedOrder(null);
    setActiveScreen('dashboard');
    await loadDashboardData();
  };

  // If not logged in, render Login Screen
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar with Profile Avatar and Logout */}
      <Header
        serverConnected={serverConnected}
        isTracking={isTracking}
        user={currentUser}
        onNavigateProfile={() => setActiveScreen('profile')}
        onLogout={handleLogout}
      />

      {/* Active Screen View */}
      <View style={styles.screenBody}>
        {activeScreen === 'dashboard' && (
          <DashboardScreen
            user={currentUser}
            kpis={kpis}
            chartData={chartData}
            orders={orders}
            refreshing={refreshing}
            onRefresh={() => loadDashboardData()}
            onAcceptOrder={handleOpenAcceptModal}
            onStartFlight={handleOpenStartFlightModal}
            onCompletePod={handleOpenPodModal}
            onViewRadar={(order) => {
              setSelectedOrder(order);
              setActiveScreen('radar');
            }}
          />
        )}

        {activeScreen === 'radar' && (
          <FlightRadarScreen
            order={selectedOrder}
            isTracking={isTracking}
            telemetry={telemetry}
            currentCoords={currentCoords}
            onBackToDashboard={() => setActiveScreen('dashboard')}
            onCompletePod={handleOpenPodModal}
            onStopTracking={async () => {
              await stopTracking();
              if (foregroundWatcherRef.current) {
                foregroundWatcherRef.current.remove();
                foregroundWatcherRef.current = null;
              }
              setIsTracking(false);
            }}
          />
        )}

        {activeScreen === 'profile' && (
          <ProfileScreen
            user={currentUser}
            onProfileUpdated={(updated) => setCurrentUser(updated)}
          />
        )}

        {activeScreen === 'support' && <SupportScreen user={currentUser} />}

        {activeScreen === 'sos' && (
          <View style={styles.sosScreenWrapper}>
            <SosModal
              visible={true}
              onClose={() => setActiveScreen('dashboard')}
              pilotName={currentUser.name}
              pilotPhone={currentUser.phone}
              vehicleId={currentUser.vehicle_id}
              currentCoords={currentCoords}
              batteryPct={telemetry.batteryPct}
            />
          </View>
        )}
      </View>
      {/* Modern Bottom Navigation Menu with Center SOS Button */}
      <BottomNav
        activeScreen={activeScreen}
        onNavigate={(screen) => setActiveScreen(screen)}
        onTriggerSos={() => setSosModalOpen(true)}
      />

      {/* Modals */}
      <FirstTimePasswordModal
        visible={mustChangePassword}
        userId={currentUser.id}
        pilotName={currentUser.name}
        onSuccess={() => {
          setMustChangePassword(false);
          loadDashboardData();
        }}
      />

      <AcceptOrderModal
        visible={acceptModalOpen}
        order={selectedOrder}
        currentUser={currentUser}
        onClose={() => setAcceptModalOpen(false)}
        onAccepted={() => loadDashboardData()}
        onNavigateProfile={() => setActiveScreen('profile')}
      />

      <DispatcherHandoverModal
        visible={handoverModalOpen}
        order={selectedOrder}
        pilotName={currentUser.name}
        pilotPhone={currentUser.phone}
        vehicleId={currentUser.vehicle_id}
        currentCoords={currentCoords}
        onClose={() => setHandoverModalOpen(false)}
        onFlightStarted={handleFlightStarted}
      />

      <CustomerDeliveryPodModal
        visible={podModalOpen}
        order={selectedOrder}
        pilotUser={currentUser}
        currentCoords={currentCoords}
        onClose={() => setPodModalOpen(false)}
        onDelivered={handlePodDelivered}
      />

      <SosModal
        visible={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        pilotName={currentUser.name}
        pilotPhone={currentUser.phone}
        vehicleId={currentUser.vehicle_id}
        currentCoords={currentCoords}
        batteryPct={telemetry.batteryPct}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screenBody: {
    flex: 1,
  },
  sosScreenWrapper: {
    flex: 1,
  },
});
