/**
 * AreaChart — income vs expense trend.
 *
 * Design choices: no dots on every data point, 2px strokes, gradient fills that
 * fade to nothing, and a single hairline baseline grid. Touching the chart shows
 * a crosshair with the values for that month instead of permanent labels.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme, useLanguage } from '../../hooks/useTheme';
import { AppText } from '../ui/AppText';
import { motion } from '../../styles/theme';
import { useReducedMotion } from '../../utils/motion';
import { formatCompactCurrency, formatCurrency } from '../../utils/formatting';

const AnimatedPath = Animated.createAnimatedComponent(Path);
/**
 * Dash length used for the draw-on animation. Longer than any realistic path, so
 * the line always starts fully hidden and finishes fully drawn.
 */
const DRAW_LENGTH = 4000;

export interface ChartSeries {
  label: string;
  values: number[];
  color: string;
}

export interface AreaChartProps {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  style?: StyleProp<ViewStyle>;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
  /** Enables the touch crosshair (default true). */
  interactive?: boolean;
}

const PADDING = { top: 14, right: 10, bottom: 24, left: 10 };

export function AreaChart({
  labels,
  series,
  height = 190,
  style,
  showLegend = true,
  formatValue,
  interactive = true,
}: AreaChartProps) {
  const theme = useTheme();
  const language = useLanguage();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  /* Lines draw themselves in once, over 1000ms, eased in-out. */
  const draw = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      draw.setValue(1);
      return;
    }
    draw.setValue(0);
    Animated.timing(draw, {
      toValue: 1,
      duration: motion.chartDraw,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [draw, reduced]);

  const dashOffset = draw.interpolate({ inputRange: [0, 1], outputRange: [DRAW_LENGTH, 0] });

  const format = formatValue ?? ((value: number) => formatCompactCurrency(value, language));
  const points = Math.max(labels.length, 1);
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values));
  const chartWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const chartHeight = Math.max(0, height - PADDING.top - PADDING.bottom);

  const xFor = (index: number) =>
    PADDING.left + (points === 1 ? chartWidth / 2 : (index / (points - 1)) * chartWidth);
  const yFor = (value: number) => PADDING.top + chartHeight - (value / maxValue) * chartHeight;

  const buildPath = (values: number[]) =>
    values
      .map((value, index) => {
        const x = xFor(index);
        const y = yFor(value);
        if (index === 0) return `M ${x} ${y}`;
        const previousX = xFor(index - 1);
        const previousY = yFor(values[index - 1]);
        const midX = (previousX + x) / 2;
        return `C ${midX} ${previousY}, ${midX} ${y}, ${x} ${y}`;
      })
      .join(' ');

  const buildArea = (values: number[]) => {
    const baseline = PADDING.top + chartHeight;
    return `${buildPath(values)} L ${xFor(values.length - 1)} ${baseline} L ${xFor(0)} ${baseline} Z`;
  };

  const indexFromX = (x: number): number => {
    if (chartWidth <= 0 || points === 1) return 0;
    const ratio = (x - PADDING.left) / chartWidth;
    return Math.max(0, Math.min(points - 1, Math.round(ratio * (points - 1))));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => interactive,
        onMoveShouldSetPanResponder: () => interactive,
        onPanResponderGrant: (event) => setActiveIndex(indexFromX(event.nativeEvent.locationX)),
        onPanResponderMove: (event) => setActiveIndex(indexFromX(event.nativeEvent.locationX)),
        onPanResponderRelease: () => setActiveIndex(null),
        onPanResponderTerminate: () => setActiveIndex(null),
      }),
    // `indexFromX` closes over the current width/points, so re-create on change.
    [interactive, chartWidth, points],
  );

  const gridRatios = [0.5, 1];

  return (
    <View style={style}>
      <View
        style={{ height }}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        {...(interactive ? panResponder.panHandlers : {})}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              {series.map((item, index) => (
                <LinearGradient key={item.label} id={`areaFill${index}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={item.color} stopOpacity="0.28" />
                  <Stop offset="1" stopColor={item.color} stopOpacity="0.01" />
                </LinearGradient>
              ))}
            </Defs>

            <G>
              {gridRatios.map((ratio) => {
                const y = PADDING.top + chartHeight * ratio;
                return (
                  <Line
                    key={ratio}
                    x1={PADDING.left}
                    y1={y}
                    x2={PADDING.left + chartWidth}
                    y2={y}
                    stroke={theme.colors.chartGrid}
                    strokeWidth={StyleSheet.hairlineWidth * 2}
                    strokeDasharray={ratio === 1 ? undefined : '3 6'}
                  />
                );
              })}
            </G>

            {series.map((item, index) => (
              <G key={item.label}>
                <AnimatedPath d={buildArea(item.values)} fill={`url(#areaFill${index})`} opacity={draw} />
                <AnimatedPath
                  d={buildPath(item.values)}
                  stroke={item.color}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${DRAW_LENGTH} ${DRAW_LENGTH}`}
                  // Animated values are not part of react-native-svg's prop types.
                  strokeDashoffset={dashOffset as unknown as number}
                />
              </G>
            ))}

            {activeIndex !== null ? (
              <G>
                <Line
                  x1={xFor(activeIndex)}
                  y1={PADDING.top}
                  x2={xFor(activeIndex)}
                  y2={PADDING.top + chartHeight}
                  stroke={theme.colors.primaryBright}
                  strokeWidth={1}
                />
                {series.map((item) => (
                  <Circle
                    key={`marker_${item.label}`}
                    cx={xFor(activeIndex)}
                    cy={yFor(item.values[activeIndex] ?? 0)}
                    r={4}
                    fill={theme.colors.background}
                    stroke={item.color}
                    strokeWidth={2}
                  />
                ))}
              </G>
            ) : null}

            {labels.map((label, index) => (
              <SvgText
                key={`${label}_${index}`}
                x={xFor(index)}
                y={height - 6}
                fontSize={11}
                fill={activeIndex === index ? theme.colors.text : theme.colors.textMuted}
                textAnchor="middle"
              >
                {label}
              </SvgText>
            ))}

            <SvgText x={PADDING.left} y={PADDING.top - 3} fontSize={11} fill={theme.colors.textMuted}>
              {format(maxValue)}
            </SvgText>
          </Svg>
        ) : null}

        {/* Crosshair readout */}
        {activeIndex !== null ? (
          <View
            style={[
              styles.tooltip,
              { pointerEvents: 'none' },
              theme.elevation.floating,
              {
                backgroundColor: theme.colors.cardAlt,
                borderColor: theme.colors.primary,
                borderRadius: theme.radius.md,
                // Keep the bubble inside the chart bounds.
                left: Math.max(0, Math.min(Math.max(0, width - 150), xFor(activeIndex) - 70)),
              },
            ]}
          >
            <AppText variant="caption" tone="muted">
              {labels[activeIndex]}
            </AppText>
            {series.map((item) => (
              <View key={`tt_${item.label}`} style={styles.tooltipRow}>
                <View style={[styles.dot, { backgroundColor: item.color }]} />
                <AppText variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
                  {item.label}
                </AppText>
                <AppText variant="caption" weight="semibold" tabular>
                  {formatCurrency(item.values[activeIndex] ?? 0, { withSymbol: false })}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {showLegend ? (
        <View style={styles.legend}>
          {series.map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <AppText variant="caption" tone="muted">
                {item.label}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/*
 * Series colours are not defined here. Callers pass them from the theme
 * (`theme.colors.incomeColor`, `expenseColor`, …) so a chart is drawn in the
 * active theme's ink. This module previously exported its own fixed hex values,
 * which meant light mode was painted with the dark theme's brighter tones.
 */

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    minWidth: 140,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});

export default AreaChart;
