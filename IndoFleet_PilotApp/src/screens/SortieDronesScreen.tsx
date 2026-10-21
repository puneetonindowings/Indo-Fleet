import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  Camera,
  MapPin,
  User,
  Phone,
  Truck,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  Package,
} from 'lucide-react-native';
import { DeliveryOrder } from '../types';

interface SortieDronesScreenProps {
  order: DeliveryOrder | null;
  inspectedDroneIds: string[];
  stage?: 'hub_pickup' | 'customer_delivery';
  onBack: () => void;
  onScanDrone: (slotIndex: number) => void;
  onReinspectDrone?: (droneId: string, slotIndex: number) => void;
  onCompleteHandover: (order: DeliveryOrder) => void;
  onAcceptOrder?: (order: DeliveryOrder) => void;
}

export const SortieDronesScreen: React.FC<SortieDronesScreenProps> = ({
  order,
  inspectedDroneIds = [],
  stage = 'customer_delivery',
  onBack,
  onScanDrone,
  onReinspectDrone,
  onCompleteHandover,
  onAcceptOrder,
}) => {
  if (!order) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No active order selected for sortie verification.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cleanOrderNumber = order.order_number || order.id.slice(0, 8).toUpperCase();

  // Calculate total airframes in this sortie
  const totalDroneCount = Math.max(
    order.units_count || 1,
    (order.reserved_inventory_ids || []).length,
    (order.items || []).length,
    1
  );

  const isHubStage = stage === 'hub_pickup';

  const inspectedList = Array.from(
    new Set([
      ...inspectedDroneIds,
      ...(isHubStage ? (order.hub_inspected_drone_ids || []) : (order.inspected_drone_ids || []))
    ])
  );

  const verifiedCount = inspectedList.length;
  const isAllInspected = verifiedCount >= totalDroneCount;
  const progressPct = Math.min(100, Math.round((verifiedCount / totalDroneCount) * 100));

  const handleCallCustomer = () => {
    if (order.customer_phone) {
      Linking.openURL(`tel:${order.customer_phone}`).catch(() => {});
    }
  };

  const handleReinspect = (droneId: string, slotIndex: number) => {
    Alert.alert(
      'Re-verify Airframe',
      `Airframe "${droneId}" is already verified for Order #${cleanOrderNumber}.\n\nChoose an action:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Scan QR Again',
          onPress: () => onScanDrone(slotIndex),
        },
        {
          text: 'Open Inspection Form',
          onPress: () => {
            if (onReinspectDrone) {
              onReinspectDrone(droneId, slotIndex);
            } else {
              onScanDrone(slotIndex);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            {isHubStage ? 'Hub Pre-Acceptance Verification' : 'Customer Handover Airframe Inspection'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isHubStage ? 'Hub Departure Check' : 'Destination Handover & POD'} • Order #{cleanOrderNumber}
          </Text>
        </View>
        <View style={styles.orderBadge}>
          <Package size={13} color="#4F46E5" />
          <Text style={styles.orderBadgeText}>{totalDroneCount} Drones</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sortie Mission Card */}
        <View style={styles.missionCard}>
          <View style={styles.missionHeader}>
            <View style={styles.missionTag}>
              <Truck size={14} color="#4F46E5" />
              <Text style={styles.missionTagText}>{order.drone_model || 'IndoWings 700 RPAV'}</Text>
            </View>
            <View style={[styles.statusPill, isAllInspected ? styles.statusPillSuccess : styles.statusPillWarning]}>
              <Text style={[styles.statusPillText, isAllInspected ? styles.statusPillTextSuccess : styles.statusPillTextWarning]}>
                {isAllInspected ? (isHubStage ? 'Hub Approved ✓' : 'All Verified ✓') : `${verifiedCount}/${totalDroneCount} Verified`}
              </Text>
            </View>
          </View>

          {/* Customer & Address Details */}
          <View style={styles.detailRow}>
            <View style={styles.customerBlock}>
              <User size={15} color="#64748B" />
              <Text style={styles.customerName} numberOfLines={1}>
                {order.customer_name || 'Customer'}
              </Text>
            </View>
            {order.customer_phone ? (
              <TouchableOpacity style={styles.callBtn} onPress={handleCallCustomer}>
                <Phone size={12} color="#059669" />
                <Text style={styles.callBtnText}>Call</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.addressBlock}>
            <MapPin size={15} color="#DC2626" style={{ marginTop: 2 }} />
            <Text style={styles.addressText} numberOfLines={2}>
              {order.drop_address || order.delivery_address || 'Delivery Address'}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>
                {isHubStage ? 'Hub Airframe Verification' : 'Delivery Readiness'}
              </Text>
              <Text style={styles.progressValue}>
                {verifiedCount} of {totalDroneCount} inspected ({progressPct}%)
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPct}%` },
                  isAllInspected && styles.progressBarFillComplete,
                ]}
              />
            </View>
          </View>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <ShieldCheck size={18} color="#4F46E5" />
          <Text style={styles.sectionTitle}>
            {isHubStage ? 'Hub Pre-Acceptance Drone Manifest' : 'Required Aircraft Airframes'}
          </Text>
        </View>
        <Text style={styles.sectionDesc}>
          {isHubStage
            ? 'Scan physical QR on each aircraft at the Central Hub before accepting delivery. Ensure battery is secured and aircraft is defect-free.'
            : 'Scan physical QR on each aircraft before customer handover. Each drone is authenticated against the order booked inventory.'}
        </Text>

        {/* Drone Cards List */}
        <View style={styles.dronesList}>
          {Array.from({ length: totalDroneCount }).map((_, idx) => {
            const verifiedDroneId = inspectedList[idx];
            const isVerified = Boolean(verifiedDroneId);

            return (
              <View
                key={idx}
                style={[
                  styles.droneCard,
                  isVerified ? styles.droneCardVerified : styles.droneCardPending,
                ]}
              >
                <View style={styles.droneCardTop}>
                  <View style={styles.droneCardLeft}>
                    <View
                      style={[
                        styles.numberBadge,
                        isVerified ? styles.numberBadgeVerified : styles.numberBadgePending,
                      ]}
                    >
                      {isVerified ? (
                        <CheckCircle size={18} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.numberBadgeText}>{idx + 1}</Text>
                      )}
                    </View>
                    <View style={styles.droneMeta}>
                      <Text style={styles.droneTitle}>Drone #{idx + 1}</Text>
                      {isVerified ? (
                        <View style={styles.verifiedIdRow}>
                          <Text style={styles.verifiedIdLabel}>Serial / ID:</Text>
                          <Text style={styles.verifiedIdVal}>{verifiedDroneId}</Text>
                        </View>
                      ) : (
                        <Text style={styles.pendingScanText}>
                          {isHubStage ? 'Awaiting Hub Inspection' : 'Awaiting Airframe QR Scan'}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.stateTag,
                      isVerified ? styles.stateTagVerified : styles.stateTagPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stateTagText,
                        isVerified ? styles.stateTagTextVerified : styles.stateTagTextPending,
                      ]}
                    >
                      {isVerified ? (isHubStage ? 'Hub Certified ✓' : 'Inspected ✓') : 'Pending'}
                    </Text>
                  </View>
                </View>

                {/* Card Action Button */}
                {!isVerified ? (
                  <TouchableOpacity
                    style={styles.scanActionBtn}
                    onPress={() => onScanDrone(idx)}
                    activeOpacity={0.85}
                  >
                    <Camera size={16} color="#FFFFFF" />
                    <Text style={styles.scanActionBtnText}>
                      {isHubStage
                        ? `Scan QR & Hub Inspect Drone #${idx + 1}`
                        : `Scan QR & Inspect Drone #${idx + 1}`}
                    </Text>
                    <ChevronRight size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.verifiedActionRow}>
                    <View style={styles.safetyCertifiedWrap}>
                      <ShieldCheck size={14} color="#059669" />
                      <Text style={styles.safetyCertifiedText}>
                        {isHubStage ? 'Hub Safety Verified' : 'Airframe Safety Certified'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.reinspectBtn}
                      onPress={() => onScanDrone(idx)}
                      activeOpacity={0.7}
                    >
                      <RotateCcw size={12} color="#64748B" />
                      <Text style={styles.reinspectBtnText}>Re-inspect</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Guidance Notice if incomplete */}
        {!isAllInspected && (
          <View style={styles.guidanceCard}>
            <AlertTriangle size={18} color="#D97706" style={{ marginTop: 2 }} />
            <Text style={styles.guidanceText}>
              {isHubStage
                ? `All ${totalDroneCount} aircraft airframes must be verified and inspected at the Hub before you can accept this order.`
                : `All ${totalDroneCount} aircraft airframes must be verified and safety inspected before Customer Handover OTP can be unlocked.`}
            </Text>
          </View>
        )}

        {/* Action CTA when all verified */}
        {isAllInspected && (
          <View style={styles.allCompleteCard}>
            <View style={styles.allCompleteTop}>
              <CheckCircle size={22} color="#059669" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.allCompleteTitle}>
                  {isHubStage ? 'Hub Airframe Verification Completed' : 'Sortie Airframes Verified'}
                </Text>
                <Text style={styles.allCompleteSub}>
                  {isHubStage
                    ? `All ${totalDroneCount} drones are verified and approved for Hub departure.`
                    : `All ${totalDroneCount} drones have been successfully inspected and verified.`}
                </Text>
              </View>
            </View>

            {isHubStage ? (
              <TouchableOpacity
                style={[styles.completeHandoverBtn, { backgroundColor: '#3B0080' }]}
                onPress={() => (onAcceptOrder ? onAcceptOrder(order) : onCompleteHandover(order))}
                activeOpacity={0.88}
              >
                <ShieldCheck size={18} color="#FFFFFF" />
                <Text style={styles.completeHandoverBtnText}>Proceed to Accept Order (Enter OTP)</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.completeHandoverBtn}
                onPress={() => onCompleteHandover(order)}
                activeOpacity={0.88}
              >
                <ShieldCheck size={18} color="#FFFFFF" />
                <Text style={styles.completeHandoverBtnText}>Proceed to Customer Handover & OTP</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  orderBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  missionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  missionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  missionTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A00B8',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusPillWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusPillTextSuccess: {
    color: '#059669',
  },
  statusPillTextWarning: {
    color: '#D97706',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  customerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  addressBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 14,
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 17,
  },
  progressContainer: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  progressBarFillComplete: {
    backgroundColor: '#059669',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 14,
  },
  dronesList: {
    gap: 12,
    marginBottom: 16,
  },
  droneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  droneCardPending: {
    borderColor: '#E2E8F0',
  },
  droneCardVerified: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  droneCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  droneCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBadgePending: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  numberBadgeVerified: {
    backgroundColor: '#059669',
  },
  numberBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4F46E5',
  },
  droneMeta: {
    flex: 1,
  },
  droneTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  pendingScanText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 2,
  },
  verifiedIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  verifiedIdLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  verifiedIdVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  stateTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stateTagPending: {
    backgroundColor: '#FEF3C7',
  },
  stateTagVerified: {
    backgroundColor: '#DCFCE7',
  },
  stateTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stateTagTextPending: {
    color: '#B45309',
  },
  stateTagTextVerified: {
    color: '#15803D',
  },
  scanActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  verifiedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  safetyCertifiedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  safetyCertifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  reinspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  reinspectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  guidanceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  guidanceText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    flex: 1,
    fontWeight: '600',
  },
  allCompleteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    shadowColor: '#059669',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  allCompleteTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  allCompleteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  allCompleteSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  completeHandoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  completeHandoverBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
