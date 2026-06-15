import type { CaseResult, HarnessReport, CLIOptions } from './types.ts';

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDuration(ms: number): string {
  return (ms / 1000).toFixed(2) + 's';
}

export function buildReport(
  results: CaseResult[],
  options: CLIOptions,
  totalDuration: number,
): HarnessReport {
  return {
    harness: 'riskweb-simharness',
    timestamp: new Date().toISOString(),
    mode: options.mode,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.status === 'pass').length,
      failed: results.filter((r) => r.status === 'fail').length,
      errors: results.filter((r) => r.status === 'error').length,
      duration: Math.round(totalDuration),
    },
    results,
  };
}

export function formatReportJSON(report: HarnessReport): string {
  return JSON.stringify(report, null, 2);
}

export function formatReportHuman(report: HarnessReport, verbose: boolean): string {
  const lines: string[] = [];
  lines.push('RiskWeb Simulation Test Harness');
  lines.push('================================');
  lines.push('');

  for (const r of report.results) {
    const tag = r.status === 'pass' ? '[PASS]' : r.status === 'fail' ? '[FAIL]' : '[ERROR]';
    lines.push(`${tag} ${r.file} (${formatDuration(r.duration)})`);

    if (r.status === 'error' && r.errors) {
      for (const e of r.errors) {
        lines.push(`  Error: ${e}`);
      }
    }

    if (r.simulation) {
      const meanBound = r.bounds?.find((b) => b.field.endsWith('.mean') && b.field.startsWith('simulation'));
      if (meanBound) {
        const marker = meanBound.pass ? '' : ' << OUT OF BOUNDS';
        lines.push(
          `  Mean ALE: ${formatCurrency(r.simulation.mean)} [expected: ${formatCurrency(meanBound.min)}-${formatCurrency(meanBound.max)}]${marker}`,
        );
      } else {
        lines.push(`  Mean ALE: ${formatCurrency(r.simulation.mean)}`);
      }
      lines.push(`  Std Dev:  ${formatCurrency(r.simulation.stddev)}`);

      for (const [p, val] of Object.entries(r.simulation.percentiles)) {
        const pctBound = r.bounds?.find((b) => b.field === `simulation.p${p}`);
        if (pctBound) {
          const marker = pctBound.pass ? '' : ' << OUT OF BOUNDS';
          lines.push(
            `  P${parseFloat(p) * 100}:     ${formatCurrency(val)} [expected: ${formatCurrency(pctBound.min)}-${formatCurrency(pctBound.max)}]${marker}`,
          );
        } else {
          lines.push(`  P${parseFloat(p) * 100}:     ${formatCurrency(val)}`);
        }
      }
    }

    if (r.baseline) {
      lines.push(`  Baseline Mean: ${formatCurrency(r.baseline.mean)}`);
      if (r.simulation) {
        const reduction = ((1 - r.simulation.mean / r.baseline.mean) * 100).toFixed(1);
        lines.push(`  Reduction: ${reduction}%`);
      }
    }

    if (r.sensitivity) {
      lines.push(`  Sensitivity (${r.sensitivity.type}): ${r.sensitivity.items.length} items`);
      if (verbose) {
        for (const item of r.sensitivity.items) {
          lines.push(`    ${item.label}: delta=${item.delta.toFixed(2)}`);
        }
      }
    }

    if (verbose && r.simulation?.perNode) {
      lines.push('  Per-node:');
      for (const [nodeId, nodeData] of Object.entries(r.simulation.perNode)) {
        let nodeLine = `    ${nodeId}: meanLEF=${nodeData.meanLEF.toFixed(4)}`;
        if (nodeData.meanTEF !== undefined) nodeLine += ` meanTEF=${nodeData.meanTEF.toFixed(4)}`;
        if (nodeData.meanVulnerability !== undefined)
          nodeLine += ` meanVuln=${nodeData.meanVulnerability.toFixed(4)}`;
        lines.push(nodeLine);
      }
    }

    if (r.failures && r.failures.length > 0) {
      for (const f of r.failures) {
        lines.push(`  FAILURE: ${f}`);
      }
    }

    if (r.warnings && r.warnings.length > 0) {
      for (const w of r.warnings) {
        lines.push(`  WARNING: ${w}`);
      }
    }

    lines.push('');
  }

  lines.push('================================');
  const parts = [];
  if (report.summary.passed > 0) parts.push(`${report.summary.passed} passed`);
  if (report.summary.failed > 0) parts.push(`${report.summary.failed} failed`);
  if (report.summary.errors > 0) parts.push(`${report.summary.errors} errors`);
  lines.push(`Results: ${parts.join(', ')} (${report.summary.total} total)`);
  lines.push(`Duration: ${formatDuration(report.summary.duration)}`);

  return lines.join('\n');
}
