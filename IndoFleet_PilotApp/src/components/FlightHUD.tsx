import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  Gauge,
  Compass,
  BatteryCharging,
  Radio,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Navigation,
  Send,
  Zap,
} from 'lucide-react-native';
import { DeliveryOrder, TelemetryStats } from '../types';

interface FlightHUDProps {
  order: DeliveryOrder;
  isTracking: boolean;
  telemetry: TelemetryStats;
  currentCoords: { latitude: number; longitude: number } | null;
  onStartFlight: () => void;
  onMarkDelivered: (notes?: string) => void;
  onStopTracking: () => void;
  onBackToOrders: () => void;
  loading: boolean;
}

export const FlightHUD: React.FC<FlightHUDProps> = ({
  order,
  isTracking,
  telemetry,
  currentCoords,
  onStartFlight,
  onMarkDelivered,
  onStopTracking,
  onBackToOrders,
  loading,
}) => {
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);

  const handleDeliveryPress = () => {
    if (!showNotesInput) {
      setShowNotesInput(true);
      return;
    }
    Alert.alert(
      'Confirm Delivery Confirmation',
      `Are you sure you want to mark order ${order.order_number} as DELIVERED at current location?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Delivered',
          style: 'default',
          onPress: () => onMarkDelivered(deliveryNotes),
        },
      ]
    );
  };

  const handleAbortPress = () => {
    Alert.alert(
      'Stop Telemetry Stream',
      'Are you sure you want to pause / stop live location broadcasting for this sortie?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Stream',
          style: 'destructive',
          onPress: onStopTracking,
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back button & Header */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBackToOrders}>
          <ArrowLeft size={18} color="#94A3B8" />
          <Text style={styles.backBtnText}>Sortie List</Text>
        </TouchableOpacity>

        <View style={styles.flightIdPill}>
          <Zap size={14} color="#F59E0B" />
          <Text style={styles.flightIdText}>{order.order_number || order.id.slice(0, 8)}</Text>
        </View>
      </View>

      {/* Target Destination Banner */}
      <View style={styles.targetBanner}>
        <View style={styles.targetHeader}>
          <Text style={styles.targetLabel}>MISSION TARGET</Text>
          <Text style={styles.clientLabel}>{order.customer_name}</Text>
        </View>
        <View style={styles.targetAddressRow}>
          <MapPin size={16} color="#EF4444" />
          <Text style={styles.targetAddress} numberOfLines={2}>
            {order.delivery_address || 'GPS Coordinates Site'}
          </Text>
        </View>
        {telemetry.distanceRemainingKm != null && (
          <View style={styles.distanceBadge}>
            <Navigation size={12} color="#8B5CF6" />
            <Text style={styles.distanceText}>
              Distance to Target: {telemetry.distanceRemainingKm.toFixed(2)} km
            </Text>
          </View>
        )}
      </View>

      {/* Telemetry Status Bar */}
      <View style={styles.telemetryBar}>
        <View style={styles.syncStatusRow}>
          <View
            style={[
              styles.syncDot,
              isTracking ? styles.syncDotActive : styles.syncDotInactive,
            ]}
          />
          <Text style={styles.syncStatusText}>
            {isTracking ? 'TELEMETRY BEACON: TRANSMITTING' : 'TELEMETRY BEACON: STANDBY'}
          </Text>
        </View>
        <View style={styles.packetsCounter}>
          <Send size={12} color="#8B5CF6" />
          <Text style={styles.packetsText}>{telemetry.packetsSent} pkts</Text>
        </View>
      </View>

      {/* Primary Aerospace Gauges */}
      <View style={styles.gaugeGrid}>
        {/* Speedometer */}
        <View style={styles.gaugeCard}>
          <View style={styles.gaugeHeader}>
            <Gauge size={16} color="#3B82F6" />
            <Text style={styles.gaugeTitle}>SPEED</Text>
          </View>
          <View style={styles.gaugeValueRow}>
            <Text style={styles.gaugeBigValue}>{telemetry.speedKmh}</Text>
            <Text style={styles.gaugeUnit}>km/h</Text>
          </View>
          <Text style={styles.gaugeFooter}>Ground Velocity</Text>
        </View>

        {/* Altitude */}
        <View style={styles.gaugeCard}>
          <View style={styles.gaugeHeader}>
            <Navigation size={16} color="#10B981" />
            <Text style={styles.gaugeTitle}>ALTITUDE</Text>
          </View>
          <View style={styles.gaugeValueRow}>
            <Text style={styles.gaugeBigValue}>{telemetry.altitudeM}</Text>
            <Text style={styles.gaugeUnit}>m</Text>
          </View>
          <Text style={styles.gaugeFooter}>AGL / Barometric</Text>
        </View>
      </View>

      {/* Secondary Flight Metrics */}
      <View style={styles.secondaryGrid}>
        {/* Heading / Compass */}
        <View style={styles.secondaryCard}>
          <View style={styles.secondaryHeader}>
            <Compass size={14} color="#A78BFA" />
            <Text style={styles.secondaryLabel}>HEADING</Text>
          </View>
          <Text style={styles.secondaryValue}>{telemetry.headingDeg}°</Text>
          <Text style={styles.secondarySub}>Compass Bearing</Text>
        </View>

        {/* Battery Level */}
        <View style={styles.secondaryCard}>
          <View style={styles.secondaryHeader}>
            <BatteryCharging size={14} color="#10B981" />
            <Text style={styles.secondaryLabel}>BATTERY</Text>
          </View>
          <Text
            style={[
              styles.secondaryValue,
              telemetry.batteryPct < 25 ? styles.lowBattery : null,
            ]}
          >
            {telemetry.batteryPct}%
          </Text>
          <Text style={styles.secondarySub}>Device Telemetry</Text>
        </View>
      </View>

      {/* Live GPS Coordinates Card */}
      <View style={styles.gpsCard}>
        <View style={styles.gpsHeader}>
          <Radio size={16} color="#8B5CF6" />
          <Text style={styles.gpsTitle}>LIVE GNSS SATELLITE FIX</Text>
        </View>
        <View style={styles.coordsRow}>
          <View style={styles.coordCol}>
            <Text style={styles.coordLabel}>LATITUDE</Text>
            <Text style={styles.coordValue}>
              {currentCoords ? currentCoords.latitude.toFixed(6) : 'Acquiring...'}
            </Text>
          </View>
          <View style={styles.coordDivider} />
          <View style={styles.coordCol}>
            <Text style={styles.coordLabel}>LONGITUDE</Text>
            <Text style={styles.coordValue}>
              {currentCoords ? currentCoords.longitude.toFixed(6) : 'Acquiring...'}
            </Text>
          </View>
        </View>
        {telemetry.lastSyncTime && (
          <Text style={styles.gpsTimestamp}>
            Last Packet: {new Date(telemetry.lastSyncTime).toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* Action Controls */}
      <View style={styles.actionContainer}>
        {!isTracking ? (
          <TouchableOpacity
            style={styles.startFlightBtn}
            onPress={onStartFlight}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Zap size={20} color="#FFFFFF" />
                <Text style={styles.startFlightBtnText}>START FLIGHT / BROADCAST GPS</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            {showNotesInput && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>DELIVERY CONFIRMATION NOTE</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="e.g. Handed over directly at gate / Safe drop"
                  placeholderTextColor="#64748B"
                  value={deliveryNotes}
                  onChangeText={setDeliveryNotes}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.markDeliveredBtn}
              onPress={handleDeliveryPress}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle size={20} color="#FFFFFF" />
                  <Text style={styles.markDeliveredBtnText}>
                    {showNotesInput ? 'CONFIRM & MARK DELIVERED' : 'COMPLETE SORTIE / DELIVERED'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.abortBtn}
              onPress={handleAbortPress}
              disabled={loading}
            >
              <AlertTriangle size={16} color="#EF4444" />
              <Text style={styles.abortBtnText}>Pause GPS Stream</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  flightIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  flightIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
  },
  targetBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 1,
  },
  clientLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  targetAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  targetAddress: {
    fontSize: 13,
    color: '#CBD5E1',
    flex: 1,
    fontWeight: '500',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A78BFA',
  },
  telemetryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncDotActive: {
    backgroundColor: '#10B981',
  },
  syncDotInactive: {
    backgroundColor: '#64748B',
  },
  syncStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  packetsCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  packetsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  gaugeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  gaugeCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  gaugeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  gaugeValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 4,
  },
  gaugeBigValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  gaugeUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  gaugeFooter: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  secondaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  secondaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  secondaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  secondaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginVertical: 2,
  },
  lowBattery: {
    color: '#EF4444',
  },
  secondarySub: {
    fontSize: 10,
    color: '#64748B',
  },
  gpsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  gpsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 1,
  },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 10,
  },
  coordCol: {
    alignItems: 'center',
  },
  coordDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#334155',
  },
  coordLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  coordValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'],
  },
  gpsTimestamp: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  actionContainer: {
    marginTop: 8,
    gap: 10,
  },
  startFlightBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  startFlightBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  notesBox: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 4,
  },
  notesInput: {
    fontSize: 13,
    color: '#F8FAFC',
    paddingVertical: 4,
  },
  markDeliveredBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  markDeliveredBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  abortBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  abortBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
});
