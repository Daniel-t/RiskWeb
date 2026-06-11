import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { SimulationResult } from '@shared/index';
import type { ComparisonTab } from '../../store/simulationStore';

function formatCurrencyAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs === 0) return '$0';
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  if (abs >= 1) return `$${value.toFixed(0)}`;
  return `$${value.toFixed(2)}`;
}

interface ALEHistogramProps {
  rawALEValues: number[];
  results: SimulationResult;
  baselineRawALE?: number[] | null;
  baselineResults?: SimulationResult | null;
  mode: ComparisonTab;
}

export function ALEHistogram({
  rawALEValues,
  results,
  baselineRawALE,
  baselineResults,
  mode,
}: ALEHistogramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Determine which data to render based on mode
    const isOverlay = mode === 'compare' && baselineRawALE && baselineRawALE.length > 0;
    const primaryValues =
      mode === 'baseline' && baselineRawALE && baselineRawALE.length > 0
        ? baselineRawALE
        : rawALEValues;
    const primaryResults = mode === 'baseline' && baselineResults ? baselineResults : results;

    if (primaryValues.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 16, right: 20, bottom: 40, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X domain: encompass both distributions in overlay mode
    let allValues = primaryValues;
    if (isOverlay) {
      allValues = [...rawALEValues, ...baselineRawALE!];
    }
    const xExtent = d3.extent(allValues) as [number, number];
    const x = d3.scaleLinear().domain(xExtent).nice().range([0, innerW]);
    const binGen = d3
      .bin()
      .domain(x.domain() as [number, number])
      .thresholds(30);

    if (isOverlay) {
      // Overlay mode: baseline (gray) + controlled (blue)
      const baselineBins = binGen(baselineRawALE!);
      const controlledBins = binGen(rawALEValues);

      const maxY = Math.max(
        d3.max(baselineBins, (d) => d.length) ?? 0,
        d3.max(controlledBins, (d) => d.length) ?? 0,
      );
      const y = d3.scaleLinear().domain([0, maxY]).nice().range([innerH, 0]);

      // Baseline bars (gray)
      g.selectAll('.baseline-bar')
        .data(baselineBins)
        .join('rect')
        .attr('class', 'baseline-bar')
        .attr('x', (d) => x(d.x0 ?? 0))
        .attr('y', (d) => y(d.length))
        .attr('width', (d) => Math.max(0, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 1))
        .attr('height', (d) => innerH - y(d.length))
        .style('fill', 'var(--chart-bar-baseline)')
        .attr('opacity', 0.5)
        .attr('rx', 1);

      // Controlled bars (blue)
      g.selectAll('.controlled-bar')
        .data(controlledBins)
        .join('rect')
        .attr('class', 'controlled-bar')
        .attr('x', (d) => x(d.x0 ?? 0))
        .attr('y', (d) => y(d.length))
        .attr('width', (d) => Math.max(0, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 1))
        .attr('height', (d) => innerH - y(d.length))
        .style('fill', 'var(--chart-bar-primary)')
        .attr('opacity', 0.7)
        .attr('rx', 1);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(6)
            .tickFormat((d) => formatCurrencyAxis(d as number)),
        )
        .selectAll('text')
        .style('font-size', '11px');
      g.append('g').call(d3.axisLeft(y).ticks(5)).selectAll('text').style('font-size', '11px');

      // X label
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 34)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', 'var(--text-muted)')
        .text('ALE ($)');

      // Percentile lines (controlled only)
      drawPercentileLines(g, x, innerH, results.summary.percentiles);

      // Legend
      const legend = g.append('g').attr('transform', `translate(${innerW - 140}, 0)`);
      legend
        .append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .style('fill', 'var(--chart-bar-baseline)')
        .attr('opacity', 0.5);
      legend
        .append('text')
        .attr('x', 16)
        .attr('y', 10)
        .style('font-size', '11px')
        .style('fill', 'var(--text-muted)')
        .text('Baseline');
      legend
        .append('rect')
        .attr('y', 18)
        .attr('width', 12)
        .attr('height', 12)
        .style('fill', 'var(--chart-bar-primary)')
        .attr('opacity', 0.7);
      legend
        .append('text')
        .attr('x', 16)
        .attr('y', 28)
        .style('font-size', '11px')
        .style('fill', 'var(--text-muted)')
        .text('With Controls');
    } else {
      // Single histogram
      const bins = binGen(primaryValues);
      const y = d3
        .scaleLinear()
        .domain([0, d3.max(bins, (d) => d.length) ?? 0])
        .nice()
        .range([innerH, 0]);

      g.selectAll('rect')
        .data(bins)
        .join('rect')
        .attr('x', (d) => x(d.x0 ?? 0))
        .attr('y', (d) => y(d.length))
        .attr('width', (d) => Math.max(0, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 1))
        .attr('height', (d) => innerH - y(d.length))
        .style('fill', 'var(--chart-bar-primary)')
        .attr('rx', 1);

      // Axes
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(6)
            .tickFormat((d) => formatCurrencyAxis(d as number)),
        )
        .selectAll('text')
        .style('font-size', '11px');
      g.append('g').call(d3.axisLeft(y).ticks(5)).selectAll('text').style('font-size', '11px');

      // X label
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + 34)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', 'var(--text-muted)')
        .text('ALE ($)');

      // Percentile lines
      drawPercentileLines(g, x, innerH, primaryResults.summary.percentiles);
    }
  }, [rawALEValues, results, baselineRawALE, baselineResults, mode]);

  // ResizeObserver for responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (svgRef.current) {
        svgRef.current.dispatchEvent(new Event('resize'));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ flex: '1 1 60%', minWidth: 300, height: '100%' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

function drawPercentileLines(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  x: d3.ScaleLinear<number, number>,
  innerH: number,
  percentiles: Record<number, number>,
) {
  const lines = [
    { key: 0.1, label: 'P10', color: 'var(--warning)' },
    { key: 0.5, label: 'P50', color: 'var(--primary)' },
    { key: 0.9, label: 'P90', color: 'var(--danger)' },
  ];

  for (const p of lines) {
    const val = percentiles[p.key];
    if (val == null) continue;
    const xPos = x(val);

    g.append('line')
      .attr('x1', xPos)
      .attr('x2', xPos)
      .attr('y1', 0)
      .attr('y2', innerH)
      .style('stroke', p.color)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3');

    g.append('text')
      .attr('x', xPos)
      .attr('y', -4)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', p.color)
      .style('font-weight', '600')
      .text(p.label);
  }
}
