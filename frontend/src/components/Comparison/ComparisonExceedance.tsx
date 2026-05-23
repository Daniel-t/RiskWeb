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

export function ComparisonExceedance({ scenarios, colors, referenceId }: ComparisonExceedanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const allHaveSamples = scenarios.every((s) => (s.results?.samples?.length ?? 0) > 0);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !allHaveSamples) return;

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

    const curves = scenarios.map((s) => buildExceedanceData(s.results!.samples!));
    const allX = curves.flatMap((c) => c.map((d) => d[0]));
    const xMax = d3.max(allX) ?? 1;

    const x = d3.scaleLinear().domain([0, xMax * 1.05]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    const line = d3
      .line<[number, number]>()
      .x((d) => x(d[0]))
      .y((d) => y(d[1]))
      .curve(d3.curveMonotoneX);

    // Draw curves
    curves.forEach((data, i) => {
      const isRef = scenarios[i].id === referenceId;
      g.append('path')
        .datum(data)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', colors[i])
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', isRef ? '6,3' : 'none')
        .attr('opacity', isRef ? 0.6 : 1);
    });

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => formatCurrencyAxis(d as number)))
      .selectAll('text')
      .attr('font-size', 10);

    g.append('g')
      .call(
        d3.axisLeft(y).ticks(5).tickFormat((d) => `${((d as number) * 100).toFixed(0)}%`),
      )
      .selectAll('text')
      .attr('font-size', 10);

    // Legend
    const legend = g.append('g').attr('transform', `translate(${innerWidth - 130}, 4)`);
    scenarios.forEach((s, i) => {
      const isRef = s.id === referenceId;
      legend
        .append('line')
        .attr('x1', 0)
        .attr('x2', 16)
        .attr('y1', i * 16 + 5)
        .attr('y2', i * 16 + 5)
        .attr('stroke', colors[i])
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', isRef ? '4,2' : 'none');
      legend
        .append('text')
        .attr('x', 20)
        .attr('y', i * 16 + 9)
        .attr('font-size', 10)
        .attr('fill', '#64748b')
        .text(s.name.length > 15 ? s.name.slice(0, 13) + '..' : s.name);
    });
  }, [scenarios, colors, referenceId, allHaveSamples]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;
    const observer = new ResizeObserver(() => {
      svgRef.current?.dispatchEvent(new Event('resize'));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!allHaveSamples) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Exceedance curves require sample data from all scenarios.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 0, minHeight: 200 }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
