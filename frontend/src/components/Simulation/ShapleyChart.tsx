import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ShapleyResult } from '@shared/index';
import { formatCurrencyAxis } from '../../utils/format';

interface ShapleyChartProps {
  result: ShapleyResult;
  topN: number;
}

export function ShapleyChart({ result, topN }: ShapleyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const displayItems = topN > 0 ? result.items.slice(0, topN) : result.items;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || displayItems.length === 0) return;

    const container = containerRef.current;
    const margin = { top: 24, right: 120, bottom: 32, left: 140 };
    const width = container.clientWidth;
    const barHeight = 22;
    const barGap = 4;
    const totalRowGap = 12;
    const height =
      margin.top +
      margin.bottom +
      displayItems.length * (barHeight + barGap) +
      totalRowGap +
      barHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const innerWidth = width - margin.left - margin.right;

    const maxVal = Math.max(
      d3.max(displayItems, (d) => d.shapleyValue) ?? 1,
      result.totalCombinedReduction,
    );

    const x = d3
      .scaleLinear()
      .domain([0, maxVal * 1.1])
      .range([0, innerWidth]);

    // Header badge
    if (!result.exact) {
      g.append('text')
        .attr('x', innerWidth)
        .attr('y', -10)
        .attr('text-anchor', 'end')
        .attr('font-size', 10)
        .style('fill', 'var(--text-muted)')
        .text(`Sampled (${result.sampleCount ?? 200} permutations)`);
    }

    displayItems.forEach((item, i) => {
      const y = i * (barHeight + barGap);
      const truncLabel =
        item.label.length > 20 ? item.label.slice(0, 18) + '...' : item.label;

      // Label
      g.append('text')
        .attr('x', -8)
        .attr('y', y + barHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'central')
        .attr('font-size', 11)
        .style('fill', 'var(--text-primary)')
        .text(truncLabel);

      // Bar
      const barW = x(item.shapleyValue);
      g.append('rect')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', Math.max(0, barW))
        .attr('height', barHeight)
        .attr('fill', '#3b82f6')
        .attr('rx', 3)
        .attr('opacity', 0.8);

      // Value label
      g.append('text')
        .attr('x', innerWidth + 8)
        .attr('y', y + barHeight / 2)
        .attr('dominant-baseline', 'central')
        .attr('font-size', 10)
        .style('fill', 'var(--chart-axis-text)')
        .text(`${formatCurrencyAxis(item.shapleyValue)} (${item.percentage.toFixed(0)}%)`);

      // Tooltip
      g.append('rect')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', Math.max(barW, 20))
        .attr('height', barHeight)
        .attr('fill', 'transparent')
        .append('title')
        .text(
          `${item.label}\nShapley Value: ${formatCurrencyAxis(item.shapleyValue)}\nFair Share: ${item.percentage.toFixed(1)}%`,
        );
    });

    // ── Total Row ──
    const totalY = displayItems.length * (barHeight + barGap) + totalRowGap;

    // Separator
    g.append('line')
      .attr('x1', -margin.left + 8)
      .attr('x2', innerWidth)
      .attr('y1', totalY - totalRowGap / 2)
      .attr('y2', totalY - totalRowGap / 2)
      .style('stroke', 'var(--border-panel)')
      .attr('stroke-width', 1);

    // Total label
    g.append('text')
      .attr('x', -8)
      .attr('y', totalY + barHeight / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'central')
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .style('fill', 'var(--text-primary)')
      .text('TOTAL');

    // Total bar
    const totalW = x(result.totalCombinedReduction);
    g.append('rect')
      .attr('x', 0)
      .attr('y', totalY)
      .attr('width', Math.max(0, totalW))
      .attr('height', barHeight)
      .attr('fill', '#2563eb')
      .attr('rx', 3)
      .attr('opacity', 0.9);

    g.append('text')
      .attr('x', innerWidth + 8)
      .attr('y', totalY + barHeight / 2)
      .attr('dominant-baseline', 'central')
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .style('fill', 'var(--chart-axis-text)')
      .text(`${formatCurrencyAxis(result.totalCombinedReduction)} (100%)`);

    // X axis
    const xAxis = d3
      .axisBottom(x)
      .ticks(5)
      .tickFormat((d) => formatCurrencyAxis(d as number));
    g.append('g')
      .attr('transform', `translate(0,${totalY + barHeight + 4})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', 10);
  }, [displayItems, result, topN]);

  if (displayItems.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        No controls assigned. Assign controls to nodes to see Shapley attribution.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
      <svg ref={svgRef} />
    </div>
  );
}
