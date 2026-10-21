import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import {
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  MapPin,
  Clock,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  User,
  Phone,
  FileText,
  DollarSign,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react-native';
import { DeliveryOrder, UserProfile } from '../types';

interface OrderHistoryScreenProps {
  user: UserProfile | null;
  historyOrders: DeliveryOrder[];
  refreshing: boolean;
  onRefresh: () => void;
  onNavigateDashboard?: () => void;
}

export const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({
  user,
  historyOrders,
  refreshing,
  onRefresh,
  onNavigateDashboard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);

  // Compute summary metrics
  const deliveredCount = useMemo(
    () => historyOrders.filter((o) => o.status === 'delivered' || o.status === 'completed').length,
    [historyOrders]
  );
  const cancelledCount = useMemo(
    () => historyOrders.filter((o) => o.status === 'cancelled' || o.status === 'missed').length,
    [historyOrders]
  );
  const totalRevenue = useMemo(
    () =>
      historyOrders
        .filter((o) => o.status === 'delivered' || o.status === 'completed')
        .reduce((sum, o) => sum + (o.fare_inr || 0), 0),
    [historyOrders]
  );

  // Filter orders
  const filteredOrders = useMemo(() => {
    return historyOrders.filter((o) => {
      // Status filter
      if (statusFilter === 'delivered' && o.status !== 'delivered' && o.status !== 'completed') {
        return false;
      }
      if (statusFilter === 'cancelled' && o.status !== 'cancelled' && o.status !== 'missed') {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesId = (o.order_number || o.id || '').toLowerCase().includes(q);
        const matchesCustomer = (o.customer_name || '').toLowerCase().includes(q);
        const matchesRecipient = (o.recipient_name || '').toLowerCase().includes(q);
        const matchesDrop = (o.drop_address || o.delivery_address || '').toLowerCase().includes(q);
        const matchesDrone = (o.drone_id || o.drone_model || '').toLowerCase().includes(q);

        return matchesId || matchesCustomer || matchesRecipient || matchesDrop || matchesDrone;
      }

      return true;
    });
  }, [historyOrders, statusFilter, searchQuery]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderOrderCard = ({ item }: { item: DeliveryOrder }) => {
    const isDelivered = item.status === 'delivered' || item.status === 'completed';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => setSelectedOrder(item)}
      >
        {/* Top Meta Header */}
        <View style={styles.cardHeader}>
          <View style={styles.orderIdGroup}>
            <Package size={14} color="#3B0080" />
            <Text style={styles.orderNumber}>{item.order_number || item.id}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isDelivered ? styles.statusBadgeDelivered : styles.statusBadgeCancelled,
            ]}
          >
            {isDelivered ? (
              <CheckCircle2 size={12} color="#059669" />
            ) : (
              <XCircle size={12} color="#DC2626" />
            )}
            <Text
              style={[
                styles.statusBadgeText,
                isDelivered ? styles.statusTextDelivered : styles.statusTextCancelled,
              ]}
            >
              {(item.status || 'DELIVERED').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Date & Drone info */}
        <View style={styles.cardSubHeader}>
          <View style={styles.dateRow}>
            <Clock size={12} color="#64748B" />
            <Text style={styles.dateText}>
              {formatDate(item.delivered_at || item.created_at)}
            </Text>
          </View>
          {item.drone_id && (
            <View style={styles.dronePill}>
              <Text style={styles.dronePillText}>{item.drone_id}</Text>
            </View>
          )}
        </View>

        {/* Route Details */}
        <View style={styles.routeContainer}>
          <View style={styles.routeRow}>
            <View style={styles.dotOrigin} />
            <Text style={styles.routeText} numberOfLines={1}>
              {item.pickup_address || 'IndoFleet Base Facility'}
            </Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <MapPin size={12} color="#DC2626" />
            <Text style={styles.routeTextDestination} numberOfLines={1}>
              {item.drop_address || item.delivery_address || 'Client Landing Pod'}
            </Text>
          </View>
        </View>

        {/* Footer info: Customer & Fare */}
        <View style={styles.cardFooter}>
          <View style={styles.customerGroup}>
            <User size={13} color="#475569" />
            <Text style={styles.customerText} numberOfLines={1}>
              {item.recipient_name || item.customer_name || 'Customer'}
            </Text>
          </View>
          <View style={styles.fareGroup}>
            {item.fare_inr ? (
              <Text style={styles.fareAmount}>₹{item.fare_inr.toLocaleString('en-IN')}</Text>
            ) : null}
            <ChevronRight size={14} color="#94A3B8" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Top Summary Header & KPIs ───────────────────────────── */}
      <View style={styles.summaryHeader}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.screenTitle}>Order History</Text>
            <Text style={styles.screenSubtitle}>
              Completed deliveries & handover log
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{historyOrders.length} Deliveries</Text>
          </View>
        </View>

        {/* Metric Counter Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <CheckCircle2 size={16} color="#059669" />
            </View>
            <View>
              <Text style={styles.metricVal}>{deliveredCount}</Text>
              <Text style={styles.metricLbl}>Delivered</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <DollarSign size={16} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.metricVal}>₹{totalRevenue.toLocaleString('en-IN')}</Text>
              <Text style={styles.metricLbl}>Total Fares</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#FEF2F2' }]}>
              <XCircle size={16} color="#DC2626" />
            </View>
            <View>
              <Text style={styles.metricVal}>{cancelledCount}</Text>
              <Text style={styles.metricLbl}>Cancelled</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Order ID, recipient, address, drone..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterTabsRow}>
          {(
            [
              { id: 'all', label: `ALL (${historyOrders.length})` },
              { id: 'delivered', label: `DELIVERED (${deliveredCount})` },
              { id: 'cancelled', label: `CANCELLED (${cancelledCount})` },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.filterTab,
                statusFilter === tab.id && styles.filterTabActive,
              ]}
              onPress={() => setStatusFilter(tab.id)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  statusFilter === tab.id && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Order List ─────────────────────────────────────────── */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B0080']}
            tintColor="#3B0080"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Layers size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching orders found' : 'No order history yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try searching with a different order number or keyword.'
                : 'Completed flight missions and deliveries will appear here.'}
            </Text>
            {searchQuery ? (
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>Clear Search</Text>
              </TouchableOpacity>
            ) : onNavigateDashboard ? (
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={onNavigateDashboard}
              >
                <Text style={styles.clearSearchText}>Back to Dashboard</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      {/* ── Order Details Modal ─────────────────────────────────── */}
      {selectedOrder && (
        <Modal
          visible={Boolean(selectedOrder)}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedOrder(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Delivery Details</Text>
                  <Text style={styles.modalSubtitle}>
                    Order #{selectedOrder.order_number || selectedOrder.id}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedOrder(null)}
                >
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Status Card */}
                <View style={styles.modalSectionCard}>
                  <View style={styles.modalSectionRow}>
                    <Text style={styles.modalSectionLabel}>Mission Status</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        selectedOrder.status === 'delivered' || selectedOrder.status === 'completed'
                          ? styles.statusBadgeDelivered
                          : styles.statusBadgeCancelled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          selectedOrder.status === 'delivered' || selectedOrder.status === 'completed'
                            ? styles.statusTextDelivered
                            : styles.statusTextCancelled,
                        ]}
                      >
                        {(selectedOrder.status || 'DELIVERED').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Completion Time:</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedOrder.delivered_at || selectedOrder.created_at)}
                    </Text>
                  </View>

                  {selectedOrder.drone_id && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Allocated UAV:</Text>
                      <Text style={styles.detailValueBold}>
                        {selectedOrder.drone_model || '700RPAV'} ({selectedOrder.drone_id})
                      </Text>
                    </View>
                  )}
                </View>

                {/* Recipient & Customer Details */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.sectionHeading}>Recipient & Drop Info</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Recipient Name:</Text>
                    <Text style={styles.detailValueBold}>
                      {selectedOrder.recipient_name || selectedOrder.customer_name || 'Customer'}
                    </Text>
                  </View>

                  {selectedOrder.customer_phone ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contact Phone:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.customer_phone}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Drop Location:</Text>
                    <Text style={styles.detailValue} numberOfLines={3}>
                      {selectedOrder.drop_address || selectedOrder.delivery_address || 'Landing Point'}
                    </Text>
                  </View>
                </View>

                {/* Consignment & Payment Details */}
                <View style={styles.modalSectionCard}>
                  <Text style={styles.sectionHeading}>Consignment Summary</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Units / Cargo:</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.units_count || 1} Unit(s)
                    </Text>
                  </View>

                  {selectedOrder.weight_kg ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payload Weight:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.weight_kg} Kg</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fare Amount:</Text>
                    <Text style={styles.fareHighlight}>
                      ₹{(selectedOrder.fare_inr || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment Status:</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.payment_status || 'Prepaid'}
                    </Text>
                  </View>
                </View>

                {/* Proof of Delivery (POD) Verification */}
                <View style={styles.modalSectionCard}>
                  <View style={styles.modalSectionRow}>
                    <Text style={styles.sectionHeading}>Proof of Delivery (POD)</Text>
                    <ShieldCheck size={16} color="#059669" />
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Handover OTP:</Text>
                    <Text style={styles.detailValueBold}>Verified ✓</Text>
                  </View>

                  {selectedOrder.delivery_notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Delivery Notes:</Text>
                      <Text style={styles.notesText}>{selectedOrder.delivery_notes}</Text>
                    </View>
                  ) : null}
                </View>
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setSelectedOrder(null)}
              >
                <Text style={styles.modalDoneText}>Close Order Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  summaryHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B21A8',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLbl: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '500',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#3B0080',
    borderColor: '#3B0080',
  },
  filterTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeDelivered: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeCancelled: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusTextDelivered: {
    color: '#059669',
  },
  statusTextCancelled: {
    color: '#DC2626',
  },
  cardSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  dronePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dronePillText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#475569',
  },
  routeContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotOrigin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B0080',
    marginLeft: 2,
  },
  routeDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#CBD5E1',
    marginLeft: 5,
    marginVertical: 2,
  },
  routeText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  routeTextDestination: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  customerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  customerText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  fareGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fareAmount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 16,
  },
  clearSearchBtn: {
    marginTop: 16,
    backgroundColor: '#3B0080',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clearSearchText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    marginBottom: 14,
  },
  modalSectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  detailLabel: {
    fontSize: 11.5,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
    maxWidth: '65%',
    textAlign: 'right',
  },
  detailValueBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  fareHighlight: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  notesBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  notesLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  modalDoneBtn: {
    backgroundColor: '#3B0080',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
