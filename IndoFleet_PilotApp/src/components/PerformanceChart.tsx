import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart3, TrendingUp } from 'lucide-react-native';
import { ChartData } from '../types';

interface PerformanceChartProps {
  chartData: ChartData;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ chartData }) => {
  const maxCompleted = Math.max(...chartData.weekly_trend.map((d) => d.completed), 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <BarChart3 size={16} color="#8B5CF6" />
          <Text style={styles.title}>WEEKLY FLIGHT DISPATCH PERFORMANCE</Text>
        </View>
        <View style={styles.trendPill}>
          <TrendingUp size={12} color="#10B981" />
          <Text style={styles.trendText}>+18.4% vs last week</Text>
        </View>
      </View>

      {/* Bar Chart Visualization */}
      <View style={styles.chartContainer}>
        <View style={styles.barsRow}>
          {chartData.weekly_trend.map((item, idx) => {
            const heightPct = Math.round((item.completed / maxCompleted) * 100);
            const isToday = idx === chartData.weekly_trend.length - 1;

            return (
              <View key={item.day} style={styles.barCol}>
                <Text style={styles.barVal}>{item.completed}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.max(heightPct, 12)}%` },
                      isToday ? styles.barFillToday : null,
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isToday ? styles.barLabelToday : null]}>
                  {item.day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Hourly Dispatch Distribution Strip */}
      <View style={styles.hourlyStrip}>
        <Text style={styles.hourlyHeading}>PEAK TRANSIT HOURS (TODAY)</Text>
        <View style={styles.hourlyTags}>
          {chartData.hourly_active.map((h) => (
            <View key={h.time} style={styles.hourlyTag}>
              <Text style={styles.hourlyTime}>{h.time}</Text>
              <Text style={styles.hourlyOrders}>{h.orders} drops</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  trendText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  chartContainer: {
    paddingVertical: 10,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    gap: 6,
  },
  barVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    width: 18,
    height: 75,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#3B0080',
    borderRadius: 7,
  },
  barFillToday: {
    backgroundColor: '#10B981',
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  barLabelToday: {
    color: '#059669',
    fontWeight: '900',
  },
  hourlyStrip: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  hourlyHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  hourlyTags: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  hourlyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hourlyTime: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  hourlyOrders: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B0080',
  },
});
