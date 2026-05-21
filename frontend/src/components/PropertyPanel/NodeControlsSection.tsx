import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Control, ControlCategory, Distribution } from '@shared/index';
import { useControlStore } from '../../store/controlStore';
import { ControlPickerPopover } from '../Controls/ControlPickerPopover';
import { DistributionInput } from './DistributionInput';

interface NodeControlsSectionProps {
  nodeId: string;
}

const categoryColors: Record<ControlCategory, { bg: string; text: string }> = {
  preventive: { bg: '#dbeafe', text: '#1d4ed8' },
  detective: { bg: '#fef3c7', text: '#92400e' },
  corrective: { bg: '#dcfce7', text: '#166534' },
};

export function NodeControlsSection({ nodeId }: NodeControlsSectionProps) {
  const { assignments, toggleAssignment, removeAssignment, getControl, updateAssignmentOverride } =
    useControlStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [controlDetails, setControlDetails] = useState<Map<string, Control>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((assignmentId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(assignmentId)) next.delete(assignmentId);
      else next.add(assignmentId);
      return next;
    });
  }, []);

  const nodeAssignments = useMemo(
    () => assignments.filter((a) => a.nodeId === nodeId),
    [assignments, nodeId],
  );

  useEffect(() => {
    const loadDetails = async () => {
      const details = new Map<string, Control>();
      for (const a of nodeAssignments) {
        if (!details.has(a.controlId)) {
          try {
            const c = await getControl(a.controlId);
            details.set(a.controlId, c);
          } catch {
            // orphaned assignment
          }
        }
      }
      setControlDetails(details);
    };
    loadDetails();
  }, [nodeAssignments, getControl]);

  const combinedReduction = useMemo(() => {
    let passThrough = 1;
    for (const a of nodeAssignments) {
      if (!a.enabled) continue;
      const ctrl = controlDetails.get(a.controlId);
      if (!ctrl) continue;
      const dist = a.lefReductionOverride ?? ctrl.lefReduction;
      // Use mode (for PERT) or value (for constant) as the preview value
      let mode = 0;
      if (dist.type === 'pert') mode = dist.params.mode;
      else if (dist.type === 'constant') mode = dist.params.value;
      else if (dist.type === 'lognormal') mode = Math.exp(dist.params.mu - dist.params.sigma ** 2);
      passThrough *= 1 - mode;
    }
    return Math.round((1 - passThrough) * 100);
  }, [nodeAssignments, controlDetails]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        className="section-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>Assigned Controls ({nodeAssignments.length})</span>
      </div>

      {nodeAssignments.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>
          No controls assigned
        </div>
      ) : (
        <>
          {nodeAssignments.map((a) => {
            const ctrl = controlDetails.get(a.controlId);
            const cat = ctrl ? categoryColors[ctrl.category] : { bg: '#f1f5f9', text: '#64748b' };
            const dist = a.lefReductionOverride ?? ctrl?.lefReduction;
            let effectText = '?';
            if (dist) {
              if (dist.type === 'pert') effectText = `~${Math.round(dist.params.mode * 100)}%`;
              else if (dist.type === 'constant')
                effectText = `${Math.round(dist.params.value * 100)}%`;
              else if (dist.type === 'lognormal') effectText = 'LN';
            }
            const hasOverride = !!(a.lefReductionOverride || a.lmReductionOverride);
            const isExpanded = expanded.has(a.id);

            return (
              <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: isExpanded ? '6px 6px 0 0' : 6,
                    opacity: a.enabled ? 1 : 0.6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={a.enabled}
                    onChange={() => toggleAssignment(a.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: cat.bg,
                      color: cat.text,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {ctrl?.category?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                  {hasOverride && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        flexShrink: 0,
                      }}
                      title="Override active"
                    />
                  )}
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ctrl?.name ?? 'Unknown'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{effectText}</span>
                  <button
                    onClick={() => toggleExpanded(a.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      padding: '0 2px',
                      lineHeight: 1,
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s',
                    }}
                    title="Override settings"
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => removeAssignment(a.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: 'var(--text-muted)',
                      padding: '0 2px',
                      lineHeight: 1,
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
                {isExpanded && (
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderTop: 'none',
                      borderRadius: '0 0 6px 6px',
                      padding: '8px',
                      background: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <DistributionInput
                      label="LEF Reduction Override"
                      value={a.lefReductionOverride ?? ctrl?.lefReduction}
                      onChange={(d: Distribution) =>
                        updateAssignmentOverride(a.id, { lefReductionOverride: d })
                      }
                    />
                    {ctrl?.lmReduction && (
                      <DistributionInput
                        label="LM Reduction Override"
                        value={a.lmReductionOverride ?? ctrl.lmReduction}
                        onChange={(d: Distribution) =>
                          updateAssignmentOverride(a.id, { lmReductionOverride: d })
                        }
                      />
                    )}
                    {hasOverride && (
                      <button
                        onClick={() =>
                          updateAssignmentOverride(a.id, {
                            lefReductionOverride: undefined,
                            lmReductionOverride: undefined,
                          })
                        }
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 11,
                          color: 'var(--primary)',
                          padding: 0,
                          textAlign: 'left',
                        }}
                      >
                        Reset to defaults
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Combined reduction bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(combinedReduction, 100)}%`,
                  background: combinedReduction > 99 ? 'var(--warning)' : 'var(--primary)',
                  borderRadius: 3,
                  transition: 'width 0.2s',
                }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: combinedReduction > 99 ? 'var(--warning)' : 'var(--text-muted)',
              }}
            >
              Combined: ~{combinedReduction}% LEF reduction
              {combinedReduction > 99 && ' (excessive)'}
            </div>
          </div>
        </>
      )}

      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-secondary"
          style={{ width: '100%', fontSize: 12 }}
          onClick={() => setPickerOpen(!pickerOpen)}
        >
          + Add Control
        </button>
        {pickerOpen && (
          <ControlPickerPopover nodeId={nodeId} onClose={() => setPickerOpen(false)} />
        )}
      </div>
    </div>
  );
}
