import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { RotateCcw, PenTool } from 'lucide-react-native';

interface SignaturePadProps {
  onSignatureChange: (signatureSvg: string) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSignatureChange }) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');

  const getNormalizedPoint = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    const x = Math.max(0, locationX);
    const y = Math.max(0, locationY);
    return { x: x.toFixed(1), y: y.toFixed(1) };
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        const { x, y } = getNormalizedPoint(evt);
        setCurrentPath(`M${x},${y}`);
      },
      onPanResponderMove: (evt) => {
        const { x, y } = getNormalizedPoint(evt);
        setCurrentPath((prev) => `${prev} L${x},${y}`);
      },
      onPanResponderRelease: () => {
        if (currentPath) {
          const updated = [...paths, currentPath];
          setPaths(updated);
          setCurrentPath('');
          onSignatureChange(updated.join(' '));
        }
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
    onSignatureChange('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <PenTool size={14} color="#8B5CF6" />
          <Text style={styles.title}>CUSTOMER DIGITAL SIGNATURE</Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <RotateCcw size={12} color="#EF4444" />
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.padContainer} {...panResponder.panHandlers}>
        <Svg style={styles.svgCanvas}>
          {paths.map((d, index) => (
            <Path
              key={index}
              d={d}
              stroke="#1E1B4B"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke="#1E1B4B"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>

        {paths.length === 0 && !currentPath && (
          <View style={styles.placeholder} pointerEvents="none">
            <Text style={styles.placeholderText}>Sign here with your finger</Text>
            <View style={styles.signLine} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B0080',
    letterSpacing: 0.5,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  clearText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  padContainer: {
    height: 125,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    position: 'relative',
  },
  svgCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  signLine: {
    width: '80%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 18,
  },
});
