import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Layers, Package, Clock, ShieldCheck } from 'lucide-react-native';
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
  onViewHistory?: () => void;
  onInspectDrone?: (order?: DeliveryOrder) => void;
}

type FilterTab = 'all' | 'assigned' | 'in-flight' | 'queue';

// Same filter rules as before, now defined once and reused for the pills, counts and empty states
const FILTERS: {
  key: FilterTab;
  label: string;
  match: (o: DeliveryOrder) => boolean;
  empty: string;
}[] = [
  { key: 'all', label: 'All', match: () => true, empty: 'There are no flight missions assigned right now.' },
  {
    key: 'assigned',
    label: 'Assigned',
    match: (o) => o.status === 'assigned' || o.pilot_acceptance_status === 'pending_acceptance',
    empty: 'No flight sorties are waiting for your acceptance.',
  },
  {
    key: 'in-flight',
    label: 'In Flight',
    match: (o) => o.status === 'in-flight',
    empty: 'No UAV sorties currently in flight.',
  },
  { key: 'queue', label: 'Queue', match: (o) => o.status === 'pending', empty: 'Sortie queue is clear.' },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

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
  onViewHistory,
  onInspectDrone,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const activeFilter = FILTERS.find((f) => f.key === filterTab) || FILTERS[0];

  const filteredOrders = useMemo(
    () => orders.filter(activeFilter.match),
    [orders, activeFilter]
  );

  // Real counts from the orders list
  const counts = useMemo(() => {
    const result = {} as Record<FilterTab, number>;
    FILTERS.forEach((f) => {
      result[f.key] = orders.filter(f.match).length;
    });
    return result;
  }, [orders]);

  const displayName = user?.name || 'Remote Pilot';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'P';

  const renderItem = useCallback(
    ({ item }: { item: DeliveryOrder }) => (
      <OrderCard
        order={item}
        onAcceptPress={onAcceptOrder}
        onStartFlightPress={onStartFlight}
        onCompletePodPress={onCompletePod}
        onViewRadarPress={onViewRadar}
        onInspectPress={onInspectDrone}
      />
    ),
    [onAcceptOrder, onStartFlight, onCompletePod, onViewRadar, onInspectDrone]
  );

  // Passed as an element (not a component function) so the header is not remounted on every render
  const header = (
    <View style={styles.headerArea}>
      {/* Welcome banner with live order counts */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.welcomeTextGroup}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.pilotNameText} numberOfLines={1}>
              {displayName}
            </Text>
            {!!user?.station && (
              <Text style={styles.stationText} numberOfLines={1}>
                Station: {user.station}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.statRow}>
          {[
            { label: 'Assigned', value: counts.assigned },
            { label: 'In flight', value: counts['in-flight'] },
            { label: 'In queue', value: counts.queue },
          ].map((s) => (
            <View key={s.label} style={styles.statChip}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* KPI Metrics */}
      <KpiOverview kpis={kpis} />

      {/* Performance Trends Chart */}
      <PerformanceChart chartData={chartData} />

      {/* Orders header + filters */}
      <View style={styles.sortiesHeader}>
        <View style={styles.sortiesTitleRow}>
          <View style={styles.titleLeftGroup}>
            <View style={styles.titleIcon}>
              <Layers size={14} color="#3B0080" />
            </View>
            <Text style={styles.sortiesTitle}>Assigned Sortie Missions &amp; Tasks</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {onInspectDrone && (
              <TouchableOpacity
                style={[styles.historyBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                onPress={() => onInspectDrone()}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Post-delivery drone inspection"
              >
                <ShieldCheck size={13} color="#059669" />
                <Text style={[styles.historyBtnText, { color: '#059669' }]}>Inspect Drone</Text>
              </TouchableOpacity>
            )}
            {onViewHistory && (
              <TouchableOpacity
                style={styles.historyBtn}
                onPress={onViewHistory}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Open order history"
              >
                <Clock size={13} color="#3B0080" />
                <Text style={styles.historyBtnText}>History</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabs}
        >
          {FILTERS.map((f) => {
            const active = filterTab === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => setFilterTab(f.key)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${f.label}, ${counts[f.key]} orders`}
              >
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                  {f.label}
                </Text>
                <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                  <Text style={[styles.countBadgeText, active && styles.countBadgeTextActive]}>
                    {counts[f.key]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5A00B8"
            colors={['#5A00B8']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Package size={30} color="#5A00B8" />
            </View>
            <Text style={styles.emptyTitle}>Nothing to show here</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter.empty} Pull down to refresh, or check for new assignments from the Dispatcher.
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
    paddingBottom: 110,
  },
  headerArea: {
    marginBottom: 8,
  },

  // Welcome banner
  welcomeBanner: {
    backgroundColor: '#3B0080',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  welcomeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  welcomeTextGroup: {
    flex: 1,
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 1,
  },
  pilotNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stationText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },

  // Orders header
  sortiesHeader: {
    marginBottom: 14,
    gap: 12,
  },
  sortiesTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortiesTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  historyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B21A8',
  },

  // Filter pills
  filterTabs: {
    gap: 8,
    paddingRight: 4,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: '#3B0080',
    borderColor: '#3B0080',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  countBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  countBadgeTextActive: {
    color: '#FFFFFF',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
});