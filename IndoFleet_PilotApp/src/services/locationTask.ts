import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updatePilotLocation } from './api';
import { getPilotName } from '../config';

export const LOCATION_TASK_NAME = 'IndoFleet_PILOT_BG_LOCATION';
const STORAGE_ACTIVE_ORDER_ID = '@IndoFleet_active_order_id';

let onLocationUpdateListener: ((data: any) => void) | null = null;

export function setLocationUpdateListener(listener: ((data: any) => void) | null) {
  onLocationUpdateListener = listener;
}

// Calculate distance between two coordinates in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Register background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[locations.length - 1];
      const activeOrderId = await AsyncStorage.getItem(STORAGE_ACTIVE_ORDER_ID);

      if (activeOrderId) {
        try {
          let batteryPct = 100;
          try {
            const batteryLevel = await Battery.getBatteryLevelAsync();
            if (batteryLevel >= 0) {
              batteryPct = Math.round(batteryLevel * 100);
            }
          } catch {}

          const pilotName = await getPilotName();

          const payload = {
            order_id: activeOrderId,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude != null ? Math.round(location.coords.altitude) : 45,
            speed: location.coords.speed != null && location.coords.speed >= 0 ? Math.round(location.coords.speed * 3.6) : 0, // convert m/s to km/h
            heading: location.coords.heading != null && location.coords.heading >= 0 ? Math.round(location.coords.heading) : 0,
            accuracy: location.coords.accuracy != null ? Math.round(location.coords.accuracy) : 5,
            battery_pct: batteryPct,
            pilot_id: pilotName,
            timestamp: new Date().toISOString(),
          };

          await updatePilotLocation(payload);

          if (onLocationUpdateListener) {
            onLocationUpdateListener({
              location,
              payload,
              success: true,
            });
          }
        } catch (err: any) {
          console.warn('Background sync error:', err.message);
          if (onLocationUpdateListener) {
            onLocationUpdateListener({
              location,
              error: err.message,
              success: false,
            });
          }
        }
      }
    }
  }
});

export async function requestLocationPermissions(): Promise<{ foreground: boolean; background: boolean }> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    return { foreground: false, background: false };
  }

  try {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    return { foreground: true, background: bgStatus === 'granted' };
  } catch (err) {
    // In Expo Go or some environments background permissions might fallback
    return { foreground: true, background: false };
  }
}

export async function startTracking(orderId: string): Promise<boolean> {
  await AsyncStorage.setItem(STORAGE_ACTIVE_ORDER_ID, orderId);

  const permissions = await requestLocationPermissions();
  if (!permissions.foreground) {
    throw new Error('Location permission is required for live delivery tracking.');
  }

  // Check if task is already running
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

  if (isRegistered) {
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    } catch {}
  }

  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000, // Adaptive 5-second polling interval
      distanceInterval: 10, // Only trigger on 10m movement to conserve battery
      deferredUpdatesInterval: 10000,
      deferredUpdatesDistance: 10,
      pausesUpdatesAutomatically: true, // Auto-pause location polling when stationary
      foregroundService: {
        notificationTitle: 'IndoFleet Live Delivery Tracking',
        notificationBody: 'Broadcasting live GPS navigation and order tracking...',
        notificationColor: '#3B0080',
      },
      showsBackgroundLocationIndicator: true,
    });
    return true;
  } catch (err) {
    console.warn('Could not start background task, falling back to foreground watcher', err);
    return false;
  }
}

export async function stopTracking(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_ACTIVE_ORDER_ID);
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (err) {
    console.warn('Error stopping location tracking:', err);
  }
}

