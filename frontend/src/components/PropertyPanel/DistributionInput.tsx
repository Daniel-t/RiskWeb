import type { ChangeEvent } from 'react';
import type { Distribution } from '@shared/index';

interface DistributionInputProps {
  label: string;
  value: Distribution | undefined;
  onChange: (dist: Distribution) => void;
}

const defaultDistributions: Record<string, Distribution> = {
  pert: { type: 'pert', params: { min: 0, mode: 1, max: 10 } },
  lognormal: { type: 'lognormal', params: { mu: 0, sigma: 1 } },
  constant: { type: 'constant', params: { value: 0 } },
};

function getValidationError(dist: Distribution): string | null {
  if (dist.type === 'pert') {
    const { min, mode, max } = dist.params;
    if (min < 0) return 'Min must be >= 0';
    if (min > mode) return 'Min must be <= Mode';
    if (mode > max) return 'Mode must be <= Max';
    if (max <= min) return 'Max must be > Min';
    return null;
  }
  if (dist.type === 'lognormal') {
    if (dist.params.sigma <= 0) return 'Sigma must be > 0';
    return null;
  }
  if (dist.type === 'constant') {
    if (dist.params.value < 0) return 'Value must be >= 0';
    return null;
  }
  return null;
}

export function DistributionInput({ label, value, onChange }: DistributionInputProps) {
  const dist = value ?? defaultDistributions.pert;
  const error = getValidationError(dist);

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(defaultDistributions[e.target.value]);
  };

  const handleParamChange = (paramName: string, rawValue: string) => {
    const numVal = rawValue === '' || rawValue === '-' ? 0 : parseFloat(rawValue);
    if (dist.type === 'pert') {
      onChange({
        type: 'pert',
        params: { ...dist.params, [paramName]: isNaN(numVal) ? 0 : numVal },
      });
    } else if (dist.type === 'lognormal') {
      onChange({
        type: 'lognormal',
        params: { ...dist.params, [paramName]: isNaN(numVal) ? 0 : numVal },
      });
    } else if (dist.type === 'constant') {
      onChange({
        type: 'constant',
        params: { value: isNaN(numVal) ? 0 : numVal },
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="section-header">{label}</div>

      <div className="form-group">
        <label className="form-label">Distribution</label>
        <select className="form-select" value={dist.type} onChange={handleTypeChange}>
          <option value="pert">PERT</option>
          <option value="lognormal">Lognormal</option>
          <option value="constant">Constant</option>
        </select>
      </div>

      {dist.type === 'pert' && (
        <>
          <div className="form-group">
            <label className="form-label">Min</label>
            <input
              type="number"
              className={`form-input${error ? ' error' : ''}`}
              value={dist.params.min}
              onChange={(e) => handleParamChange('min', e.target.value)}
              step="any"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mode</label>
            <input
              type="number"
              className={`form-input${error ? ' error' : ''}`}
              value={dist.params.mode}
              onChange={(e) => handleParamChange('mode', e.target.value)}
              step="any"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max</label>
            <input
              type="number"
              className={`form-input${error ? ' error' : ''}`}
              value={dist.params.max}
              onChange={(e) => handleParamChange('max', e.target.value)}
              step="any"
            />
          </div>
        </>
      )}

      {dist.type === 'lognormal' && (
        <>
          <div className="form-group">
            <label className="form-label">Mu</label>
            <input
              type="number"
              className="form-input"
              value={dist.params.mu}
              onChange={(e) => handleParamChange('mu', e.target.value)}
              step="any"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Sigma</label>
            <input
              type="number"
              className={`form-input${error ? ' error' : ''}`}
              value={dist.params.sigma}
              onChange={(e) => handleParamChange('sigma', e.target.value)}
              step="any"
            />
          </div>
        </>
      )}

      {dist.type === 'constant' && (
        <div className="form-group">
          <label className="form-label">Value</label>
          <input
            type="number"
            className={`form-input${error ? ' error' : ''}`}
            value={dist.params.value}
            onChange={(e) => handleParamChange('value', e.target.value)}
            step="any"
          />
        </div>
      )}

      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
