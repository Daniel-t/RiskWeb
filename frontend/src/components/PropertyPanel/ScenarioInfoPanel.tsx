import type { ChangeEvent } from 'react';
import type { Distribution } from '@shared/index';
import { useScenarioStore } from '../../store/scenarioStore';
import { useTreeStore } from '../../store/treeStore';
import { DistributionInput } from './DistributionInput';

export function ScenarioInfoPanel() {
  const {
    name,
    description,
    lossMagnitude,
    simulationConfig,
    setName,
    setDescription,
    setLossMagnitude,
    updateSimConfig,
  } = useScenarioStore();
  const { nodes, edges, getValidationErrors } = useTreeStore();
  const errors = getValidationErrors();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="section-header">Scenario Info</div>

      <div className="form-group">
        <label className="form-label">Name</label>
        <input
          className="form-input"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-input"
          style={{ height: 72, resize: 'vertical', padding: '8px 10px' }}
          value={description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
        />
      </div>

      <DistributionInput
        label="Loss Magnitude ($/event)"
        value={lossMagnitude}
        onChange={(dist: Distribution) => setLossMagnitude(dist)}
      />

      <div className="section-header" style={{ marginTop: 8 }}>
        Simulation Config
      </div>

      <div className="form-group">
        <label className="form-label">Iterations</label>
        <input
          type="number"
          className="form-input"
          value={simulationConfig.iterations}
          min={1}
          max={1000000}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateSimConfig({ iterations: parseInt(e.target.value) || 10000 })
          }
        />
      </div>

      <div className="form-group">
        <label className="form-label">Seed (optional)</label>
        <input
          type="number"
          className="form-input"
          value={simulationConfig.seed ?? ''}
          placeholder="Random"
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateSimConfig({
              seed: e.target.value === '' ? undefined : parseInt(e.target.value),
            })
          }
        />
      </div>

      <div className="section-header" style={{ marginTop: 8 }}>
        Stats
      </div>

      <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div>
          Nodes: <strong>{nodes.length}</strong>
        </div>
        <div>
          Edges: <strong>{edges.length}</strong>
        </div>
        <div style={{ color: errors.length > 0 ? 'var(--warning)' : 'var(--success)' }}>
          Validation: {errors.length > 0 ? `${errors.length} warning(s)` : 'OK'}
        </div>
      </div>
    </div>
  );
}
