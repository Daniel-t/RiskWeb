import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { SensitivityItem } from '@shared/index';
import { formatCurrencyAxis } from '../../utils/format';

interface TornadoChartProps {
  items: SensitivityItem[];
  baselineALE: number;
  mode: 'controlToggle' | 'oatSweep';
  topN: number;
}

const categoryColors: Record<string, string> = {
  control: '#3b82f6',
  lef: '#3b82f6',
  tef: '#06b6d4',
  vulnerability: '#f59e0b',
  lm: '#10b981',
  lefReduction: '#f97316',
  lmReduction: '#f97316',
};

export function TornadoChart({ items, baselineALE, mode, topN }: TornadoChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const displayItems = topN > 0 ? items.slice(0, topN) : items;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || displayItems.length === 0) return;

    const container = containerRef.current;
    const margin = { top: 16, right: 80, bottom: 32, left: 160 };
    const width = container.clientWidth;
    const barHeight = 24;
    const barGap = 4;
    const height = margin.top + margin.bottom + displayItems.length * (barHeight + barGap);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const innerWidth = width - margin.left - margin.right;

    if (mode === 'controlToggle') {
      // All bars extend right from baseline
      const maxALE = d3.max(displayItems, (d) => d.aleHigh) ?? baselineALE;
      const x = d3
        .scaleLinear()
        .domain([0, maxALE * 1.1])
        .range([0, innerWidth]);

      // Baseline reference line
      g.append('line')
        .attr('x1', x(baselineALE))
        .attr('x2', x(baselineALE))
        .attr('y1', -8)
        .attr('y2', displayItems.length * (barHeight + barGap))
        .style('stroke', 'var(--chart-bar-baseline)')
        .attr('stroke-dasharray', '4,3')
        .attr('stroke-width', 1);

      displayItems.forEach((item, i) => {
        const y = i * (barHeight + barGap);
        const barStart = x(baselineALE);
        const barEnd = x(item.aleHigh);

        // Label
        g.append('text')
          .attr('x', -8)
          .attr('y', y + barHeight / 2)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'central')
          .attr('font-size', 11)
          .style('fill', 'var(--text-primary)')
          .text(item.label.length > 22 ? item.label.slice(0, 20) + '...' : item.label);

        // Bar
        g.append('rect')
          .attr('x', barStart)
          .attr('y', y)
          .attr('width', Math.max(0, barEnd - barStart))
          .attr('height', barHeight)
          .attr('fill', categoryColors[item.category] ?? '#3b82f6')
          .attr('rx', 3)
          .attr('opacity', 0.8);

        // Value label
        g.append('text')
          .attr('x', barEnd + 6)
          .attr('y', y + barHeight / 2)
          .attr('dominant-baseline', 'central')
          .attr('font-size', 10)
          .style('fill', 'var(--chart-axis-text)')
          .text(`+${formatCurrencyAxis(item.delta)}`);
      });

      // X axis
      const xAxis = d3
        .axisBottom(x)
        .ticks(5)
        .tickFormat((d) => formatCurrencyAxis(d as number));
      g.append('g')
        .attr('transform', `translate(0,${displayItems.length * (barHeight + barGap)})`)
        .call(xAxis)
        .selectAll('text')
        .attr('font-size', 10);
    } else {
      // OAT: bidirectional bars
      const allValues = displayItems.flatMap((d) => [d.aleLow, d.aleHigh]);
      const minALE = d3.min(allValues) ?? 0;
      const maxALE = d3.max(allValues) ?? 0;
      const padding = (maxALE - minALE) * 0.1 || 1;
      const x = d3
        .scaleLinear()
        .domain([minALE - padding, maxALE + padding])
        .range([0, innerWidth]);

      // Center line (baseline)
      g.append('line')
        .attr('x1', x(baselineALE))
        .attr('x2', x(baselineALE))
        .attr('y1', -8)
        .attr('y2', displayItems.length * (barHeight + barGap))
        .style('stroke', 'var(--chart-bar-baseline)')
        .attr('stroke-dasharray', '4,3')
        .attr('stroke-width', 1);

      displayItems.forEach((item, i) => {
        const y = i * (barHeight + barGap);
        const color = categoryColors[item.category] ?? '#3b82f6';

        // Label
        g.append('text')
          .attr('x', -8)
          .attr('y', y + barHeight / 2)
          .attr('text-anchor', 'end')
          .attr('dominant-baseline', 'central')
          .attr('font-size', 11)
          .style('fill', 'var(--text-primary)')
          .text(item.label.length > 22 ? item.label.slice(0, 20) + '...' : item.label);

        // Low bar (P10 side, lighter)
        const lowX = x(Math.min(item.aleLow, baselineALE));
        const lowW = Math.abs(x(item.aleLow) - x(baselineALE));
        g.append('rect')
          .attr('x', lowX)
          .attr('y', y)
          .attr('width', lowW)
          .attr('height', barHeight)
          .attr('fill', color)
          .attr('opacity', 0.4)
          .attr('rx', 3);

        // High bar (P90 side, darker)
        const highX = x(Math.min(item.aleHigh, baselineALE));
        const highW = Math.abs(x(item.aleHigh) - x(baselineALE));
        g.append('rect')
          .attr('x', highX)
          .attr('y', y)
          .attr('width', highW)
          .attr('height', barHeight)
          .attr('fill', color)
          .attr('opacity', 0.8)
          .attr('rx', 3);

        // Swing label
        g.append('text')
          .attr('x', x(Math.max(item.aleLow, item.aleHigh)) + 6)
          .attr('y', y + barHeight / 2)
          .attr('dominant-baseline', 'central')
          .attr('font-size', 10)
          .style('fill', 'var(--chart-axis-text)')
          .text(formatCurrencyAxis(Math.abs(item.delta)));
      });

      // X axis
      const xAxis = d3
        .axisBottom(x)
        .ticks(5)
        .tickFormat((d) => formatCurrencyAxis(d as number));
      g.append('g')
        .attr('transform', `translate(0,${displayItems.length * (barHeight + barGap)})`)
        .call(xAxis)
        .selectAll('text')
        .attr('font-size', 10);
    }
  }, [displayItems, baselineALE, mode]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;
    const observer = new ResizeObserver(() => {
      svgRef.current?.dispatchEvent(new Event('resize'));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
        No data to display
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
      <svg ref={svgRef} />
    </div>
  );
}
