import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  BackHandler,
  ToastAndroid,
} from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';

import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { FirstTimePasswordModal } from './src/components/FirstTimePasswordModal';
import { AcceptOrderModal } from './src/components/AcceptOrderModal';
import { DispatcherHandoverModal } from './src/components/DispatcherHandoverModal';
import { CustomerDeliveryPodModal } from './src/components/CustomerDeliveryPodModal';
import { PilotInspectionModal } from './src/components/PilotInspectionModal';
import { SosModal } from './src/components/SosModal';

import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FlightRadarScreen } from './src/screens/FlightRadarScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SupportScreen } from './src/screens/SupportScreen';
import { OrderHistoryScreen } from './src/screens/OrderHistoryScreen';
import { InspectionScreen } from './src/screens/InspectionScreen';
import { QrScannerScreen } from './src/screens/QrScannerScreen';
import { SortieDronesScreen } from './src/screens/SortieDronesScreen';
import { NotFoundScreen } from './src/screens/NotFoundScreen';

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
  fetchPilotOrderHistory,
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

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RootErrorBoundary caught error:', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 380, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 16, elevation: 6 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 8 }}>IndoFleet Delivery</Text>
            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 18 }}>
              {this.state.error?.message || 'A minor interface reset occurred. Tap restart below to continue.'}
            </Text>
            <TouchableOpacity
              onPress={this.handleRestart}
              style={{ backgroundColor: '#3B0080', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>Restart App</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [activeScreen, setActiveScreen] = useState<string>('dashboard');
  const [screenHistory, setScreenHistory] = useState<string[]>(['dashboard']);
  const lastBackPressRef = useRef<number>(0);

  const navigateTo = useCallback((screen: string) => {
    setActiveScreen(screen);
    setScreenHistory((prev) => {
      if (screen === 'dashboard') {
        return ['dashboard'];
      }
      if (prev[prev.length - 1] === screen) {
        return prev;
      }
      return [...prev, screen];
    });
  }, []);

  const [sosModalOpen, setSosModalOpen] = useState<boolean>(false);

  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [acceptModalOpen, setAcceptModalOpen] = useState<boolean>(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState<boolean>(false);
  const [podModalOpen, setPodModalOpen] = useState<boolean>(false);
  const [inspectionModalOpen, setInspectionModalOpen] = useState<boolean>(false);
  const [inspectionOrder, setInspectionOrder] = useState<DeliveryOrder | null>(null);
  const [activeInspectingDroneId, setActiveInspectingDroneId] = useState<string>('');
  const [targetDroneSlotIndex, setTargetDroneSlotIndex] = useState<number | undefined>(undefined);
  const [inspectionStage, setInspectionStage] = useState<'hub_pickup' | 'customer_delivery'>('customer_delivery');
  const [orderHubInspectedDrones, setOrderHubInspectedDrones] = useState<Record<string, string[]>>({});
  const [orderInspectedDrones, setOrderInspectedDrones] = useState<Record<string, string[]>>({});

  const handleHardwareBack = useCallback(() => {
    if (sosModalOpen) {
      setSosModalOpen(false);
      return true;
    }
    if (acceptModalOpen) {
      setAcceptModalOpen(false);
      return true;
    }
    if (handoverModalOpen) {
      setHandoverModalOpen(false);
      return true;
    }
    if (podModalOpen) {
      setPodModalOpen(false);
      return true;
    }
    if (inspectionModalOpen) {
      setInspectionModalOpen(false);
      return true;
    }

    if (activeScreen === 'scanner') {
      navigateTo(screenHistory.includes('sortie_drones') ? 'sortie_drones' : (selectedOrder ? 'radar' : 'dashboard'));
      return true;
    }
    if (activeScreen === 'inspection') {
      navigateTo(screenHistory.includes('sortie_drones') ? 'sortie_drones' : (selectedOrder ? 'radar' : 'dashboard'));
      return true;
    }
    if (activeScreen === 'sortie_drones') {
      navigateTo(selectedOrder ? 'radar' : 'dashboard');
      return true;
    }

    if (screenHistory.length > 1) {
      const nextHistory = [...screenHistory];
      nextHistory.pop(); // Remove current screen
      const prevScreen = nextHistory[nextHistory.length - 1] || 'dashboard';
      setScreenHistory(nextHistory);
      setActiveScreen(prevScreen);
      return true;
    }

    if (activeScreen !== 'dashboard') {
      setActiveScreen('dashboard');
      setScreenHistory(['dashboard']);
      return true;
    }

    const now = Date.now();
    if (now - lastBackPressRef.current < 2000) {
      return false; // Let Android OS exit app
    }
    lastBackPressRef.current = now;
    if (Platform.OS === 'android') {
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
    }
    return true;
  }, [
    sosModalOpen,
    acceptModalOpen,
    handoverModalOpen,
    podModalOpen,
    inspectionModalOpen,
    activeScreen,
    selectedOrder,
    screenHistory,
    navigateTo,
  ]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => sub.remove();
  }, [handleHardwareBack]);

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<DeliveryOrder[]>([]);
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

    setLocationUpdateListener((data) => {
      if (data.success && data.payload) {
        handleIncomingTelemetry(data.payload);
      }
    });

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
    try {
      const token = await getAuthToken();
      const profile = await getUserProfile();

      if (token && profile) {
        setCurrentUser(profile);
        if (profile.must_change_password) {
          setMustChangePassword(true);
        }
        loadDashboardData(profile.id).catch((err) => console.log('Dashboard load deferred error:', err?.message));
        fetchInitialLocation().catch(() => {});
      }
    } catch (err) {
      console.warn('Bootstrap auth read notice:', err);
    }

    checkServer().catch(() => {});
    updateBatteryLevel().catch(() => {});
  };

  const fetchInitialLocation = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (pos && pos.coords) {
              setCurrentCoords({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
            }
          },
          (err) => {
            console.warn('Browser geolocation denied or unavailable; defaulting to IndoWings Central Hub Noida:', err?.message);
            setCurrentCoords({ latitude: 28.6037, longitude: 77.3661 });
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      } catch {}
      return;
    }

    try {
      if (!Location || !Location.getForegroundPermissionsAsync) {
        setCurrentCoords((prev) => prev || { latitude: 28.6037, longitude: 77.3661 });
        return;
      }
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: reqStatus } = await Location.requestForegroundPermissionsAsync();
        status = reqStatus;
      }
      if (status === 'granted') {
        try {
          const last = await Location.getLastKnownPositionAsync();
          if (last?.coords) {
            setCurrentCoords({
              latitude: last.coords.latitude,
              longitude: last.coords.longitude,
            });
          }
        } catch {}

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (loc?.coords) {
          setCurrentCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          return;
        }
      }
      setCurrentCoords((prev) => prev || { latitude: 28.6037, longitude: 77.3661 });
    } catch (err) {
      console.warn('Initial location fetch error:', err);
      setCurrentCoords((prev) => prev || { latitude: 28.6037, longitude: 77.3661 });
    }
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
        const hubSync: Record<string, string[]> = {};
        const custSync: Record<string, string[]> = {};
        data.active_orders.forEach((ord: DeliveryOrder) => {
          if (Array.isArray(ord.hub_inspected_drone_ids) && ord.hub_inspected_drone_ids.length > 0) {
            hubSync[ord.id] = ord.hub_inspected_drone_ids;
          }
          if (Array.isArray(ord.inspected_drone_ids) && ord.inspected_drone_ids.length > 0) {
            custSync[ord.id] = ord.inspected_drone_ids;
          }
        });
        setOrderHubInspectedDrones((prev) => ({ ...hubSync, ...prev }));
        setOrderInspectedDrones((prev) => ({ ...custSync, ...prev }));

        if (selectedOrder) {
          const updated = data.active_orders.find((o) => o.id === selectedOrder.id);
          if (updated) setSelectedOrder(updated);
        }
      }
      if (Array.isArray(data.history_orders)) {
        setHistoryOrders(data.history_orders);
      } else {
        try {
          const hist = await fetchPilotOrderHistory(pilotId || currentUser?.id);
          if (Array.isArray(hist.orders)) {
            setHistoryOrders(hist.orders);
          }
        } catch {}
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
      foregroundWatcherRef.current = null;
    }

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: reqStatus } = await Location.requestForegroundPermissionsAsync();
        if (reqStatus !== 'granted') {
          console.warn('Foreground location permission not granted for live watcher.');
          return;
        }
      }

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
      loadDashboardData(user.id).catch((err) => console.log('Dashboard load notice:', err?.message));
    }
    fetchInitialLocation().catch(() => {});
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
    navigateTo('dashboard');
  };

  const handleOpenAcceptModal = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setAcceptModalOpen(true);
  };

  const handleOpenStartFlightModal = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setHandoverModalOpen(true);
  };

  const handleOpenSortieDrones = (order: DeliveryOrder, stage?: 'hub_pickup' | 'customer_delivery') => {
    const computedStage = stage || (order.pilot_acceptance_status === 'pending_acceptance' && order.status !== 'in-flight' ? 'hub_pickup' : 'customer_delivery');
    setInspectionStage(computedStage);
    setSelectedOrder(order);
    setInspectionOrder(order);
    navigateTo('sortie_drones');
  };

  const handleStartQrInspectionFlow = (order: DeliveryOrder, slotIndex?: number, stage?: 'hub_pickup' | 'customer_delivery') => {
    if (stage) setInspectionStage(stage);
    setSelectedOrder(order);
    setInspectionOrder(order);
    setTargetDroneSlotIndex(slotIndex);
    navigateTo('scanner');
  };

  const handleQrScannedSuccess = (matchedDroneId: string) => {
    setActiveInspectingDroneId(matchedDroneId);
    navigateTo('inspection');
  };

  const handleInspectionSuccess = async (droneId: string, isAllCompleted: boolean, _inspectionId?: string) => {
    const currentOrd = inspectionOrder || selectedOrder;
    if (currentOrd) {
      if (inspectionStage === 'hub_pickup') {
        setOrderHubInspectedDrones((prev) => {
          const existing = prev[currentOrd.id] || currentOrd.hub_inspected_drone_ids || [];
          return {
            ...prev,
            [currentOrd.id]: Array.from(new Set([...existing, droneId])),
          };
        });
      } else {
        setOrderInspectedDrones((prev) => {
          const existing = prev[currentOrd.id] || currentOrd.inspected_drone_ids || [];
          return {
            ...prev,
            [currentOrd.id]: Array.from(new Set([...existing, droneId])),
          };
        });
      }
    }

    if (!isAllCompleted) {
      navigateTo('sortie_drones');
      loadDashboardData().catch(() => {});
    } else {
      if (inspectionStage === 'hub_pickup') {
        navigateTo('sortie_drones');
        loadDashboardData().catch(() => {});
      } else {
        await stopTracking();
        if (foregroundWatcherRef.current) {
          foregroundWatcherRef.current.remove();
          foregroundWatcherRef.current = null;
        }
        setIsTracking(false);
        setSelectedOrder(null);
        setInspectionOrder(null);
        setActiveInspectingDroneId('');
        navigateTo('dashboard');
        loadDashboardData().catch(() => {});
      }
    }
  };

  const handleFlightStarted = async () => {
    if (!selectedOrder) return;
    try {
      const trackingSuccess = await startTracking(selectedOrder.id);
      await startForegroundWatcher(selectedOrder.id);
      setIsTracking(true);
      navigateTo('radar');
      await loadDashboardData();

      if (!trackingSuccess && Platform.OS !== 'web') {
        Alert.alert(
          'Location Notice',
          'GPS location permissions are not enabled. Live telemetry broadcast is paused. Please enable Location in your device settings for live GPS tracking.'
        );
      }
    } catch (err: any) {
      console.warn('Flight start tracking error:', err);
      setIsTracking(true);
      navigateTo('radar');
      await loadDashboardData();
    }
  };

  const handlePodDelivered = async (finishedOrder?: DeliveryOrder) => {
    const targetOrder = finishedOrder || selectedOrder;
    await stopTracking();
    if (foregroundWatcherRef.current) {
      foregroundWatcherRef.current.remove();
      foregroundWatcherRef.current = null;
    }
    setIsTracking(false);
    setSelectedOrder(null);
    navigateTo('dashboard');
    await loadDashboardData();

    if (targetOrder) {
      setInspectionOrder(targetOrder);
      navigateTo('inspection');
    }
  };

  const handleOpenInspection = (order?: DeliveryOrder) => {
    setInspectionOrder(order || selectedOrder || (orders.length > 0 ? orders[0] : null));
    navigateTo('inspection');
  };

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />


      <Header
        serverConnected={serverConnected}
        isTracking={isTracking}
        user={currentUser}
        onNavigateProfile={() => navigateTo('profile')}
        onNavigateHistory={() => navigateTo('history')}
        onNavigateSupport={() => navigateTo('support')}
        onInspectDrone={() => handleOpenInspection()}
        onLogout={handleLogout}
      />


      <View style={styles.screenBody}>
        {activeScreen === 'dashboard' && (
          <DashboardScreen
            user={currentUser}
            kpis={kpis}
            chartData={chartData}
            orders={orders}
            orderInspectedDrones={orderInspectedDrones}
            orderHubInspectedDrones={orderHubInspectedDrones}
            refreshing={refreshing}
            onRefresh={() => loadDashboardData()}
            onAcceptOrder={handleOpenAcceptModal}
            onStartFlight={handleOpenStartFlightModal}
            onCompletePod={handleStartQrInspectionFlow}
            onStartQrScan={handleStartQrInspectionFlow}
            onOpenSortieDrones={handleOpenSortieDrones}
            onViewRadar={(order) => {
              setSelectedOrder(order);
              navigateTo('radar');
            }}
            onViewHistory={() => navigateTo('history')}
            onInspectDrone={handleOpenInspection}
          />
        )}

        {activeScreen === 'history' && (
          <OrderHistoryScreen
            user={currentUser}
            historyOrders={historyOrders}
            refreshing={refreshing}
            onRefresh={() => loadDashboardData()}
            onNavigateDashboard={() => navigateTo('dashboard')}
          />
        )}

        {activeScreen === 'radar' && (
          <FlightRadarScreen
            order={selectedOrder}
            allOrders={orders}
            orderInspectedDrones={orderInspectedDrones}
            orderHubInspectedDrones={orderHubInspectedDrones}
            onSelectOrder={(ord) => setSelectedOrder(ord)}
            isTracking={isTracking}
            telemetry={telemetry}
            currentCoords={currentCoords}
            onRefreshLocation={fetchInitialLocation}
            onUpdateLocation={(coords) => setCurrentCoords(coords)}
            onBackToDashboard={() => navigateTo('dashboard')}
            onCompletePod={handleStartQrInspectionFlow}
            onOpenSortieDrones={handleOpenSortieDrones}
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

        {activeScreen === 'sortie_drones' && (
          <SortieDronesScreen
            order={inspectionOrder || selectedOrder}
            stage={inspectionStage}
            inspectedDroneIds={
              inspectionStage === 'hub_pickup'
                ? (orderHubInspectedDrones[(inspectionOrder || selectedOrder)?.id || ''] ||
                   (inspectionOrder || selectedOrder)?.hub_inspected_drone_ids ||
                   [])
                : (orderInspectedDrones[(inspectionOrder || selectedOrder)?.id || ''] ||
                   (inspectionOrder || selectedOrder)?.inspected_drone_ids ||
                   [])
            }
            onBack={() => navigateTo(selectedOrder ? 'radar' : 'dashboard')}
            onScanDrone={(slotIndex) => {
              const targetOrd = inspectionOrder || selectedOrder;
              if (targetOrd) handleStartQrInspectionFlow(targetOrd, slotIndex, inspectionStage);
            }}
            onReinspectDrone={(droneId, slotIndex) => {
              const targetOrd = inspectionOrder || selectedOrder;
              if (targetOrd) {
                setSelectedOrder(targetOrd);
                setInspectionOrder(targetOrd);
                setTargetDroneSlotIndex(slotIndex);
                setActiveInspectingDroneId(droneId);
                navigateTo('inspection');
              }
            }}
            onCompleteHandover={(ord) => {
              handleOpenInspection(ord);
            }}
            onAcceptOrder={(ord) => {
              handleOpenAcceptModal(ord);
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

        {activeScreen === 'scanner' && (
          <QrScannerScreen
            order={inspectionOrder || selectedOrder}
            targetDroneSlot={targetDroneSlotIndex}
            inspectedDroneIds={
              inspectionStage === 'hub_pickup'
                ? (orderHubInspectedDrones[(inspectionOrder || selectedOrder)?.id || ''] ||
                   (inspectionOrder || selectedOrder)?.hub_inspected_drone_ids ||
                   [])
                : (orderInspectedDrones[(inspectionOrder || selectedOrder)?.id || ''] ||
                   (inspectionOrder || selectedOrder)?.inspected_drone_ids ||
                   [])
            }
            onBack={() => navigateTo(screenHistory.includes('sortie_drones') ? 'sortie_drones' : (selectedOrder ? 'radar' : 'dashboard'))}
            onScannedSuccess={handleQrScannedSuccess}
          />
        )}

        {activeScreen === 'inspection' && (
          <InspectionScreen
            key={String((inspectionOrder || selectedOrder)?.id || "ord") + "-" + String(activeInspectingDroneId || "main")}
            order={inspectionOrder || selectedOrder}
            stage={inspectionStage}
            inspectedDroneId={activeInspectingDroneId}
            inspectedDroneIds={
              inspectionStage === 'hub_pickup'
                ? (orderHubInspectedDrones[(inspectionOrder || selectedOrder)?.id || ''] ||
                   (inspectionOrder || selectedOrder)?.hub_inspected_drone_ids ||
                   [])
                : (orderInspectedDrones[(inspectionOrder || selectedOrder)?.id || ''] ||
                   (inspectionOrder || selectedOrder)?.inspected_drone_ids ||
                   [])
            }
            pilotUser={currentUser}
            currentCoords={currentCoords}
            telemetry={telemetry}
            onBack={() => navigateTo(screenHistory.includes('sortie_drones') ? 'sortie_drones' : (selectedOrder ? 'radar' : 'dashboard'))}
            onSuccess={handleInspectionSuccess}
          />
        )}

        {activeScreen === '404' && (
          <NotFoundScreen onNavigate={(screen) => navigateTo(screen)} />
        )}

        {!['dashboard', 'history', 'radar', 'profile', 'support', 'sos', 'inspection', 'scanner', 'sortie_drones', '404'].includes(activeScreen) && (
          <NotFoundScreen onNavigate={(screen) => navigateTo(screen)} />
        )}

        {activeScreen === 'sos' && (
          <View style={styles.sosScreenWrapper}>
            <SosModal
              visible={true}
              onClose={() => navigateTo('dashboard')}
              pilotName={currentUser.name}
              pilotPhone={currentUser.phone}
              vehicleId={currentUser.vehicle_id}
              currentCoords={currentCoords}
              batteryPct={telemetry.batteryPct}
            />
          </View>
        )}
      </View>

      {!['scanner', 'inspection', 'sortie_drones'].includes(activeScreen) && (
        <BottomNav
          activeScreen={activeScreen}
          onNavigate={(screen) => navigateTo(screen)}
          onTriggerSos={() => setSosModalOpen(true)}
        />
      )}


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
        onNavigateProfile={() => navigateTo('profile')}
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

      <SosModal
        visible={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        pilotName={currentUser.name}
        pilotPhone={currentUser.phone}
        vehicleId={currentUser.vehicle_id}
        currentCoords={currentCoords}
        batteryPct={telemetry.batteryPct}
      />


      <PilotInspectionModal
        visible={inspectionModalOpen}
        order={inspectionOrder}
        pilotUser={currentUser}
        onClose={() => setInspectionModalOpen(false)}
        onSuccess={() => {
          loadDashboardData();
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <RootErrorBoundary>
      <MainApp />
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
    paddingBottom: Platform.OS === 'android' ? 24 : 0,
  },
  screenBody: {
    flex: 1,
  },
  sosScreenWrapper: {
    flex: 1,
  },
});
