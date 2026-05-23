import { useMemo } from 'react';
import type { FAIRInputs, Distribution } from '@shared/index';
import { DistributionInput } from './DistributionInput';

interface FrequencyModeSectionProps {
  fairInputs: FAIRInputs | undefined;
  onUpdate: (inputs: FAIRInputs) => void;
}

function getExpectedValue(dist: Distribution): number {
  switch (dist.type) {
    case 'pert':
      return (dist.params.min + 4 * dist.params.mode + dist.params.max) / 6;
    case 'lognormal':
      return Math.exp(dist.params.mu + dist.params.sigma ** 2 / 2);
    case 'constant':
      return dist.params.value;
  }
}

const defaultTEF: Distribution = { type: 'pert', params: { min: 1, mode: 5, max: 12 } };
const defaultVuln: Distribution = { type: 'pert', params: { min: 0.1, mode: 0.25, max: 0.5 } };

export function FrequencyModeSection({ fairInputs, onUpdate }: FrequencyModeSectionProps) {
  const isDecomposed = !!(fairInputs?.tef && fairInputs?.vulnerability);

  const expectedLEF = useMemo(() => {
    if (!isDecomposed || !fairInputs?.tef || !fairInputs?.vulnerability) return null;
    const eTef = getExpectedValue(fairInputs.tef);
    const eVuln = getExpectedValue(fairInputs.vulnerability);
    return eTef * eVuln;
  }, [isDecomposed, fairInputs?.tef, fairInputs?.vulnerability]);

  const handleLefChange = (lef: Distribution) => {
    onUpdate({ ...fairInputs, lef } as FAIRInputs);
  };

  const handleTefChange = (tef: Distribution) => {
    onUpdate({ ...fairInputs, lef: fairInputs?.lef ?? defaultTEF, tef, vulnerability: fairInputs?.vulnerability ?? defaultVuln });
  };

  const handleVulnChange = (vulnerability: Distribution) => {
    onUpdate({ ...fairInputs, lef: fairInputs?.lef ?? defaultTEF, tef: fairInputs?.tef ?? defaultTEF, vulnerability });
  };

  const toggleToDecomposed = () => {
    onUpdate({
      lef: fairInputs?.lef ?? defaultTEF,
      tef: defaultTEF,
      vulnerability: defaultVuln,
    });
  };

  const toggleToDirect = () => {
    // Auto-populate LEF with PERT approximation from expected
    const expectedMode = expectedLEF ?? 1;
    const lef: Distribution = {
      type: 'pert',
      params: { min: expectedMode * 0.2, mode: expectedMode, max: expectedMode * 3 },
    };
    onUpdate({ lef, tef: undefined, vulnerability: undefined });
  };

  if (isDecomposed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border-panel)',
            borderRadius: 6,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
            Frequency Mode: TEF × Vulnerability
          </div>

          <DistributionInput
            label="TEF (attempts/yr)"
            value={fairInputs?.tef}
            onChange={handleTefChange}
          />

          <DistributionInput
            label="Vulnerability (0-1)"
            value={fairInputs?.vulnerability}
            onChange={handleVulnChange}
          />

          {expectedLEF !== null && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Expected LEF: ~{expectedLEF.toFixed(2)} events/yr
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleToDirect}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontSize: 12,
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
          }}
        >
          Use direct LEF instead
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <DistributionInput label="LEF (events/yr)" value={fairInputs?.lef} onChange={handleLefChange} />

      <button
        type="button"
        onClick={toggleToDecomposed}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--primary)',
          fontSize: 12,
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
        }}
      >
        Decompose into TEF × Vulnerability
      </button>
    </div>
  );
}
