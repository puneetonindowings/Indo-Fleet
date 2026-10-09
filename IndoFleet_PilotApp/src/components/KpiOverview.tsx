import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  PackageCheck,
  Clock,
  AlertTriangle,
  Layers,
  Calendar,
  Award,
} from 'lucide-react-native';
import { PilotKpis } from '../types';

interface KpiOverviewProps {
  kpis: PilotKpis;
}

export const KpiOverview: React.FC<KpiOverviewProps> = ({ kpis }) => {
  return (
    <View style={styles.container}>
      {/* Primary KPI Hero Grid */}
      <View style={styles.heroRow}>
        {/* Total Assigned */}
        <View style={[styles.card, styles.cardAssigned]}>
          <View style={styles.cardHeader}>
            <Layers size={14} color="#60A5FA" />
            <Text style={styles.cardTitle}>ASSIGNED</Text>
          </View>
          <Text style={styles.cardBigNumber}>{kpis.total_assigned}</Text>
          <Text style={styles.cardSub}>Active Sorties</Text>
        </View>

        {/* Total Delivered */}
        <View style={[styles.card, styles.cardDelivered]}>
          <View style={styles.cardHeader}>
            <PackageCheck size={14} color="#10B981" />
            <Text style={styles.cardTitle}>DELIVERED</Text>
          </View>
          <Text style={styles.cardBigNumber}>{kpis.total_delivered}</Text>
          <Text style={styles.cardSub}>Successful Drops</Text>
        </View>
      </View>

      <View style={styles.heroRow}>
        {/* Total Missed */}
        <View style={[styles.card, styles.cardMissed]}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={14} color="#EF4444" />
            <Text style={styles.cardTitle}>MISSED</Text>
          </View>
          <Text style={styles.cardBigNumber}>{kpis.total_missed}</Text>
          <Text style={styles.cardSub}>Cancelled / Timed</Text>
        </View>

        {/* Total Queue */}
        <View style={[styles.card, styles.cardQueue]}>
          <View style={styles.cardHeader}>
            <Clock size={14} color="#F59E0B" />
            <Text style={styles.cardTitle}>IN QUEUE</Text>
          </View>
          <Text style={styles.cardBigNumber}>{kpis.total_queue}</Text>
          <Text style={styles.cardSub}>Pending Dispatch</Text>
        </View>
      </View>

      {/* Today's Metrics Ribbon */}
      <View style={styles.todayRibbon}>
        <View style={styles.todayHeader}>
          <View style={styles.todayTitleRow}>
            <Calendar size={14} color="#8B5CF6" />
            <Text style={styles.todayTitle}>TODAY'S SORTIE METRICS</Text>
          </View>
        </View>

        <View style={styles.todayGrid}>
          <View style={styles.todayCol}>
            <Text style={styles.todayVal}>{kpis.todays_total}</Text>
            <Text style={styles.todayLbl}>Today Orders</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayCol}>
            <Text style={[styles.todayVal, { color: '#60A5FA' }]}>{kpis.todays_assigned}</Text>
            <Text style={styles.todayLbl}>Assigned</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayCol}>
            <Text style={[styles.todayVal, { color: '#10B981' }]}>{kpis.todays_delivered}</Text>
            <Text style={styles.todayLbl}>Delivered</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayCol}>
            <Text style={[styles.todayVal, { color: '#EF4444' }]}>{kpis.todays_missed}</Text>
            <Text style={styles.todayLbl}>Missed</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayCol}>
            <Text style={[styles.todayVal, { color: '#F59E0B' }]}>{kpis.todays_queue}</Text>
            <Text style={styles.todayLbl}>Queue</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardAssigned: {
    borderColor: '#DBEAFE',
    backgroundColor: '#F0F7FF',
  },
  cardDelivered: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  cardMissed: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  cardQueue: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  cardBigNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginVertical: 2,
    fontVariant: ['tabular-nums'],
  },
  cardSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  todayRibbon: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B0080',
    letterSpacing: 0.8,
  },
  completionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  todayGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  todayCol: {
    flex: 1,
    alignItems: 'center',
  },
  todayDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#CBD5E1',
  },
  todayVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  todayLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
});
