/**
 * BarChart — grouped bars with ghost tracks.
 *
 * Each bar sits on a faint full-height track so an empty day still reads as a
 * data point instead of a gap; only the baseline is drawn, no mid gridlines.
 */
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme, useLanguage } from '../../hooks/useTheme';
import { AppText } from '../ui/AppText';
import { formatCompactCurrency } from '../../utils/formatting';

export interface BarSeries {
  label: string;
  values: number[];
  color: string;
}

export interface BarChartProps {
  labels: string[];
  series: BarSeries[];
  height?: number;
  style?: StyleProp<ViewStyle>;
  showLegend?: boolean;
  labelStep?: number;
  rounded?: number;
  /** Faint full-height track behind each bar (default true). */
  showGhostTracks?: boolean;
}

const PADDING = { top: 14, right: 8, bottom: 20, left: 8 };

export function BarChart({
  labels,
  series,
  height = 150,
  style,
  showLegend = true,
  labelStep,
  rounded = 3,
  showGhostTracks = true,
}: BarChartProps) {
  const theme = useTheme();
  const language = useLanguage();
  const [width, setWidth] = useState(0);

  const groups = Math.max(labels.length, 1);
  const maxValue = Math.max(1, ...series.flatMap((item) => item.values));
  const chartWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const chartHeight = Math.max(0, height - PADDING.top - PADDING.bottom);

  const groupWidth = chartWidth / groups;
  const barsPerGroup = Math.max(1, series.length);
  const barGap = 2;
  const barWidth = Math.max(1.5, Math.min(9, (groupWidth - 5 - barGap * barsPerGroup) / barsPerGroup));
  const step = labelStep ?? Math.max(1, Math.ceil(groups / 10));
  const baseline = PADDING.top + chartHeight;

  return (
    <View style={style}>
      <View style={{ height }} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line
              x1={PADDING.left}
              y1={baseline}
              x2={PADDING.left + chartWidth}
              y2={baseline}
              stroke={theme.colors.chartGrid}
              strokeWidth={StyleSheet.hairlineWidth * 2}
            />

            {labels.map((label, groupIndex) => {
              const groupX = PADDING.left + groupIndex * groupWidth;
              const totalBarsWidth = barsPerGroup * barWidth + (barsPerGroup - 1) * barGap;
              const startX = groupX + (groupWidth - totalBarsWidth) / 2;

              return (
                <G key={`${label}_${groupIndex}`}>
                  {showGhostTracks && barsPerGroup === 1 ? (
                    <Rect
                      x={startX}
                      y={PADDING.top}
                      width={barWidth}
                      height={chartHeight}
                      rx={rounded}
                      fill={series[0].color}
                      opacity={0.08}
                    />
                  ) : null}

                  {series.map((item, seriesIndex) => {
                    const value = item.values[groupIndex] ?? 0;
                    const barHeight = value <= 0 ? 0 : Math.max(1.5, (value / maxValue) * chartHeight);
                    const x = startX + seriesIndex * (barWidth + barGap);
                    return (
                      <Rect
                        key={`${item.label}_${groupIndex}`}
                        x={x}
                        y={baseline - barHeight}
                        width={barWidth}
                        height={barHeight}
                        rx={rounded}
                        fill={item.color}
                      />
                    );
                  })}

                  {groupIndex % step === 0 ? (
                    <SvgText
                      x={groupX + groupWidth / 2}
                      y={height - 4}
                      fontSize={10}
                      fill={theme.colors.textFaint}
                      textAnchor="middle"
                    >
                      {label}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}

            <SvgText x={PADDING.left} y={PADDING.top - 3} fontSize={10} fill={theme.colors.textFaint}>
              {formatCompactCurrency(maxValue, language)}
            </SvgText>
          </Svg>
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

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
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
});

export default BarChart;
