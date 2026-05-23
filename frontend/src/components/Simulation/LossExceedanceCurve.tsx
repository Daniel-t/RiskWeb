import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ComparisonTab } from '../../store/simulationStore';
import { formatCurrencyAxis } from '../../utils/format';

interface LossExceedanceCurveProps {
  samples: number[];
  baselineSamples?: number[] | null;
  mode: ComparisonTab;
}

function buildExceedanceData(sortedSamples: number[]): [number, number][] {
  const n = sortedSamples.length;
  const points: [number, number][] = [];
  // Downsample if too many points for rendering
  const step = Math.max(1, Math.floor(n / 2000));
  for (let i = 0; i < n; i += step) {
    points.push([sortedSamples[i], 1 - (i + 1) / n]);
  }
  // Ensure last point
  if (points.length === 0 || points[points.length - 1][0] !== sortedSamples[n - 1]) {
    points.push([sortedSamples[n - 1], 0]);
  }
  return points;
}

export function LossExceedanceCurve({ samples, baselineSamples, mode }: LossExceedanceCurveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || samples.length === 0) return;

    const container = containerRef.current;
    const margin = { top: 16, right: 16, bottom: 36, left: 48 };
    const width = container.clientWidth;
    const height = container.clientHeight || 250;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const controlledData = buildExceedanceData(samples);
    const showBaseline = mode === 'compare' && baselineSamples && baselineSamples.length > 0;
    const baselineData = showBaseline ? buildExceedanceData(baselineSamples!) : null;

    // Determine x domain
    const allX = controlledData.map((d) => d[0]);
    if (baselineData) allX.push(...baselineData.map((d) => d[0]));
    const xMin = 0;
    const xMax = d3.max(allX) ?? 1;

    // Auto log scale when range > 1000x
    const useLog = xMax / Math.max(xMin || 1, 1) > 1000;
    const x = useLog
      ? d3.scaleLog().domain([Math.max(1, xMin), xMax]).range([0, innerWidth]).clamp(true)
      : d3.scaleLinear().domain([xMin, xMax * 1.05]).range([0, innerWidth]);

    const y = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data([0.05, 0.1, 0.25, 0.5, 0.75])
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', '#f1f5f9')
      .attr('stroke-width', 1);

    // VaR reference lines (90% and 95%)
    for (const conf of [0.1, 0.05]) {
      const yPos = y(conf);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yPos)
        .attr('y2', yPos)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-width', 1);

      g.append('text')
        .attr('x', innerWidth - 2)
        .attr('y', yPos - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', 9)
        .attr('fill', '#94a3b8')
        .text(conf === 0.1 ? 'VaR 90%' : 'VaR 95%');
    }

    const line = d3
      .line<[number, number]>()
      .x((d) => x(Math.max(useLog ? 1 : 0, d[0])))
      .y((d) => y(d[1]))
      .curve(d3.curveMonotoneX);

    // Baseline curve
    if (baselineData) {
      g.append('path')
        .datum(baselineData)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,3')
        .attr('opacity', 0.6);
    }

    // Controlled curve
    g.append('path')
      .datum(controlledData)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2);

    // Area fill under controlled curve
    const area = d3
      .area<[number, number]>()
      .x((d) => x(Math.max(useLog ? 1 : 0, d[0])))
      .y0(innerHeight)
      .y1((d) => y(d[1]))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(controlledData)
      .attr('d', area)
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.08);

    // Axes
    const xAxis = d3
      .axisBottom(x)
      .ticks(5)
      .tickFormat((d) => formatCurrencyAxis(d as number));
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', 10);

    const yAxis = d3
      .axisLeft(y)
      .ticks(5)
      .tickFormat((d) => `${((d as number) * 100).toFixed(0)}%`);
    g.append('g').call(yAxis).selectAll('text').attr('font-size', 10);

    // Hover crosshair
    const hoverGroup = g.append('g').style('display', 'none');
    const hoverLineV = hoverGroup.append('line').attr('stroke', '#64748b').attr('stroke-width', 1).attr('stroke-dasharray', '3,2');
    const hoverLineH = hoverGroup.append('line').attr('stroke', '#64748b').attr('stroke-width', 1).attr('stroke-dasharray', '3,2');
    const tooltip = hoverGroup
      .append('text')
      .attr('font-size', 11)
      .attr('fill', '#334155')
      .attr('font-weight', 500);

    const bisect = d3.bisector<[number, number], number>((d) => d[0]).left;

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event);
        const xVal = x.invert(mx) as number;
        const idx = bisect(controlledData, xVal);
        const datum = controlledData[Math.min(idx, controlledData.length - 1)];
        if (!datum) return;

        hoverGroup.style('display', null);
        const cx = x(datum[0]);
        const cy = y(datum[1]);

        hoverLineV.attr('x1', cx).attr('x2', cx).attr('y1', 0).attr('y2', innerHeight);
        hoverLineH.attr('x1', 0).attr('x2', innerWidth).attr('y1', cy).attr('y2', cy);

        const pct = (datum[1] * 100).toFixed(1);
        tooltip
          .attr('x', cx + 8)
          .attr('y', cy - 8)
          .text(`P(Loss > ${formatCurrencyAxis(datum[0])}) = ${pct}%`);
      })
      .on('mouseleave', () => {
        hoverGroup.style('display', 'none');
      });

    // Legend
    if (baselineData) {
      const legend = g.append('g').attr('transform', `translate(${innerWidth - 120}, 4)`);
      legend.append('line').attr('x1', 0).attr('x2', 20).attr('y1', 0).attr('y2', 0).attr('stroke', '#94a3b8').attr('stroke-dasharray', '6,3').attr('stroke-width', 2);
      legend.append('text').attr('x', 24).attr('y', 4).attr('font-size', 10).attr('fill', '#64748b').text('Baseline');
      legend.append('line').attr('x1', 0).attr('x2', 20).attr('y1', 16).attr('y2', 16).attr('stroke', '#3b82f6').attr('stroke-width', 2);
      legend.append('text').attr('x', 24).attr('y', 20).attr('font-size', 10).attr('fill', '#64748b').text('Controlled');
    }
  }, [samples, baselineSamples, mode]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;
    const observer = new ResizeObserver(() => {
      svgRef.current?.dispatchEvent(new Event('resize'));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (samples.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        No sample data available for exceedance curve.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 0, minHeight: 200 }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
