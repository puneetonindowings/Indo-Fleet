import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

interface IndoFleetLogoProps {
  size?: 'small' | 'medium' | 'large';
  layout?: 'row' | 'column';
  showSubtitle?: boolean;
}

export const IndoFleetLogo: React.FC<IndoFleetLogoProps> = ({
  size = 'small',
  layout = 'row',
  showSubtitle = true,
}) => {
  const isSmall = size === 'small';
  const isLarge = size === 'large';
  const isColumn = layout === 'column' || (isLarge && layout !== 'row');

  const markWidth = isLarge ? 58 : isSmall ? 32 : 44;
  const markHeight = isLarge ? 31 : isSmall ? 17 : 24;

  return (
    <View style={[styles.container, isColumn ? styles.columnLayout : styles.rowLayout]}>
      {/* Official IndoFleet Aerodynamic Vector Mark */}
      <View style={[styles.markWrapper, isLarge && styles.markWrapperLarge]}>
        <Svg width={markWidth} height={markHeight} viewBox="0 0 58 31">
          <G id="logo-mark">
            {/* Top Orange Accent */}
            <Path
              d="M433.185.01h7.072a.541.541,0,0,1,.55.748l-.262.811a1.158,1.158,0,0,1-1.032.749h-7.072a.541.541,0,0,1-.55-.749l.262-.811A1.156,1.156,0,0,1,433.185.01Z"
              transform="translate(-424.348 -0.01)"
              fill="#EF7F1A"
            />
            {/* Main Aerodynamic Body */}
            <Path
              d="M55.862,7.511,50.919,22.646c-.949,2.9-2,7.6-9.565,7.6H5.81c-2.736,0-7.343-1.618-5.307-7.6L4.6,10.607c.243-.712.9-2.551,2.893-2.552l4.017,0c1.623.083,2.231.58,1.693,2.591L8.783,23.76c-.715,2.876,1.31,4.138,3.925,4.138H40.464c3.3,0,5.224-2.23,5.988-5.094l4.687-14c1.544-4.612-.893-6.312-5.21-6.312H24.086C21.6,2.491,16.361.129,19.238.125,27.956.112,38.8.133,47.513.127c8.612-.006,9.225,4.7,8.348,7.384ZM43.655,22.649c-.8,2.719-2.166,4.155-5.542,4.175H30c-2.335,0-3.007-1.492-2.6-2.9l4.323-12.879c.283-.816-1.1-.9-1.4.055L26.014,23.817c-.728,2.389-2,2.954-3.858,3.006H13.845c-2.313,0-2.471-1.895-1.978-3.716L16.317,9.953c.572-1.691,1.243-1.9,2.274-1.9h.769c1.764,0,1.631.981,1.234,2.172L16.527,22.369c-.266.8.1,1.44.831,1.44h1.933A1.528,1.528,0,0,0,20.9,22.568l4.089-12.035c.758-2.231,2.045-2.559,3.375-2.559h4.611c2.19,0,2.058,1.569,1.722,2.56L30.75,22.182c-.309.916.1,1.595.97,1.609l1.712.028c.715.012,1.278-.239,1.659-1.355L38.543,12.35c1.068-3.129,1.623-6.442-2.656-6.442H27.17c-2.487,0-7.625-2.366-4.848-2.366H44.669c3.115,0,4.778,1.962,3.836,4.668l-4.85,14.44Z"
              transform="translate(0.001 -0.118)"
              fill="#1E1B4B"
            />
            {/* Bottom Orange Accent */}
            <Path
              d="M363.23,197.13h7.149a.541.541,0,0,1,.55.748l-.262.811a1.158,1.158,0,0,1-1.032.749h-7.149a.541.541,0,0,1-.55-.749l.262-.811A1.156,1.156,0,0,1,363.23,197.13Z"
              transform="translate(-355.608 -193.703)"
              fill="#EF7F1A"
            />
          </G>
        </Svg>
      </View>

      {/* Typography */}
      <View style={[styles.textGroup, isColumn && styles.textGroupColumn]}>
        <View style={styles.brandRow}>
          <Text style={[styles.brandTitle, isLarge && styles.brandTitleLarge]}>INDO</Text>
          <Text style={[styles.brandTitleAccent, isLarge && styles.brandTitleAccentLarge]}>FLEET</Text>
        </View>
        {showSubtitle && (
          <Text style={[styles.brandSubtitle, isLarge && styles.brandSubtitleLarge]}>
            DELIVERY
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  rowLayout: {
    flexDirection: 'row',
    gap: 8,
  },
  columnLayout: {
    flexDirection: 'column',
    gap: 12,
  },
  markWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  markWrapperLarge: {
    width: 80,
    height: 80,
    backgroundColor: '#EEF2FF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B0080',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  textGroup: {
    justifyContent: 'center',
  },
  textGroupColumn: {
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  brandTitleLarge: {
    fontSize: 28,
    letterSpacing: 1.2,
  },
  brandTitleAccent: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3B0080',
    letterSpacing: 0.5,
  },
  brandTitleAccentLarge: {
    fontSize: 28,
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    fontSize: 8,
    fontWeight: '800',
    color: '#EF7F1A',
    letterSpacing: 2,
    marginTop: -2,
  },
  brandSubtitleLarge: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 2,
  },
});
