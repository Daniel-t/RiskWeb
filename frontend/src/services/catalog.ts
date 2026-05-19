import type { AttackTechnique, D3fendTechnique, TechniqueMapping, Distribution } from '@shared/index';
import attackCatalogJson from '../../../shared/data/attack-catalog.json';
import d3fendMappingsJson from '../../../shared/data/d3fend-mappings.json';

// Raw JSON shapes from static files
interface RawDefense {
  id: string;
  name: string;
  category: string;
  counters: string[];
  defaultEffectiveness: { type: string; min: number; mode: number; max: number };
  channel: string;
}

const attackCatalog = attackCatalogJson as {
  techniques: Array<{
    id: string;
    name: string;
    tactic: string;
    description?: string;
    subtechniques?: string[];
  }>;
};

const d3fendData = d3fendMappingsJson as {
  defenses: RawDefense[];
};

// Build cross-reference maps
const defensesByAttackId = new Map<string, string[]>();
for (const def of d3fendData.defenses) {
  for (const attackId of def.counters) {
    const existing = defensesByAttackId.get(attackId) ?? [];
    existing.push(def.id);
    defensesByAttackId.set(attackId, existing);
  }
}

// Public API

export function getAttackTechniques(tactic?: string): AttackTechnique[] {
  let techniques = attackCatalog.techniques;
  if (tactic) {
    techniques = techniques.filter((t) => t.tactic === tactic);
  }
  return techniques.map((t) => ({
    id: t.id,
    name: t.name,
    tactic: t.tactic,
    description: t.description,
    d3fendCountermeasures: defensesByAttackId.get(t.id) ?? [],
  }));
}

export function getAttackTechnique(id: string): AttackTechnique | undefined {
  const t = attackCatalog.techniques.find((tech) => tech.id === id);
  if (!t) return undefined;
  return {
    id: t.id,
    name: t.name,
    tactic: t.tactic,
    description: t.description,
    d3fendCountermeasures: defensesByAttackId.get(t.id) ?? [],
  };
}

export function getD3fendTechniques(): D3fendTechnique[] {
  return d3fendData.defenses.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    counters: d.counters,
  }));
}

export function getD3fendTechnique(id: string): D3fendTechnique | undefined {
  const d = d3fendData.defenses.find((def) => def.id === id);
  if (!d) return undefined;
  return { id: d.id, name: d.name, category: d.category, counters: d.counters };
}

export function getMappings(attackId?: string, d3fendId?: string): TechniqueMapping[] {
  const mappings: TechniqueMapping[] = [];
  for (const def of d3fendData.defenses) {
    for (const counter of def.counters) {
      if (attackId && counter !== attackId) continue;
      if (d3fendId && def.id !== d3fendId) continue;
      const suggestedLefReduction: Distribution = {
        type: 'pert',
        params: {
          min: def.defaultEffectiveness.min,
          mode: def.defaultEffectiveness.mode,
          max: def.defaultEffectiveness.max,
        },
      };
      mappings.push({ attackId: counter, d3fendId: def.id, suggestedLefReduction });
    }
  }
  return mappings;
}
