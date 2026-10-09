import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {
  LayoutDashboard,
  Navigation,
  User,
  AlertOctagon,
  Headphones,
  Settings,
  LogOut,
  X,
  Shield,
  Truck,
  CheckCircle2,
} from 'lucide-react-native';
import { UserProfile } from '../types';

interface SidebarDrawerProps {
  visible: boolean;
  onClose: () => void;
  activeScreen: string;
  onNavigate: (screen: string) => void;
  user: UserProfile | null;
  onLogout: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  visible,
  onClose,
  activeScreen,
  onNavigate,
  user,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'radar', label: 'Flight Radar', icon: Navigation },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'sos', label: 'Emergency SOS', icon: AlertOctagon, isDanger: true },
    { id: 'support', label: 'Support Desk', icon: Headphones },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.drawer}>
          {/* Drawer Top / Pilot Card */}
          <View style={styles.drawerHeader}>
            <View style={styles.pilotProfileRow}>
              <View style={styles.avatarBadge}>
                <Shield size={22} color="#3B0080" />
              </View>
              <View style={styles.pilotInfo}>
                <Text style={styles.pilotName} numberOfLines={1}>
                  {user?.name || 'Flight Pilot'}
                </Text>
                <View style={styles.roleRow}>
                  <View style={styles.rolePill}>
                    <Text style={styles.rolePillText}>
                      {(user?.role || 'PILOT').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.stationText} numberOfLines={1}>
                    {user?.station || 'IndoFleet Base'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Vehicle / DL Meta Bar */}
          {user?.vehicle_id || user?.dl_id ? (
            <View style={styles.metaBox}>
              {user.vehicle_id && (
                <View style={styles.metaItem}>
                  <Truck size={12} color="#3B0080" />
                  <Text style={styles.metaLabel}>Vehicle:</Text>
                  <Text style={styles.metaVal}>{user.vehicle_id}</Text>
                </View>
              )}
              {user.dl_id && (
                <View style={styles.metaItem}>
                  <CheckCircle2 size={12} color="#059669" />
                  <Text style={styles.metaLabel}>DL No:</Text>
                  <Text style={styles.metaVal}>{user.dl_id}</Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Nav Links */}
          <ScrollView style={styles.navLinks} contentContainerStyle={styles.navLinksContent}>
            {navItems.map((item) => {
              const isActive = activeScreen === item.id;
              const Icon = item.icon;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.navItem,
                    isActive && styles.navItemActive,
                    item.isDanger && styles.navItemDanger,
                  ]}
                  onPress={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      isActive && styles.iconWrapActive,
                      item.isDanger && styles.iconWrapDanger,
                    ]}
                  >
                    <Icon
                      size={18}
                      color={
                        item.isDanger
                          ? '#DC2626'
                          : isActive
                          ? '#FFFFFF'
                          : '#64748B'
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.navItemText,
                      isActive && styles.navItemTextActive,
                      item.isDanger && styles.navItemTextDanger,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Logout Button */}
          <View style={styles.drawerFooter}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                onClose();
                onLogout();
              }}
              activeOpacity={0.7}
            >
              <LogOut size={16} color="#DC2626" />
              <Text style={styles.logoutBtnText}>End Shift & Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawer: {
    width: '82%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    display: 'flex',
    justifyContent: 'space-between',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  pilotProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pilotInfo: {
    flex: 1,
  },
  pilotName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rolePill: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 0.5,
  },
  stationText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  metaBox: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metaVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  navLinks: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navLinksContent: {
    padding: 16,
    gap: 8,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: '#3B0080',
  },
  navItemDanger: {
    backgroundColor: '#FEF2F2',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconWrapDanger: {
    backgroundColor: '#FEE2E2',
  },
  navItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    flex: 1,
  },
  navItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  navItemTextDanger: {
    color: '#DC2626',
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  versionText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

