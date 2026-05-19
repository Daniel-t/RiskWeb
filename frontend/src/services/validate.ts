import type { Scenario } from '@shared/index';

export function validateScenario(data: unknown): data is Scenario {
  if (!data || typeof data !== 'object') return false;
  const s = data as Record<string, unknown>;

  if (typeof s.id !== 'string' || s.id.length === 0) return false;
  if (typeof s.name !== 'string' || s.name.length === 0 || s.name.length > 200) return false;
  if (!Array.isArray(s.nodes)) return false;
  if (!Array.isArray(s.edges)) return false;

  if (
    !s.simulationConfig ||
    typeof s.simulationConfig !== 'object' ||
    typeof (s.simulationConfig as Record<string, unknown>).iterations !== 'number'
  )
    return false;

  for (const node of s.nodes) {
    if (!node || typeof node !== 'object') return false;
    if (typeof node.id !== 'string') return false;
    if (!['leaf', 'and', 'or'].includes(node.type)) return false;
    if (typeof node.label !== 'string') return false;
  }

  for (const edge of s.edges) {
    if (!edge || typeof edge !== 'object') return false;
    if (typeof edge.id !== 'string') return false;
    if (typeof edge.sourceId !== 'string') return false;
    if (typeof edge.targetId !== 'string') return false;
  }

  return true;
}
