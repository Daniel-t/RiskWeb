import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { Scenario } from '@shared/index';
import { formatCurrencyAxis } from '../../utils/format';

interface ComparisonExceedanceProps {
  scenarios: Scenario[];
  colors: string[];
  referenceId: string;
}

function buildExceedanceData(sortedSamples: number[]): [number, number][] {
  const n = sortedSamples.length;
  const points: [number, number][] = [];
  const step = Math.max(1, Math.floor(n / 2000));
  for (let i = 0; i < n; i += step) {
    points.push([sortedSamples[i], 1 - (i + 1) / n]);
  }
  if (points.length === 0 || points[points.length - 1][0] !== sortedSamples[n - 1]) {
    points.push([sortedSamples[n - 1], 0]);
  }
  return points;
}

export function ComparisonExceedance({
  scenarios,
  colors,
  referenceId,
}: ComparisonExceedanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const withSamples = scenarios.filter((s) => (s.results?.samples?.length ?? 0) > 0);
  const noneHaveSamples = withSamples.length === 0;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || noneHaveSamples) return;

    const container = containerRef.current;
    const margin = { top: 16, right: 16, bottom: 32, left: 48 };
    const width = container.clientWidth;
    const height = container.clientHeight || 220;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Build curves only for scenarios that have samples
    const curveEntries = scenarios.map((s, i) => {
      const hasSamples = (s.results?.samples?.length ?? 0) > 0;
      return {
        scenario: s,
        color: colors[i],
        data: hasSamples ? buildExceedanceData(s.results!.samples!) : null,
      };
    });

    const allX = curveEntries.flatMap((e) => (e.data ? e.data.map((d) => d[0]) : []));
    const xMax = d3.max(allX) ?? 1;

    const x = d3
      .scaleLinear()
      .domain([0, xMax * 1.05])
      .range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    const line = d3
      .line<[number, number]>()
      .x((d) => x(d[0]))
      .y((d) => y(d[1]))
      .curve(d3.curveMonotoneX);

    // Draw curves for scenarios with data
    curveEntries.forEach((entry) => {
      if (!entry.data) return;
      const isRef = entry.scenario.id === referenceId;
      g.append('path')
        .datum(entry.data)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', entry.color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', isRef ? '6,3' : 'none')
        .attr('opacity', isRef ? 0.6 : 1);
    });

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickFormat((d) => formatCurrencyAxis(d as number)),
      )
      .selectAll('text')
      .attr('font-size', 10);

    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickFormat((d) => `${((d as number) * 100).toFixed(0)}%`),
      )
      .selectAll('text')
      .attr('font-size', 10);

    // Legend — show all scenarios, mark missing ones
    const legend = g.append('g').attr('transform', `translate(${innerWidth - 150}, 4)`);
    curveEntries.forEach((entry, i) => {
      const isRef = entry.scenario.id === referenceId;
      const hasCurve = entry.data !== null;
      legend
        .append('line')
        .attr('x1', 0)
        .attr('x2', 16)
        .attr('y1', i * 16 + 5)
        .attr('y2', i * 16 + 5)
        .attr('stroke', hasCurve ? entry.color : 'var(--text-muted)')
        .attr('stroke-width', hasCurve ? 2 : 1)
        .attr('stroke-dasharray', !hasCurve ? '2,2' : isRef ? '4,2' : 'none')
        .attr('opacity', hasCurve ? 1 : 0.5);
      const name = entry.scenario.name;
      const label = hasCurve
        ? name.length > 15
          ? name.slice(0, 13) + '..'
          : name
        : (name.length > 10 ? name.slice(0, 8) + '..' : name) + ' (no data)';
      legend
        .append('text')
        .attr('x', 20)
        .attr('y', i * 16 + 9)
        .attr('font-size', 10)
        .style('fill', hasCurve ? 'var(--chart-axis-text)' : 'var(--text-muted)')
        .attr('font-style', hasCurve ? 'normal' : 'italic')
        .text(label);
    });
  }, [scenarios, colors, referenceId, noneHaveSamples]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;
    const observer = new ResizeObserver(() => {
      svgRef.current?.dispatchEvent(new Event('resize'));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const missing = scenarios.filter((s) => (s.results?.samples?.length ?? 0) === 0);

  if (noneHaveSamples) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: 'var(--text-muted)',
          fontSize: 13,
          padding: 16,
        }}
      >
        <div>Exceedance curves unavailable — no scenarios have sample data.</div>
        <div style={{ fontSize: 11, fontStyle: 'italic' }}>
          To fix: open each scenario, re-run simulation, and re-save.
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 200, display: 'flex', flexDirection: 'column' }}>
      {missing.length > 0 && (
        <div
          style={{
            padding: '4px 8px',
            fontSize: 11,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            borderBottom: '1px solid var(--border-panel)',
          }}
        >
          {missing.length === 1
            ? `"${missing[0].name}" lacks sample data — curve omitted.`
            : `${missing.length} scenarios lack sample data — curves omitted.`}{' '}
          Re-run simulation and re-save to include.
        </div>
      )}
      <div ref={containerRef} style={{ flex: 1, minWidth: 0 }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
