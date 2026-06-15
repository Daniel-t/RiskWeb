import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { runTestCase } from './runner.ts';
import { buildReport, formatReportJSON, formatReportHuman } from './reporter.ts';
import type { TestCase, TestSuite, CLIOptions, CaseResult } from './types.ts';

function parseArgs(args: string[]): { options: CLIOptions; files: string[] } {
  const options: CLIOptions = {
    mode: 'validation',
    json: false,
    verbose: false,
    strict: false,
    timeout: 120,
  };
  const files: string[] = [];

  for (const arg of args) {
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--strict') {
      options.strict = true;
    } else if (arg === '--mode=validation') {
      options.mode = 'validation';
    } else if (arg === '--mode=exploratory') {
      options.mode = 'exploratory';
    } else if (arg.startsWith('--iterations=')) {
      options.iterations = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--seed=')) {
      options.seed = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--timeout=')) {
      options.timeout = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--filter=')) {
      options.filter = arg.split('=')[1];
    } else if (arg.startsWith('--')) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(3);
    } else {
      files.push(arg);
    }
  }

  return { options, files };
}

function discoverFiles(paths: string[]): string[] {
  const result: string[] = [];

  for (const p of paths) {
    const resolved = resolve(p);
    if (!existsSync(resolved)) {
      console.error(`File not found: ${p}`);
      process.exit(3);
    }
    const stat = statSync(resolved);
    if (stat.isDirectory()) {
      collectJsonFiles(resolved, result);
    } else if (resolved.endsWith('.json')) {
      result.push(resolved);
    }
  }

  return result;
}

function collectJsonFiles(dir: string, result: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsonFiles(full, result);
    } else if (entry.name.endsWith('.json')) {
      result.push(full);
    }
  }
}

function loadTestCase(filePath: string): TestCase | TestSuite {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function isTestSuite(obj: unknown): obj is TestSuite {
  return typeof obj === 'object' && obj !== null && 'suite' in obj && 'cases' in obj;
}

function matchesFilter(name: string, filter?: string): boolean {
  if (!filter) return true;
  const pattern = filter.replace(/\*/g, '.*');
  return new RegExp(pattern, 'i').test(name);
}

// ── Main ──────────────────────────────────────────────────────────────

const { options, files } = parseArgs(process.argv.slice(2));

if (files.length === 0) {
  console.error('Usage: tsx cli/simharness.ts [options] <file|directory>...');
  console.error('');
  console.error('Options:');
  console.error('  --mode=validation|exploratory  (default: validation)');
  console.error('  --json                         Machine-parseable JSON output');
  console.error('  --verbose                      Show per-node results and bound details');
  console.error('  --strict                       Treat warnings as failures');
  console.error('  --iterations=N                 Override iteration count');
  console.error('  --seed=N                       Override seed');
  console.error('  --timeout=N                    Per-case timeout in seconds (default: 120)');
  console.error('  --filter=<pattern>             Filter test case names');
  process.exit(3);
}

const discoveredFiles = discoverFiles(files);
if (discoveredFiles.length === 0) {
  console.error('No JSON test case files found.');
  process.exit(3);
}

// Expand suite files and collect test cases
const testEntries: Array<{ file: string; testCase: TestCase }> = [];

for (const filePath of discoveredFiles) {
  const loaded = loadTestCase(filePath);
  if (isTestSuite(loaded)) {
    const dir = resolve(filePath, '..');
    for (const casePath of loaded.cases) {
      const caseFile = resolve(dir, casePath);
      if (!existsSync(caseFile)) {
        console.error(`Suite case not found: ${casePath} (referenced from ${filePath})`);
        process.exit(3);
      }
      const tc = loadTestCase(caseFile) as TestCase;
      if (matchesFilter(tc.name, options.filter)) {
        testEntries.push({ file: basename(caseFile), testCase: tc });
      }
    }
  } else {
    const tc = loaded as TestCase;
    if (matchesFilter(tc.name, options.filter)) {
      testEntries.push({ file: basename(filePath), testCase: tc });
    }
  }
}

// Run all test cases
const totalStart = performance.now();
const results: CaseResult[] = [];

for (const { file, testCase } of testEntries) {
  const result = runTestCase(testCase, file, options);
  results.push(result);
}

const totalDuration = performance.now() - totalStart;
const report = buildReport(results, options, totalDuration);

// Output
if (options.json) {
  console.log(formatReportJSON(report));
} else {
  console.log(formatReportHuman(report, options.verbose));
}

// Exit code
if (report.summary.errors > 0) {
  process.exit(2);
} else if (report.summary.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
