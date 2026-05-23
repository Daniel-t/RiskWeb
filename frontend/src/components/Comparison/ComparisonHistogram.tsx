import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { Scenario } from '@shared/index';
import { formatCurrencyAxis } from '../../utils/format';

interface ComparisonHistogramProps {
  scenarios: Scenario[];
  colors: string[];
}

export function ComparisonHistogram({ scenarios, colors }: ComparisonHistogramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

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

    // Collect all samples
    const allSamples = scenarios.map((s) => s.results?.samples ?? []);
    const allValues = allSamples.flat();
    if (allValues.length === 0) return;

    const xMin = d3.min(allValues) ?? 0;
    const xMax = d3.max(allValues) ?? 1;
    const x = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]);

    const bins = 40;
    const thresholds = d3.range(bins).map((i) => xMin + ((xMax - xMin) * i) / bins);

    let yMax = 0;
    const histograms = allSamples.map((samples) => {
      const histogram = d3.bin().domain([xMin, xMax]).thresholds(thresholds)(samples);
      const maxCount = d3.max(histogram, (d) => d.length) ?? 0;
      if (maxCount > yMax) yMax = maxCount;
      return histogram;
    });

    const y = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

    // Draw histograms (overlaid with opacity)
    histograms.forEach((histogram, idx) => {
      const opacity = idx === 0 ? 0.4 : 0.5;
      g.selectAll(`.bar-${idx}`)
        .data(histogram)
        .join('rect')
        .attr('x', (d) => x(d.x0 ?? 0))
        .attr('y', (d) => y(d.length))
        .attr('width', (d) => Math.max(0, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 1))
        .attr('height', (d) => innerHeight - y(d.length))
        .attr('fill', colors[idx])
        .attr('opacity', opacity);
    });

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => formatCurrencyAxis(d as number)))
      .selectAll('text')
      .attr('font-size', 10);

    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .attr('font-size', 10);

    // Legend
    const legend = g.append('g').attr('transform', `translate(${innerWidth - 120}, 4)`);
    scenarios.forEach((s, i) => {
      legend
        .append('rect')
        .attr('x', 0)
        .attr('y', i * 16)
        .attr('width', 12)
        .attr('height', 10)
        .attr('fill', colors[i])
        .attr('opacity', 0.6);
      legend
        .append('text')
        .attr('x', 16)
        .attr('y', i * 16 + 9)
        .attr('font-size', 10)
        .attr('fill', '#64748b')
        .text(s.name.length > 15 ? s.name.slice(0, 13) + '..' : s.name);
    });
  }, [scenarios, colors]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;
    const observer = new ResizeObserver(() => {
      svgRef.current?.dispatchEvent(new Event('resize'));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 0, minHeight: 200 }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
