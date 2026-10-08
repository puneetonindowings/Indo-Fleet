import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Package, MapPin, User, ArrowRight, ShieldCheck, Clock } from 'lucide-react-native';
import { DeliveryOrder } from '../types';

interface OrderSelectorProps {
  orders: DeliveryOrder[];
  selectedOrderId: string | null;
  onSelectOrder: (order: DeliveryOrder) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

export const OrderSelector: React.FC<OrderSelectorProps> = ({
  orders,
  selectedOrderId,
  onSelectOrder,
  refreshing,
  onRefresh,
}) => {
  const renderItem = ({ item }: { item: DeliveryOrder }) => {
    const isSelected = item.id === selectedOrderId;
    const isFlightReady = item.status === 'assigned' || item.status === 'pending';
    const isInFlight = item.status === 'in-flight';

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => onSelectOrder(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderIdBadge}>
            <Package size={14} color="#8B5CF6" />
            <Text style={styles.orderIdText}>{item.order_number || item.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View
            style={[
              styles.statusTag,
              isInFlight
                ? styles.statusTagInFlight
                : isFlightReady
                ? styles.statusTagReady
                : styles.statusTagDelivered,
            ]}
          >
            <Text
              style={[
                styles.statusTagText,
                isInFlight
                  ? styles.statusTagTextInFlight
                  : isFlightReady
                  ? styles.statusTagTextReady
                  : styles.statusTagTextDelivered,
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.clientRow}>
          <User size={15} color="#64748B" />
          <Text style={styles.clientName}>{item.customer_name || 'Customer'}</Text>
          {item.weight_kg && (
            <Text style={styles.weightBadge}>Payload: {item.weight_kg} kg</Text>
          )}
        </View>

        <View style={styles.addressRow}>
          <MapPin size={15} color="#EF4444" style={styles.pinIcon} />
          <Text style={styles.addressText} numberOfLines={2}>
            {item.delivery_address || 'Co-ordinates Drop Site'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.timeInfo}>
            <Clock size={12} color="#64748B" />
            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>
              {isInFlight ? 'Resume Telemetry' : 'Select Flight'}
            </Text>
            <ArrowRight size={14} color="#8B5CF6" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <ShieldCheck size={18} color="#8B5CF6" />
          <Text style={styles.sectionTitle}>AVAILABLE DISPATCH SORTIES</Text>
        </View>
        <Text style={styles.orderCount}>{orders.length} Active</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Package size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No Dispatch Orders</Text>
            <Text style={styles.emptySubtitle}>
              Pull down to refresh or check server connectivity in settings.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  orderCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusTagReady: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  statusTagInFlight: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  statusTagDelivered: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTagTextReady: {
    color: '#60A5FA',
  },
  statusTagTextInFlight: {
    color: '#A78BFA',
  },
  statusTagTextDelivered: {
    color: '#34D399',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
    flex: 1,
  },
  weightBadge: {
    fontSize: 11,
    color: '#94A3B8',
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 12,
    backgroundColor: '#1E293B',
    padding: 8,
    borderRadius: 8,
  },
  pinIcon: {
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    color: '#CBD5E1',
    flex: 1,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
