import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import {
  Package,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  Truck,
  Navigation,
  ExternalLink,
  CheckCircle,
  Zap,
  QrCode,
  Camera,
  ChevronRight,
} from 'lucide-react-native';
import { DeliveryOrder } from '../types';

interface OrderCardProps {
  order: DeliveryOrder;
  hubInspectedDroneIds?: string[];
  inspectedDroneIds?: string[];
  onAcceptPress: (order: DeliveryOrder) => void;
  onStartFlightPress: (order: DeliveryOrder) => void;
  onCompletePodPress: (order: DeliveryOrder) => void;
  onStartQrScanPress?: (order: DeliveryOrder, slotIndex?: number, stage?: 'hub_pickup' | 'customer_delivery') => void;
  onOpenSortieDrones?: (order: DeliveryOrder, stage?: 'hub_pickup' | 'customer_delivery') => void;
  onViewRadarPress: (order: DeliveryOrder) => void;
  onInspectPress?: (order: DeliveryOrder) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  hubInspectedDroneIds = [],
  inspectedDroneIds = [],
  onAcceptPress,
  onStartFlightPress,
  onCompletePodPress,
  onStartQrScanPress,
  onOpenSortieDrones,
  onViewRadarPress,
  onInspectPress,
}) => {
  const isPendingAcceptance = order.pilot_acceptance_status === 'pending_acceptance' && order.status !== 'in-flight' && order.status !== 'delivered';
  const isAccepted = order.pilot_acceptance_status === 'accepted' && order.status !== 'in-flight' && order.status !== 'delivered';
  const isInFlight = order.status === 'in-flight';
  const isDelivered = order.status === 'delivered';

  const totalDroneCount = Math.max(
    order.units_count || 1,
    (order.reserved_inventory_ids || []).length,
    (order.items || []).length,
    1
  );

  const hubInspectedList = Array.from(new Set([
    ...(hubInspectedDroneIds || []),
    ...(order.hub_inspected_drone_ids || [])
  ]));
  const isAllHubInspected = hubInspectedList.length >= totalDroneCount;

  const inspectedList = Array.from(new Set([
    ...(inspectedDroneIds || []),
    ...(order.inspected_drone_ids || [])
  ]));
  const isAllInspected = inspectedList.length >= totalDroneCount;

  const handleCallCustomer = () => {
    if (order.customer_phone) {
      Linking.openURL(`tel:${order.customer_phone}`);
    } else {
      Alert.alert('No Phone', 'Customer phone number is not available.');
    }
  };

  const handleOpenExternalMaps = () => {
    const rawAddress = order.drop_address || order.delivery_address || 'Delivery Point';
    const address = encodeURIComponent(rawAddress);
    const hasDirectCoords = Boolean(
      (order.drop_lat && order.drop_lng) ||
      (order.destination_location?.latitude && order.destination_location?.longitude) ||
      (order.delivery_lat && order.delivery_lng)
    );
    const lat = order.drop_lat || order.destination_location?.latitude || order.delivery_lat;
    const lng = order.drop_lng || order.destination_location?.longitude || order.delivery_lng;
    const destCoords = hasDirectCoords ? `${lat},${lng}` : address;
    const webUrl = hasDirectCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${address}&travelmode=driving`;
    const appNavUrl = `google.navigation:q=${destCoords}&mode=d`;
    const geoUrl = hasDirectCoords ? `geo:${lat},${lng}?q=${lat},${lng}(${address})` : `geo:0,0?q=${address}`;

    // 1. Web Environment (Desktop & Mobile Browser in React Native Web)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const w = window.open(webUrl, '_blank', 'noopener,noreferrer');
      if (!w || w.closed || typeof w.closed === 'undefined') {
        window.location.href = webUrl;
      }
      return;
    }

    // 2. Native Mobile (Turn-by-turn navigation in Google Maps app)
    Linking.canOpenURL(appNavUrl)
      .then((canOpen) => {
        if (canOpen) return Linking.openURL(appNavUrl);
        return Linking.openURL(webUrl);
      })
      .catch(() => {
        Linking.openURL(webUrl).catch(() => {
          Linking.openURL(geoUrl).catch(() => {
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destCoords}`);
          });
        });
      });
  };

  return (
    <View style={[styles.card, isInFlight && styles.cardInFlight]}>
      {/* Card Header: Order # & Status */}
      <View style={styles.cardHeader}>
        <View style={styles.orderIdBadge}>
          <Package size={14} color="#8B5CF6" />
          <Text style={styles.orderIdText} numberOfLines={1}>{order.order_number || order.id.slice(0, 8).toUpperCase()}</Text>
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
          <Text style={styles.assignedByText} numberOfLines={1}>
            Assigned by: <Text style={styles.assignedByName}>{order.assigned_by_name}</Text> ({order.assigned_by_role || 'Dispatcher'})
          </Text>
        </View>
      ) : null}

      {/* Customer & Phone Row */}
      <View style={styles.customerRow}>
        <View style={styles.customerNameGroup}>
          <User size={15} color="#64748B" />
          <Text style={styles.customerName} numberOfLines={1}>{order.customer_name || 'Customer'}</Text>
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

      {/* Drone Specs & Units */}
      <View style={styles.specsRow}>
        <View style={styles.specItem}>
          <Truck size={13} color="#3B0080" />
          <Text style={styles.specLabel}>Cargo Drone:</Text>
          <Text style={styles.specValue}>{order.drone_model || '700RPAV'}</Text>
        </View>
        <View style={styles.specItem}>
          <Package size={13} color="#64748B" />
          <Text style={styles.specLabel}>Consignment:</Text>
          <Text style={styles.specValue}>{totalDroneCount} Drone{totalDroneCount > 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Action Buttons Section */}
      <View style={styles.actionsContainer}>
        {isPendingAcceptance && (
          <View style={styles.inFlightActionStack}>
            {/* Hub Pre-Acceptance Drone Inspection Block */}
            <View style={styles.sortieSummaryCard}>
              <View style={styles.sortieSummaryHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <ShieldCheck size={16} color="#4F46E5" />
                  <Text style={styles.sortieSummaryTitle} numberOfLines={1}>
                    Hub Inspection ({hubInspectedList.length}/{totalDroneCount})
                  </Text>
                </View>
                <View style={[styles.sortieBadge, isAllHubInspected ? styles.sortieBadgeReady : styles.sortieBadgePending]}>
                  <Text style={[styles.sortieBadgeText, isAllHubInspected ? styles.sortieBadgeTextReady : styles.sortieBadgeTextPending]} numberOfLines={1}>
                    {isAllHubInspected ? 'Hub Verified ✓' : 'Inspection Required'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.openSortieBtn}
                onPress={() => (onOpenSortieDrones ? onOpenSortieDrones(order, 'hub_pickup') : onAcceptPress(order))}
                activeOpacity={0.85}
              >
                <Camera size={15} color="#FFFFFF" />
                <Text style={styles.openSortieBtnText} numberOfLines={1}>
                  {isAllHubInspected
                    ? 'View Hub Inspected Drones'
                    : `Hub Drone Inspection (${hubInspectedList.length}/${totalDroneCount})`}
                </Text>
                <ChevronRight size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Accept Order Action */}
            <TouchableOpacity
              style={[
                styles.acceptBtn,
                !isAllHubInspected && { backgroundColor: '#475569' }
              ]}
              onPress={() => {
                if (!isAllHubInspected) {
                  Alert.alert(
                    'Hub Drone Inspection Required',
                    `Please inspect all ${totalDroneCount} cargo drone airframes at the Hub before accepting the order.`,
                    [
                      {
                        text: 'Inspect at Hub',
                        onPress: () => onOpenSortieDrones && onOpenSortieDrones(order, 'hub_pickup'),
                      },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                  return;
                }
                onAcceptPress(order);
              }}
              activeOpacity={0.8}
            >
              <ShieldCheck size={16} color="#FFFFFF" />
              <Text style={styles.acceptBtnText}>
                {isAllHubInspected ? 'Accept Order (Enter OTP)' : `Accept Order (${hubInspectedList.length}/${totalDroneCount} Hub Verified)`}
              </Text>
            </TouchableOpacity>
          </View>
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
          <View style={styles.inFlightActionStack}>
            {/* Sortie Airframes Inspection Summary Card (Navigates to Dedicated Screen) */}
            <View style={styles.sortieSummaryCard}>
              <View style={styles.sortieSummaryHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <ShieldCheck size={16} color="#4F46E5" />
                  <Text style={styles.sortieSummaryTitle} numberOfLines={1}>
                    Sortie Drones ({inspectedList.length}/{totalDroneCount})
                  </Text>
                </View>
                <View style={[styles.sortieBadge, isAllInspected ? styles.sortieBadgeReady : styles.sortieBadgePending]}>
                  <Text style={[styles.sortieBadgeText, isAllInspected ? styles.sortieBadgeTextReady : styles.sortieBadgeTextPending]} numberOfLines={1}>
                    {isAllInspected ? 'Ready ✓' : 'Inspection Pending'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.openSortieBtn}
                onPress={() => (onOpenSortieDrones ? onOpenSortieDrones(order) : onStartQrScanPress ? onStartQrScanPress(order) : onCompletePodPress(order))}
                activeOpacity={0.85}
              >
                <Camera size={15} color="#FFFFFF" />
                <Text style={styles.openSortieBtnText} numberOfLines={1}>
                  {isAllInspected
                    ? 'View Inspected Drones & POD'
                    : `Verify Drones & Inspection (${inspectedList.length}/${totalDroneCount})`}
                </Text>
                <ChevronRight size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* If all inspected, show direct Complete Handover button */}
            {isAllInspected && (
              <TouchableOpacity
                style={[styles.podPrimaryBtn, { backgroundColor: '#059669', marginTop: 4 }]}
                onPress={() => onCompletePodPress(order)}
                activeOpacity={0.85}
              >
                <CheckCircle size={18} color="#FFFFFF" />
                <Text style={styles.podPrimaryBtnText}>
                  Complete Handover & POD
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.inFlightSubRow}>
              <TouchableOpacity
                style={styles.radarSecondaryBtn}
                onPress={() => onViewRadarPress(order)}
                activeOpacity={0.8}
              >
                <Navigation size={14} color="#5A00B8" />
                <Text style={styles.radarSecondaryBtnText}>In-App Radar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mapAppSecondaryBtn}
                onPress={handleOpenExternalMaps}
                activeOpacity={0.8}
              >
                <ExternalLink size={14} color="#2563EB" />
                <Text style={styles.mapAppSecondaryBtnText}>Google Maps</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isDelivered && onInspectPress && (
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: '#059669', height: 44, marginTop: 4 }]}
            onPress={() => onInspectPress(order)}
            activeOpacity={0.8}
          >
            <ShieldCheck size={16} color="#FFFFFF" />
            <Text style={styles.acceptBtnText}>Post-Delivery Inspection</Text>
          </TouchableOpacity>
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
    maxWidth: '62%',
    flexShrink: 1,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3B0080',
    letterSpacing: 0.5,
    flexShrink: 1,
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
  inFlightActionStack: {
    gap: 8,
    marginTop: 2,
  },
  podPrimaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 24,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#059669',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  podPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  inFlightSubRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radarSecondaryBtn: {
    flex: 1,
    backgroundColor: '#F3E8FF',
    borderRadius: 20,
    height: 42,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  radarSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5A00B8',
  },
  mapAppSecondaryBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    height: 42,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mapAppSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  sortieSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  sortieSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sortieSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  sortieBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  sortieBadgePending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sortieBadgeReady: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  sortieBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sortieBadgeTextPending: {
    color: '#B45309',
  },
  sortieBadgeTextReady: {
    color: '#047857',
  },
  openSortieBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  openSortieBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
});
