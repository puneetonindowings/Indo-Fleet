import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  PackageCheck,
  Navigation,
  Layers,
  Calendar,
} from 'lucide-react-native';
import { PilotKpis } from '../types';

interface KpiOverviewProps {
  kpis: PilotKpis;
  inTransitCount?: number;
}

export const KpiOverview: React.FC<KpiOverviewProps> = ({ kpis, inTransitCount }) => {
  const transitVal = inTransitCount !== undefined ? inTransitCount : (kpis.in_transit ?? 0);

  return (
    <View style={styles.container}>
      {/* 2x2 Metric Hero Cards: Assigned, In Transit, Today's Delivery, Total Delivered */}
      <View style={styles.heroRow}>
        {/* 1. Assigned */}
        <View style={[styles.card, styles.cardAssigned]}>
          <View style={styles.cardHeader}>
            <Layers size={14} color="#2563EB" />
            <Text style={[styles.cardTitle, { color: '#2563EB' }]}>ASSIGNED</Text>
          </View>
          <Text style={styles.cardBigNumber}>{kpis.total_assigned}</Text>
          <Text style={styles.cardSub}>Active Deliveries</Text>
        </View>

        {/* 2. In Transit */}
        <View style={[styles.card, styles.cardTransit]}>
          <View style={styles.cardHeader}>
            <Navigation size={14} color="#7C3AED" />
            <Text style={[styles.cardTitle, { color: '#7C3AED' }]}>IN TRANSIT</Text>
          </View>
          <Text style={styles.cardBigNumber}>{transitVal}</Text>
          <Text style={styles.cardSub}>Live on Route</Text>
        </View>
      </View>

      <View style={styles.heroRow}>
        {/* 3. Today's Delivery */}
        <View style={[styles.card, styles.cardToday]}>
          <View style={styles.cardHeader}>
            <Calendar size={14} color="#0D9488" />
            <Text style={[styles.cardTitle, { color: '#0D9488' }]}>TODAY'S DELIVERY</Text>
          </View>
          <Text style={styles.cardBigNumber}>{kpis.todays_delivered}</Text>
          <Text style={styles.cardSub}>Completed Today</Text>
        </View>

        {/* 4. Total Delivered */}
        <View style={[styles.card, styles.cardDelivered]}>
          <View style={styles.cardHeader}>
            <PackageCheck size={14} color="#059669" />
            <Text style={[styles.cardTitle, { color: '#059669' }]}>TOTAL DELIVERED</Text>
          </View>
          <Text style={styles.cardBigNumber}>{kpis.total_delivered}</Text>
          <Text style={styles.cardSub}>All-Time Success</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAssigned: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  cardTransit: {
    borderColor: '#DDD6FE',
    backgroundColor: '#F5F3FF',
  },
  cardToday: {
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  cardDelivered: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardBigNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  cardSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
});
