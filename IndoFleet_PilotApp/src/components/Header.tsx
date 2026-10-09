import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import {
  Plane,
  Radio,
  User,
  LogOut,
  Shield,
  Truck,
  CheckCircle2,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { UserProfile } from '../types';
import { IndoFleetLogo } from './IndoFleetLogo';

interface HeaderProps {
  serverConnected: boolean;
  isTracking: boolean;
  user: UserProfile | null;
  onNavigateProfile: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  serverConnected,
  isTracking,
  user,
  onNavigateProfile,
  onLogout,
}) => {
  const [profileMenuVisible, setProfileMenuVisible] = useState<boolean>(false);

  const getInitials = (name?: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* Official IndoFleet Brand Logo on Left */}
      <View style={styles.leftContainer}>
        <IndoFleetLogo size="small" showSubtitle={true} />
      </View>

      {/* Right Container: Profile Avatar Circle */}
      <View style={styles.rightContainer}>
        {/* Circular Profile Avatar Button */}
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => setProfileMenuVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Popup Menu Modal */}
      <Modal
        visible={profileMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setProfileMenuVisible(false)}
        >
          <Pressable style={styles.profileMenuCard} onPress={(e) => e.stopPropagation()}>
            {/* Header / Pilot Info */}
            <View style={styles.cardHeader}>
              <View style={styles.cardAvatar}>
                <Text style={styles.cardAvatarText}>{getInitials(user?.name)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {user?.name || 'Delivery Partner'}
                </Text>
                <View style={styles.cardRoleRow}>
                  <View style={styles.cardRoleBadge}>
                    <Text style={styles.cardRoleText}>
                      {(user?.role?.toLowerCase() === 'pilot' ? 'DELIVERY' : (user?.role || 'DELIVERY')).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.cardStation} numberOfLines={1}>
                    {user?.station || 'IndoFleet Hub'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.cardCloseBtn}
                onPress={() => setProfileMenuVisible(false)}
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Meta Tags */}
            {(user?.vehicle_id || user?.dl_id) && (
              <View style={styles.metaContainer}>
                {user.vehicle_id ? (
                  <View style={styles.metaBadge}>
                    <Truck size={12} color="#3B0080" />
                    <Text style={styles.metaText}>{user.vehicle_id}</Text>
                  </View>
                ) : null}
                {user.dl_id ? (
                  <View style={styles.metaBadge}>
                    <CheckCircle2 size={12} color="#059669" />
                    <Text style={styles.metaText}>DL: {user.dl_id}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Menu Items */}
            <View style={styles.menuItemsList}>
              {/* Profile Details Button */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setProfileMenuVisible(false);
                  onNavigateProfile();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuItemIconWrap}>
                    <User size={16} color="#3B0080" />
                  </View>
                  <View>
                    <Text style={styles.menuItemTitle}>My Profile & Credentials</Text>
                    <Text style={styles.menuItemSubtitle}>DL ID, Vehicle & Security</Text>
                  </View>
                </View>
                <ChevronRight size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <View style={styles.logoutWrapper}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  setProfileMenuVisible(false);
                  onLogout();
                }}
                activeOpacity={0.8}
              >
                <LogOut size={16} color="#DC2626" />
                <Text style={styles.logoutButtonText}>End Shift & Logout</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  brandTitleAccent: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3B0080',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3B0080',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#EDE9FE',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 65,
    paddingRight: 16,
  },
  profileMenuCard: {
    width: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE9FE',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarText: {
    color: '#3B0080',
    fontSize: 16,
    fontWeight: '900',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  cardRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardRoleBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  cardRoleText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3B0080',
  },
  cardStation: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  cardCloseBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  menuItemsList: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginTop: 4,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuItemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  menuItemSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  logoutWrapper: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
});
