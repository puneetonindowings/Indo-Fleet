import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Zap, X, MapPin, User, Package, Navigation } from 'lucide-react-native';
import { DeliveryOrder } from '../types';
import { verifyHandoverAndStartFlight } from '../services/api';

interface DispatcherHandoverModalProps {
  visible: boolean;
  order: DeliveryOrder | null;
  pilotName: string;
  pilotPhone?: string;
  vehicleId?: string;
  currentCoords?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onFlightStarted: (trackingUrl?: string) => Promise<void> | void;
}

export const DispatcherHandoverModal: React.FC<DispatcherHandoverModalProps> = ({
  visible,
  order,
  pilotName,
  pilotPhone,
  vehicleId,
  currentCoords,
  onClose,
  onFlightStarted,
}) => {
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const handleStartFlight = async () => {
    setLoading(true);
    try {
      const res = await verifyHandoverAndStartFlight({
        order_id: order.id,
        pilot_name: pilotName,
        pilot_phone: pilotPhone,
        vehicle_id: vehicleId,
        initial_lat: currentCoords?.latitude,
        initial_lng: currentCoords?.longitude,
      });

      onClose();
      try {
        await onFlightStarted(res.tracking_url);
      } catch (flightErr: any) {
        console.warn('Flight tracking launch warning:', flightErr);
      }
      Alert.alert(
        'Delivery Started',
        `Order #${order.order_number} is now in transit. Live tracking link has been sent to ${order.customer_name || 'Customer'}.`
      );
    } catch (err: any) {
      Alert.alert('Start Delivery Failed', err.message || 'Could not initiate delivery flight.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Zap size={20} color="#3B0080" />
              <Text style={styles.title}>Start Delivery</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Ready to depart for order <Text style={styles.highlight}>#{order.order_number}</Text>?
          </Text>

          {/* Delivery Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <User size={15} color="#64748B" />
              <Text style={styles.detailLabel}>Customer:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{order.customer_name || 'Customer'}</Text>
            </View>

            <View style={styles.detailRow}>
              <MapPin size={15} color="#64748B" />
              <Text style={styles.detailLabel}>Destination:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {order.drop_address || order.delivery_address || 'Customer Drop Site'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Package size={15} color="#64748B" />
              <Text style={styles.detailLabel}>Airframe Model:</Text>
              <Text style={styles.detailValue}>{order.drone_model || '700 RPAV'}</Text>
            </View>
          </View>

          <View style={styles.infoBanner}>
            <Navigation size={16} color="#3B0080" />
            <Text style={styles.infoText}>
              Package is loaded. Starting delivery will notify customer and activate live GPS corridor telemetry.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleStartFlight}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Zap size={16} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Start Delivery</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
    lineHeight: 20,
  },
  highlight: {
    fontWeight: '700',
    color: '#3B0080',
  },
  detailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    width: 95,
  },
  detailValue: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#3B0080',
    fontWeight: '600',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    backgroundColor: '#3B0080',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
