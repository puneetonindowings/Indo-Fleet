import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import {
  Package,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  Plane,
  Navigation,
  ExternalLink,
  CheckCircle,
  Zap,
} from 'lucide-react-native';
import { DeliveryOrder } from '../types';

interface OrderCardProps {
  order: DeliveryOrder;
  onAcceptPress: (order: DeliveryOrder) => void;
  onStartFlightPress: (order: DeliveryOrder) => void;
  onCompletePodPress: (order: DeliveryOrder) => void;
  onViewRadarPress: (order: DeliveryOrder) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onAcceptPress,
  onStartFlightPress,
  onCompletePodPress,
  onViewRadarPress,
}) => {
  const isPendingAcceptance = order.pilot_acceptance_status === 'pending_acceptance' && order.status !== 'in-flight' && order.status !== 'delivered';
  const isAccepted = order.pilot_acceptance_status === 'accepted' && order.status !== 'in-flight' && order.status !== 'delivered';
  const isInFlight = order.status === 'in-flight';
  const isDelivered = order.status === 'delivered';

  const handleCallCustomer = () => {
    if (order.customer_phone) {
      Linking.openURL(`tel:${order.customer_phone}`);
    } else {
      Alert.alert('No Phone', 'Customer phone number is not available.');
    }
  };

  const handleOpenExternalMaps = () => {
    const destLat = order.destination_location?.latitude || order.delivery_lat || 28.632;
    const destLng = order.destination_location?.longitude || order.delivery_lng || 77.378;
    const address = encodeURIComponent(order.drop_address || order.delivery_address || 'Delivery Point');

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&destination_place_id=${address}`;
    Linking.openURL(googleMapsUrl).catch(() => {
      Linking.openURL(`geo:${destLat},${destLng}?q=${destLat},${destLng}(${address})`);
    });
  };

  return (
    <View style={[styles.card, isInFlight && styles.cardInFlight]}>
      {/* Card Header: Order # & Status */}
      <View style={styles.cardHeader}>
        <View style={styles.orderIdBadge}>
          <Package size={14} color="#8B5CF6" />
          <Text style={styles.orderIdText}>{order.order_number || order.id.slice(0, 8).toUpperCase()}</Text>
        </View>

        <View
          style={[
            styles.statusTag,
            isInFlight
              ? styles.statusTagInFlight
              : isPendingAcceptance
              ? styles.statusTagPendingAcceptance
              : isAccepted
              ? styles.statusTagAccepted
              : styles.statusTagDelivered,
          ]}
        >
          <Text
            style={[
              styles.statusTagText,
              isInFlight
                ? styles.statusTagTextInFlight
                : isPendingAcceptance
                ? styles.statusTagTextPendingAcceptance
                : isAccepted
                ? styles.statusTagTextAccepted
                : styles.statusTagTextDelivered,
            ]}
          >
            {isInFlight
              ? 'In Delivery'
              : isPendingAcceptance
              ? 'Waiting OTP Accept'
              : isAccepted
              ? 'Ready to Start'
              : 'Delivered'}
          </Text>
        </View>
      </View>

      {/* Assignment By Dispatcher Tag */}
      {order.assigned_by_name ? (
        <View style={styles.assignedByRow}>
          <ShieldCheck size={13} color="#3B0080" />
          <Text style={styles.assignedByText}>
            Assigned by: <Text style={styles.assignedByName}>{order.assigned_by_name}</Text> ({order.assigned_by_role || 'Dispatcher'})
          </Text>
        </View>
      ) : null}

      {/* Customer & Phone Row */}
      <View style={styles.customerRow}>
        <View style={styles.customerNameGroup}>
          <User size={15} color="#64748B" />
          <Text style={styles.customerName}>{order.customer_name || 'Customer'}</Text>
        </View>

        {order.customer_phone ? (
          <TouchableOpacity style={styles.callBtn} onPress={handleCallCustomer}>
            <Phone size={12} color="#059669" />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Destination Drop Location */}
      <View style={styles.addressBox}>
        <MapPin size={16} color="#DC2626" style={styles.pinIcon} />
        <Text style={styles.addressText} numberOfLines={2}>
          {order.drop_address || order.delivery_address || 'Delivery Address'}
        </Text>
      </View>

      {/* Drone Specs & Weight */}
      <View style={styles.specsRow}>
        <View style={styles.specItem}>
          <Plane size={13} color="#3B0080" />
          <Text style={styles.specLabel}>Vehicle:</Text>
          <Text style={styles.specValue}>{order.drone_model || 'IndoFleet UAV'}</Text>
        </View>
        <View style={styles.specItem}>
          <Text style={styles.specLabel}>Weight:</Text>
          <Text style={styles.specValue}>{order.weight_kg ? `${order.weight_kg} kg` : 'Standard'}</Text>
        </View>
      </View>

      {/* Action Buttons Section */}
      <View style={styles.actionsContainer}>
        {isPendingAcceptance && (
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => onAcceptPress(order)}
            activeOpacity={0.8}
          >
            <ShieldCheck size={16} color="#FFFFFF" />
            <Text style={styles.acceptBtnText}>Accept Order (Enter OTP)</Text>
          </TouchableOpacity>
        )}

        {isAccepted && (
          <View style={styles.acceptedBtnGroup}>
            <TouchableOpacity
              style={styles.startFlightBtn}
              onPress={() => onStartFlightPress(order)}
              activeOpacity={0.8}
            >
              <Zap size={16} color="#FFFFFF" />
              <Text style={styles.startFlightBtnText}>Start Delivery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapAppBtn}
              onPress={handleOpenExternalMaps}
              activeOpacity={0.8}
            >
              <ExternalLink size={14} color="#3B0080" />
              <Text style={styles.mapAppBtnText}>Google Maps</Text>
            </TouchableOpacity>
          </View>
        )}

        {isInFlight && (
          <View style={styles.inFlightBtnGroup}>
            <TouchableOpacity
              style={styles.radarBtn}
              onPress={() => onViewRadarPress(order)}
              activeOpacity={0.8}
            >
              <Navigation size={16} color="#FFFFFF" />
              <Text style={styles.radarBtnText}>Live Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.podBtn}
              onPress={() => onCompletePodPress(order)}
              activeOpacity={0.8}
            >
              <CheckCircle size={16} color="#FFFFFF" />
              <Text style={styles.podBtnText}>Complete Delivery (POD)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    marginBottom: 16,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardInFlight: {
    borderColor: '#DDD6FE',
    backgroundColor: '#FAF5FF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3B0080',
    letterSpacing: 0.5,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusTagPendingAcceptance: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusTagAccepted: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusTagInFlight: {
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
  },
  statusTagDelivered: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusTagTextPendingAcceptance: {
    color: '#D97706',
  },
  statusTagTextAccepted: {
    color: '#2563EB',
  },
  statusTagTextInFlight: {
    color: '#6D28D9',
  },
  statusTagTextDelivered: {
    color: '#059669',
  },
  assignedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  assignedByText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  assignedByName: {
    color: '#3B0080',
    fontWeight: '700',
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  pinIcon: {
    backgroundColor: '#FEE2E2',
    padding: 6,
    borderRadius: 10,
  },
  addressText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 14,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  specValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionsContainer: {
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#3B0080',
    borderRadius: 24,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#3B0080',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  acceptedBtnGroup: {
    gap: 10,
  },
  startFlightBtn: {
    backgroundColor: '#3B0080',
    borderRadius: 24,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#3B0080',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  startFlightBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  mapAppBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapAppBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  inFlightBtnGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  radarBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  radarBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  podBtn: {
    flex: 1.2,
    backgroundColor: '#059669',
    borderRadius: 24,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  podBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
