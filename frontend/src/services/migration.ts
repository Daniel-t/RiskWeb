import type { Scenario, AttackTreeNode, Edge } from '@shared/index';

/**
 * Migrate a v1 scenario (leaf/and/or + scenario-level LM) to v2
 * (outcome/event/condition/and/or with LM on outcome node).
 *
 * Idempotent: returns v2 scenarios unchanged.
 */
export function migrateV1toV2(scenario: Scenario): Scenario {
  if (scenario.schemaVersion && scenario.schemaVersion >= 2) {
    return scenario;
  }

  // Already has an outcome node (partially migrated or manually created)
  if (scenario.nodes.some((n) => n.type === 'outcome')) {
    return { ...scenario, schemaVersion: 2 };
  }

  const nodes: AttackTreeNode[] = [];
  const edges: Edge[] = [];
  const idMap = new Map<string, string>(); // old id → new id (only if changed)

  // Build parent lookup from old edges
  const oldChildrenOf = new Map<string, string[]>();
  const oldParentOf = new Map<string, string>();
  for (const n of scenario.nodes) oldChildrenOf.set(n.id, []);
  for (const e of scenario.edges) {
    oldChildrenOf.get(e.sourceId)?.push(e.targetId);
    oldParentOf.set(e.targetId, e.sourceId);
  }

  // Find old root
  const oldRoot = scenario.nodes.find((n) => !oldParentOf.has(n.id));
  if (!oldRoot) {
    // No root found, return as-is with version bump
    return { ...scenario, schemaVersion: 2 };
  }

  // Create outcome node
  const outcomeId = `outcome-${Date.now()}`;
  const outcomeNode: AttackTreeNode = {
    id: outcomeId,
    type: 'outcome',
    label: 'Outcome',
    position: { x: oldRoot.position.x, y: oldRoot.position.y - 120 },
    lossMagnitude: scenario.lossMagnitude ?? {
      type: 'constant',
      params: { value: 0 },
    },
  };
  nodes.push(outcomeNode);

  // Process each old node
  let conditionCounter = 0;
  for (const oldNode of scenario.nodes) {
    if (oldNode.type === 'leaf') {
      // Convert leaf → event, optionally with a condition parent for vulnerability
      const eventId = oldNode.id; // keep same ID
      idMap.set(oldNode.id, eventId);

      if (oldNode.fairInputs?.tef && oldNode.fairInputs?.vulnerability) {
        // Decomposed: create event(TEF) + condition(Vulnerability) above it
        const condId = `cond-migrated-${conditionCounter++}`;

        const eventNode: AttackTreeNode = {
          id: eventId,
          type: 'event',
          label: oldNode.label,
          position: { x: oldNode.position.x, y: oldNode.position.y },
          tef: oldNode.fairInputs.tef,
        };
        nodes.push(eventNode);

        const condNode: AttackTreeNode = {
          id: condId,
          type: 'condition',
          label: `${oldNode.label} Vulnerability`,
          position: { x: oldNode.position.x, y: oldNode.position.y - 80 },
          probability: oldNode.fairInputs.vulnerability,
        };
        nodes.push(condNode);

        // condition → event (condition is parent of event)
        edges.push({ id: `e-${condId}-${eventId}`, sourceId: condId, targetId: eventId });

        // Remap: old node's parent should now point to condId instead of eventId
        idMap.set(oldNode.id, condId);
      } else {
        // Direct LEF: convert to event with TEF = old LEF
        const eventNode: AttackTreeNode = {
          id: eventId,
          type: 'event',
          label: oldNode.label,
          position: { x: oldNode.position.x, y: oldNode.position.y },
          tef: oldNode.fairInputs?.lef ?? { type: 'constant', params: { value: 0 } },
        };
        nodes.push(eventNode);
        idMap.set(oldNode.id, eventId);
      }
    } else {
      // Gate node (and/or): keep as-is
      const gateNode: AttackTreeNode = {
        id: oldNode.id,
        type: oldNode.type as 'and' | 'or',
        label: oldNode.label,
        position: { x: oldNode.position.x, y: oldNode.position.y },
      };
      nodes.push(gateNode);
      idMap.set(oldNode.id, oldNode.id);
    }
  }

  // Recreate edges using the id map
  for (const e of scenario.edges) {
    const newTargetId = idMap.get(e.targetId) ?? e.targetId;
    const newSourceId = idMap.get(e.sourceId) ?? e.sourceId;
    edges.push({ id: e.id, sourceId: newSourceId, targetId: newTargetId });
  }

  // Connect outcome to old root (mapped)
  const mappedRootId = idMap.get(oldRoot.id) ?? oldRoot.id;
  edges.push({ id: `e-outcome-root`, sourceId: outcomeId, targetId: mappedRootId });

  // Remap control assignments
  const controlAssignments = (scenario.controlAssignments ?? []).map((a) => ({
    ...a,
    nodeId: idMap.get(a.nodeId) ?? a.nodeId,
  }));

  return {
    ...scenario,
    nodes,
    edges,
    controlAssignments,
    lossMagnitude: undefined,
    schemaVersion: 2,
  };
}
