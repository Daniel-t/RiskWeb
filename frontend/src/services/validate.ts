import type { Control, ControlAssignment, Distribution, Scenario } from '@shared/index';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  /** The sanitized scenario (with defaults applied, duplicates removed, etc.) */
  scenario?: Scenario;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

export function isValidControl(c: unknown): c is Control {
  if (!c || typeof c !== 'object') return false;
  const ctrl = c as Record<string, unknown>;
  return (
    isNonEmptyString(ctrl.id) &&
    isNonEmptyString(ctrl.name) &&
    typeof ctrl.category === 'string' &&
    ['preventive', 'detective', 'corrective'].includes(ctrl.category) &&
    isValidDistribution(ctrl.lefReduction) &&
    (ctrl.lmReduction === undefined || ctrl.lmReduction === null || isValidDistribution(ctrl.lmReduction)) &&
    Array.isArray(ctrl.attackTechniques) &&
    Array.isArray(ctrl.d3fendTechniques)
  );
}

function isValidDistribution(d: unknown): d is Distribution {
  if (!d || typeof d !== 'object') return false;
  const dist = d as Record<string, unknown>;
  if (!dist.params || typeof dist.params !== 'object') return false;
  const p = dist.params as Record<string, unknown>;

  switch (dist.type) {
    case 'pert':
      return typeof p.min === 'number' && typeof p.mode === 'number' && typeof p.max === 'number';
    case 'lognormal':
      return typeof p.mu === 'number' && typeof p.sigma === 'number';
    case 'constant':
      return typeof p.value === 'number';
    default:
      return false;
  }
}

function validateControlAssignments(
  raw: unknown,
  nodeIds: Set<string>,
): { assignments: ControlAssignment[]; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (raw === undefined || raw === null) {
    return { assignments: [], errors: [], warnings: [] };
  }

  if (!Array.isArray(raw)) {
    errors.push('controlAssignments must be an array');
    return { assignments: [], errors, warnings };
  }

  const valid: ControlAssignment[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== 'object') {
      errors.push(`controlAssignments[${i}]: not an object`);
      continue;
    }
    const a = item as Record<string, unknown>;

    // Required string fields
    if (!isNonEmptyString(a.id)) {
      errors.push(`controlAssignments[${i}]: missing or invalid id`);
      continue;
    }
    if (!isNonEmptyString(a.controlId)) {
      errors.push(`controlAssignments[${i}]: missing or invalid controlId`);
      continue;
    }
    if (!isNonEmptyString(a.nodeId)) {
      errors.push(`controlAssignments[${i}]: missing or invalid nodeId`);
      continue;
    }

    // Node existence check
    if (!nodeIds.has(a.nodeId as string)) {
      warnings.push(
        `controlAssignments[${i}]: nodeId '${a.nodeId}' not found in scenario nodes; assignment removed`,
      );
      continue;
    }

    // Deduplication
    const key = `${a.controlId}::${a.nodeId}`;
    if (seen.has(key)) {
      warnings.push(
        `controlAssignments[${i}]: duplicate assignment (controlId='${a.controlId}', nodeId='${a.nodeId}'); skipped`,
      );
      continue;
    }
    seen.add(key);

    // enabled defaults to true
    const enabled = typeof a.enabled === 'boolean' ? a.enabled : true;

    // Override distributions: validate or strip
    let lefOverride: Distribution | undefined;
    if (a.lefReductionOverride !== undefined) {
      if (isValidDistribution(a.lefReductionOverride)) {
        lefOverride = a.lefReductionOverride as Distribution;
      } else {
        warnings.push(`controlAssignments[${i}]: invalid lefReductionOverride stripped`);
      }
    }

    let lmOverride: Distribution | undefined;
    if (a.lmReductionOverride !== undefined) {
      if (isValidDistribution(a.lmReductionOverride)) {
        lmOverride = a.lmReductionOverride as Distribution;
      } else {
        warnings.push(`controlAssignments[${i}]: invalid lmReductionOverride stripped`);
      }
    }

    valid.push({
      id: a.id as string,
      controlId: a.controlId as string,
      nodeId: a.nodeId as string,
      enabled,
      ...(lefOverride && { lefReductionOverride: lefOverride }),
      ...(lmOverride && { lmReductionOverride: lmOverride }),
    });
  }

  return { assignments: valid, errors, warnings };
}

export function validateScenario(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data is not an object'], warnings };
  }
  const s = data as Record<string, unknown>;

  // Core fields
  if (!isNonEmptyString(s.id)) errors.push('Missing or invalid id');
  if (typeof s.name !== 'string' || s.name.length === 0 || s.name.length > 200)
    errors.push('Missing or invalid name (must be 1-200 chars)');
  if (!Array.isArray(s.nodes)) errors.push('nodes must be an array');
  if (!Array.isArray(s.edges)) errors.push('edges must be an array');

  if (
    !s.simulationConfig ||
    typeof s.simulationConfig !== 'object' ||
    typeof (s.simulationConfig as Record<string, unknown>).iterations !== 'number'
  )
    errors.push('Missing or invalid simulationConfig');

  // Bail early if structure is too broken to continue
  if (!Array.isArray(s.nodes) || !Array.isArray(s.edges)) {
    return { valid: false, errors, warnings };
  }

  // Validate nodes
  for (let i = 0; i < s.nodes.length; i++) {
    const node = s.nodes[i] as Record<string, unknown> | null;
    if (!node || typeof node !== 'object') {
      errors.push(`nodes[${i}]: not an object`);
      continue;
    }
    if (typeof node.id !== 'string') errors.push(`nodes[${i}]: missing id`);
    if (!['leaf', 'and', 'or'].includes(node.type as string))
      errors.push(`nodes[${i}]: invalid type '${node.type}'`);
    if (typeof node.label !== 'string') errors.push(`nodes[${i}]: missing label`);
  }

  // Validate edges
  for (let i = 0; i < s.edges.length; i++) {
    const edge = s.edges[i] as Record<string, unknown> | null;
    if (!edge || typeof edge !== 'object') {
      errors.push(`edges[${i}]: not an object`);
      continue;
    }
    if (typeof edge.id !== 'string') errors.push(`edges[${i}]: missing id`);
    if (typeof edge.sourceId !== 'string') errors.push(`edges[${i}]: missing sourceId`);
    if (typeof edge.targetId !== 'string') errors.push(`edges[${i}]: missing targetId`);
  }

  // If there are structural errors, don't validate assignments
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Validate controlAssignments
  const nodeIds = new Set(s.nodes.map((n: { id: string }) => n.id));
  const assignmentResult = validateControlAssignments(s.controlAssignments, nodeIds);
  errors.push(...assignmentResult.errors);
  warnings.push(...assignmentResult.warnings);

  const valid = errors.length === 0;
  const scenario: Scenario = {
    ...(data as Scenario),
    controlAssignments:
      assignmentResult.assignments.length > 0 ? assignmentResult.assignments : undefined,
  };

  return { valid, errors, warnings, scenario };
}
