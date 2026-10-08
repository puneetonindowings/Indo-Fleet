import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Layers,
  Sparkles,
  Package,
} from 'lucide-react-native';
import { DeliveryOrder, PilotKpis, ChartData, UserProfile } from '../types';
import { KpiOverview } from '../components/KpiOverview';
import { PerformanceChart } from '../components/PerformanceChart';
import { OrderCard } from '../components/OrderCard';

interface DashboardScreenProps {
  user: UserProfile | null;
  kpis: PilotKpis;
  chartData: ChartData;
  orders: DeliveryOrder[];
  refreshing: boolean;
  onRefresh: () => void;
  onAcceptOrder: (order: DeliveryOrder) => void;
  onStartFlight: (order: DeliveryOrder) => void;
  onCompletePod: (order: DeliveryOrder) => void;
  onViewRadar: (order: DeliveryOrder) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  kpis,
  chartData,
  orders,
  refreshing,
  onRefresh,
  onAcceptOrder,
  onStartFlight,
  onCompletePod,
  onViewRadar,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'assigned' | 'in-flight' | 'queue'>('all');

  const filteredOrders = orders.filter((o) => {
    if (filterTab === 'all') return true;
    if (filterTab === 'assigned') return o.status === 'assigned' || o.pilot_acceptance_status === 'pending_acceptance';
    if (filterTab === 'in-flight') return o.status === 'in-flight';
    if (filterTab === 'queue') return o.status === 'pending';
    return true;
  });

  const renderHeader = () => (
    <View style={styles.headerArea}>
      {/* Pilot Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeTextGroup}>
          <Text style={styles.pilotNameText}>Welcome back, {user?.name || 'Delivery Partner'}</Text>
          <Text style={styles.stationText}>
            Station: {user?.station || 'IndoFleet Base Station'}
          </Text>
        </View>
      </View>

      {/* KPI Metrics */}
      <KpiOverview kpis={kpis} />

      {/* Performance Trends Chart */}
      <PerformanceChart chartData={chartData} />

      {/* Active Sorties Header & Filter Tabs */}
      <View style={styles.sortiesHeader}>
        <View style={styles.sortiesTitleRow}>
          <Layers size={16} color="#3B0080" />
          <Text style={styles.sortiesTitle}>Active Orders & Tasks</Text>
        </View>

        <View style={styles.filterTabs}>
          {(['all', 'assigned', 'in-flight', 'queue'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, filterTab === tab && styles.filterTabActive]}
              onPress={() => setFilterTab(tab)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === tab && styles.filterTabTextActive,
                ]}
              >
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onAcceptPress={onAcceptOrder}
            onStartFlightPress={onStartFlight}
            onCompletePodPress={onCompletePod}
            onViewRadarPress={onViewRadar}
          />
        )}
        ListHeaderComponent={renderHeader}
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
            <Package size={44} color="#334155" />
            <Text style={styles.emptyTitle}>No Orders Found in This View</Text>
            <Text style={styles.emptySubtitle}>
              Pull down to refresh or check pending assignments from Dispatcher.
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
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerArea: {
    marginBottom: 8,
  },
  welcomeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  welcomeTextGroup: {
    flex: 1,
  },
  greetingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3B0080',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  pilotNameText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 3,
  },
  stationText: {
    fontSize: 11,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  sortiesHeader: {
    marginBottom: 14,
    gap: 12,
  },
  sortiesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortiesTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3B0080',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#475569',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
