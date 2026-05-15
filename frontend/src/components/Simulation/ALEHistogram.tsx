import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { SimulationResult } from '@shared/index';

interface ALEHistogramProps {
  rawALEValues: number[];
  results: SimulationResult;
}

export function ALEHistogram({ rawALEValues, results }: ALEHistogramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || rawALEValues.length === 0) return;

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

    const xExtent = d3.extent(rawALEValues) as [number, number];
    const x = d3.scaleLinear().domain(xExtent).nice().range([0, innerW]);

    const bins = d3
      .bin()
      .domain(x.domain() as [number, number])
      .thresholds(30)(rawALEValues);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(bins, (d) => d.length) ?? 0])
      .nice()
      .range([innerH, 0]);

    // Bars
    g.selectAll('rect')
      .data(bins)
      .join('rect')
      .attr('x', (d) => x(d.x0 ?? 0))
      .attr('y', (d) => y(d.length))
      .attr('width', (d) => Math.max(0, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 1))
      .attr('height', (d) => innerH - y(d.length))
      .attr('fill', '#93c5fd')
      .attr('rx', 1);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(6)
          .tickFormat((d) => `$${d3.format('.2s')(d as number)}`),
      )
      .selectAll('text')
      .style('font-size', '11px');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .style('font-size', '11px');

    // X label
    g.append('text')
      .attr('x', innerW / 2)
      .attr('y', innerH + 34)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#94a3b8')
      .text('ALE ($)');

    // Percentile lines
    const percentiles = [
      { key: 0.1, label: 'P10', color: '#f59e0b' },
      { key: 0.5, label: 'P50', color: '#3b82f6' },
      { key: 0.9, label: 'P90', color: '#ef4444' },
    ];

    for (const p of percentiles) {
      const val = results.summary.percentiles[p.key];
      if (val == null) continue;
      const xPos = x(val);

      g.append('line')
        .attr('x1', xPos)
        .attr('x2', xPos)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', p.color)
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
  }, [rawALEValues, results]);

  // ResizeObserver for responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      // Trigger re-render by forcing effect re-run
      // The effect above runs on rawALEValues/results changes,
      // but we also need it on resize. Use a simple approach:
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
