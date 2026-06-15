import type { SimulationResult, SensitivityResult, AttackTreeNode } from '@shared/index';
import { sanitizeFilename } from './fileIO';

const BOM = '\uFEFF';

function triggerDownload(csvContent: string, filename: string): void {
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtALE(n: number): string {
  return n.toFixed(2);
}

function fmtProb(n: number | undefined): string {
  return n !== undefined ? n.toFixed(4) : '';
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(fields: (string | number)[]): string {
  return fields.map((f) => (typeof f === 'string' ? escapeCsvField(f) : String(f))).join(',');
}

export function exportSamplesCsv(
  result: SimulationResult,
  scenarioName: string,
  baselineResult?: SimulationResult | null,
): void {
  const samples = result.samples ?? [];
  if (samples.length === 0) return;

  const hasBaseline = baselineResult?.samples && baselineResult.samples.length > 0;
  const baselineSamples = hasBaseline ? baselineResult!.samples! : [];

  const header = hasBaseline ? 'iteration,ale_controlled,ale_baseline' : 'iteration,ale';
  const rows = [header];

  for (let i = 0; i < samples.length; i++) {
    if (hasBaseline) {
      rows.push(`${i + 1},${fmtALE(samples[i])},${fmtALE(baselineSamples[i] ?? 0)}`);
    } else {
      rows.push(`${i + 1},${fmtALE(samples[i])}`);
    }
  }

  triggerDownload(rows.join('\n'), `${sanitizeFilename(scenarioName)}_samples.csv`);
}

export function exportSummaryCsv(
  result: SimulationResult,
  scenarioName: string,
  baselineResult?: SimulationResult | null,
): void {
  const s = result.summary;
  const hasBaseline = !!baselineResult;

  let header = 'scenario_name,iterations,duration_ms,mean_ale,stddev_ale,p10_ale,p50_ale,p90_ale';
  const fields: (string | number)[] = [
    scenarioName,
    result.iterations,
    Math.round(result.duration),
    fmtALE(s.mean),
    fmtALE(s.stddev),
    fmtALE(s.percentiles[0.1] ?? 0),
    fmtALE(s.percentiles[0.5] ?? 0),
    fmtALE(s.percentiles[0.9] ?? 0),
  ];

  if (hasBaseline) {
    const bs = baselineResult!.summary;
    header +=
      ',baseline_mean_ale,baseline_stddev_ale,baseline_p10_ale,baseline_p50_ale,baseline_p90_ale';
    fields.push(
      fmtALE(bs.mean),
      fmtALE(bs.stddev),
      fmtALE(bs.percentiles[0.1] ?? 0),
      fmtALE(bs.percentiles[0.5] ?? 0),
      fmtALE(bs.percentiles[0.9] ?? 0),
    );
  }

  const csv = header + '\n' + csvRow(fields);
  triggerDownload(csv, `${sanitizeFilename(scenarioName)}_summary.csv`);
}

export function exportPerNodeCsv(
  result: SimulationResult,
  nodes: AttackTreeNode[],
  scenarioName: string,
): void {
  const header =
    'node_id,node_label,node_type,domain,mean_lef,p10_lef,p50_lef,p90_lef,mean_tef,mean_vulnerability,mean_probability';
  const rows = [header];

  for (const node of nodes) {
    const pn = result.perNode[node.id];
    if (!pn) continue;
    rows.push(
      csvRow([
        node.id,
        node.label,
        node.type,
        pn.domain ?? '',
        fmtProb(pn.meanLEF),
        fmtALE(pn.percentiles[0.1] ?? 0),
        fmtALE(pn.percentiles[0.5] ?? 0),
        fmtALE(pn.percentiles[0.9] ?? 0),
        fmtProb(pn.meanTEF),
        fmtProb(pn.meanVulnerability),
        fmtProb(pn.meanProbability),
      ]),
    );
  }

  triggerDownload(rows.join('\n'), `${sanitizeFilename(scenarioName)}_nodes.csv`);
}

export function exportSensitivityCsv(
  sensitivityResult: SensitivityResult,
  scenarioName: string,
): void {
  const isControlToggle = sensitivityResult.type === 'controlToggle';
  const rows: string[] = [];

  if (isControlToggle) {
    rows.push('control_name,baseline_ale,with_control_ale,ale_delta,ale_delta_pct');
    for (const item of sensitivityResult.items) {
      const deltaPct =
        sensitivityResult.baselineALE !== 0
          ? (item.delta / sensitivityResult.baselineALE) * 100
          : 0;
      rows.push(
        csvRow([
          item.label,
          fmtALE(item.aleLow),
          fmtALE(item.aleHigh),
          fmtALE(item.delta),
          deltaPct.toFixed(2),
        ]),
      );
    }
  } else {
    rows.push('parameter,ale_low,ale_high,ale_delta,ale_delta_pct');
    for (const item of sensitivityResult.items) {
      const deltaPct =
        sensitivityResult.baselineALE !== 0
          ? (item.delta / sensitivityResult.baselineALE) * 100
          : 0;
      rows.push(
        csvRow([
          item.label,
          fmtALE(item.aleLow),
          fmtALE(item.aleHigh),
          fmtALE(item.delta),
          deltaPct.toFixed(2),
        ]),
      );
    }
  }

  triggerDownload(rows.join('\n'), `${sanitizeFilename(scenarioName)}_sensitivity.csv`);
}
