import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import {
  Gauge,
  Compass,
  BatteryCharging,
  Radio,
  MapPin,
  CheckCircle,
  ExternalLink,
  Navigation,
  Send,
  Zap,
  ArrowLeft,
  Shield,
} from 'lucide-react-native';
import { DeliveryOrder, TelemetryStats } from '../types';

interface FlightRadarScreenProps {
  order: DeliveryOrder | null;
  isTracking: boolean;
  telemetry: TelemetryStats;
  currentCoords: { latitude: number; longitude: number } | null;
  onBackToDashboard: () => void;
  onCompletePod: (order: DeliveryOrder) => void;
  onStopTracking: () => void;
}

export const FlightRadarScreen: React.FC<FlightRadarScreenProps> = ({
  order,
  isTracking,
  telemetry,
  currentCoords,
  onBackToDashboard,
  onCompletePod,
  onStopTracking,
}) => {
  if (!order) {
    return (
      <View style={styles.noOrderContainer}>
        <Zap size={48} color="#64748B" />
        <Text style={styles.noOrderTitle}>No Active Delivery</Text>
        <Text style={styles.noOrderSub}>
          Select an accepted order from the dashboard to start live delivery navigation.
        </Text>
        <TouchableOpacity style={styles.returnBtn} onPress={onBackToDashboard}>
          <Text style={styles.returnBtnText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleOpenGoogleMaps = () => {
    const destLat = order.destination_location?.latitude || order.delivery_lat || 28.632;
    const destLng = order.destination_location?.longitude || order.delivery_lng || 77.378;
    const address = encodeURIComponent(order.drop_address || order.delivery_address || 'Delivery Drop');

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&destination_place_id=${address}`;
    Linking.openURL(googleMapsUrl).catch(() => {
      Linking.openURL(`geo:${destLat},${destLng}?q=${destLat},${destLng}(${address})`);
    });
  };

  const handleStopAlert = () => {
    Alert.alert(
      'Pause Delivery GPS',
      'Are you sure you want to pause live GPS location tracking for this delivery?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pause GPS', style: 'destructive', onPress: onStopTracking },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Nav Row */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToDashboard}>
          <ArrowLeft size={16} color="#94A3B8" />
          <Text style={styles.backBtnText}>Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.flightIdBadge}>
          <Zap size={14} color="#8B5CF6" />
          <Text style={styles.flightIdText}>{order.order_number || order.id.slice(0, 8)}</Text>
        </View>
      </View>

      {/* Target Destination Banner */}
      <View style={styles.missionBanner}>
        <View style={styles.missionHeader}>
          <View style={styles.missionTitleGroup}>
            <Shield size={14} color="#3B0080" />
            <Text style={styles.missionLabel}>Delivery Destination</Text>
          </View>
          <Text style={styles.clientText}>{order.customer_name}</Text>
        </View>

        <View style={styles.addressRow}>
          <MapPin size={16} color="#DC2626" />
          <Text style={styles.addressText} numberOfLines={2}>
            {order.drop_address || order.delivery_address || 'Delivery Address'}
          </Text>
        </View>

        <View style={styles.bannerActions}>
          {telemetry.distanceRemainingKm != null ? (
            <View style={styles.distPill}>
              <Navigation size={12} color="#3B0080" />
              <Text style={styles.distText}>
                Distance: {telemetry.distanceRemainingKm.toFixed(2)} km
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.mapsBtn} onPress={handleOpenGoogleMaps}>
            <ExternalLink size={13} color="#3B0080" />
            <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Beacon Status Strip */}
      <View style={styles.beaconStrip}>
        <View style={styles.beaconLeft}>
          <View
            style={[
              styles.beaconDot,
              isTracking ? styles.beaconDotActive : styles.beaconDotInactive,
            ]}
          />
          <Text style={styles.beaconText}>
            {isTracking ? 'GPS Navigation: Live Transmitting' : 'Navigation: Paused'}
          </Text>
        </View>
        <View style={styles.packetsBadge}>
          <Send size={11} color="#3B0080" />
          <Text style={styles.packetsText}>{telemetry.packetsSent} pkts</Text>
        </View>
      </View>

      {/* Primary HUD Gauges */}
      <View style={styles.gaugesGrid}>
        {/* Speedometer */}
        <View style={styles.gaugeCard}>
          <View style={styles.gaugeHeader}>
            <Gauge size={16} color="#3B0080" />
            <Text style={styles.gaugeTitle}>Speed</Text>
          </View>
          <View style={styles.gaugeValRow}>
            <Text style={styles.gaugeBigVal}>{telemetry.speedKmh}</Text>
            <Text style={styles.gaugeUnit}>km/h</Text>
          </View>
          <Text style={styles.gaugeSub}>Current Velocity</Text>
        </View>

        {/* Altitude */}
        <View style={styles.gaugeCard}>
          <View style={styles.gaugeHeader}>
            <Navigation size={16} color="#059669" />
            <Text style={styles.gaugeTitle}>Altitude</Text>
          </View>
          <View style={styles.gaugeValRow}>
            <Text style={styles.gaugeBigVal}>{telemetry.altitudeM}</Text>
            <Text style={styles.gaugeUnit}>m</Text>
          </View>
          <Text style={styles.gaugeSub}>GPS Elevation</Text>
        </View>
      </View>

      {/* Secondary Flight Telemetry (Heading & Battery) */}
      <View style={styles.secondaryGrid}>
        {/* Heading */}
        <View style={styles.secondaryCard}>
          <View style={styles.secHeader}>
            <Compass size={14} color="#A78BFA" />
            <Text style={styles.secLabel}>BEARING</Text>
          </View>
          <Text style={styles.secVal}>{telemetry.headingDeg}°</Text>
          <Text style={styles.secSub}>Compass Heading</Text>
        </View>

        {/* Battery */}
        <View style={styles.secondaryCard}>
          <View style={styles.secHeader}>
            <BatteryCharging size={14} color="#10B981" />
            <Text style={styles.secLabel}>BATTERY</Text>
          </View>
          <Text
            style={[
              styles.secVal,
              telemetry.batteryPct < 25 ? styles.lowBattery : null,
            ]}
          >
            {telemetry.batteryPct}%
          </Text>
          <Text style={styles.secSub}>Device Level</Text>
        </View>
      </View>

      {/* Live Satellite Position Card */}
      <View style={styles.satelliteCard}>
        <View style={styles.satHeader}>
          <Radio size={16} color="#8B5CF6" />
          <Text style={styles.satTitle}>LIVE GNSS SATELLITE FIX</Text>
        </View>

        <View style={styles.coordsRow}>
          <View style={styles.coordCol}>
            <Text style={styles.coordLabel}>LATITUDE</Text>
            <Text style={styles.coordVal}>
              {currentCoords ? currentCoords.latitude.toFixed(6) : 'Acquiring...'}
            </Text>
          </View>
          <View style={styles.coordDivider} />
          <View style={styles.coordCol}>
            <Text style={styles.coordLabel}>LONGITUDE</Text>
            <Text style={styles.coordVal}>
              {currentCoords ? currentCoords.longitude.toFixed(6) : 'Acquiring...'}
            </Text>
          </View>
        </View>

        {telemetry.lastSyncTime ? (
          <Text style={styles.timestampText}>
            Last Synced with Control Center: {new Date(telemetry.lastSyncTime).toLocaleTimeString()}
          </Text>
        ) : null}
      </View>

      {/* Action Controls */}
      <View style={styles.actionsBox}>
        <TouchableOpacity
          style={styles.completePodBtn}
          onPress={() => onCompletePod(order)}
          activeOpacity={0.8}
        >
          <CheckCircle size={20} color="#FFFFFF" />
          <Text style={styles.completePodBtnText}>COMPLETE HANDOVER & DELIVER (POD)</Text>
        </TouchableOpacity>

        {isTracking && (
          <TouchableOpacity style={styles.pauseBtn} onPress={handleStopAlert}>
            <Text style={styles.pauseBtnText}>Pause GPS Stream</Text>
          </TouchableOpacity>
        )}
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
    paddingBottom: 40,
    gap: 14,
  },
  noOrderContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  noOrderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  noOrderSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  returnBtn: {
    backgroundColor: '#3B0080',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  returnBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  flightIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  flightIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6D28D9',
  },
  missionBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  missionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  missionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3B0080',
    letterSpacing: 0.8,
  },
  clientText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  addressText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    fontWeight: '600',
  },
  bannerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  distPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  distText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D28D9',
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mapsBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  beaconStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  beaconLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  beaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  beaconDotActive: {
    backgroundColor: '#059669',
  },
  beaconDotInactive: {
    backgroundColor: '#94A3B8',
  },
  beaconText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  packetsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  packetsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B0080',
  },
  gaugesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  gaugeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  gaugeTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  gaugeValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 4,
  },
  gaugeBigVal: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  gaugeUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  gaugeSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  secondaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  secHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  secLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  secVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 2,
  },
  lowBattery: {
    color: '#DC2626',
  },
  secSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  satelliteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  satHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  satTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#3B0080',
    letterSpacing: 0.8,
  },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  coordCol: {
    alignItems: 'center',
  },
  coordDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  coordVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  timestampText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  actionsBox: {
    gap: 10,
    marginTop: 6,
  },
  completePodBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  completePodBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pauseBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pauseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
});
