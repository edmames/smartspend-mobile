/**
 * PieChart — donut with hairline gaps between segments, rounded caps and the
 * total in the centre. The legend doubles as the value table.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useTheme, useLanguage } from '../../hooks/useTheme';
import { AppText } from '../ui/AppText';
import { Stagger } from '../ui/Stagger';
import { motion } from '../../styles/theme';
import { useReducedMotion } from '../../utils/motion';
import { formatCurrency, formatPercentage } from '../../utils/formatting';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

export interface PieChartProps {
  data: PieSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  style?: StyleProp<ViewStyle>;
  showLegend?: boolean;
  maxLegendItems?: number;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function PieChart({
  data,
  size = 176,
  thickness = 16,
  centerLabel,
  centerValue,
  style,
  showLegend = true,
  maxLegendItems = 5,
}: PieChartProps) {
  const theme = useTheme();
  const language = useLanguage();
  const reduced = useReducedMotion();

  /* The ring and its legend settle in once — scale up a touch while fading. */
  const enter = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: motion.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, reduced]);

  const ringStyle = {
    opacity: enter,
    transform: [
      { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
    ],
  };

  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const visible = data.filter((slice) => slice.value > 0).slice(0, maxLegendItems);

  let angle = 0;
  const arcs = visible.map((slice) => {
    const sweep = total > 0 ? (slice.value / total) * 360 : 0;
    const start = angle;
    angle += sweep;
    return { ...slice, startAngle: start, endAngle: angle, sweep };
  });

  const singleFullRing = arcs.length === 1 && arcs[0].sweep >= 359.99;

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[{ width: size, height: size }, ringStyle]}>
        <Svg width={size} height={size}>
          <G>
            {total <= 0 ? (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={theme.colors.chartGrid}
                strokeWidth={thickness}
                fill="none"
              />
            ) : singleFullRing ? (
              <Circle cx={center} cy={center} r={radius} stroke={arcs[0].color} strokeWidth={thickness} fill="none" />
            ) : (
              arcs.map((arc) => {
                // Small gap so adjacent segments stay readable.
                const gap = Math.min(1.6, arc.sweep / 5);
                return (
                  <Path
                    key={arc.label}
                    d={describeArc(center, center, radius, arc.startAngle + gap / 2, arc.endAngle - gap / 2)}
                    stroke={arc.color}
                    strokeWidth={thickness}
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              })
            )}
          </G>
        </Svg>

        {centerValue ? (
          <View style={[styles.center, { pointerEvents: 'none' }]}>
            <AppText variant="bodyLarge" weight="bold" tabular align="center" numberOfLines={1}>
              {centerValue}
            </AppText>
            {centerLabel ? (
              <AppText variant="caption" tone="faint" align="center">
                {centerLabel}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </Animated.View>

      {showLegend ? (
        <View style={styles.legend}>
          {visible.map((slice, index) => {
            const percentage = total > 0 ? (slice.value / total) * 100 : 0;
            return (
              <Stagger key={slice.label} index={index}>
                <View style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: slice.color }]} />
                  <AppText variant="small" style={{ flex: 1 }} numberOfLines={1}>
                    {slice.label}
                  </AppText>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText variant="small" weight="semibold" tabular>
                      {formatCurrency(slice.value, { withSymbol: false })}
                    </AppText>
                    <AppText variant="caption" tone="faint" tabular>
                      {formatPercentage(percentage, 1, language)}
                    </AppText>
                  </View>
                </View>
              </Stagger>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    flexWrap: 'wrap',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 44,
  },
  legend: {
    flex: 1,
    minWidth: 150,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});

export default PieChart;
