import { useCallback, useEffect, useState } from 'react';
import type { Control, ControlCategory, Distribution } from '@shared/index';
import { useControlStore } from '../../store/controlStore';
import { DistributionInput } from '../PropertyPanel/DistributionInput';

interface ControlFormModalProps {
  open: boolean;
  onClose: () => void;
  editControlId?: string | null;
  prefill?: Partial<Omit<Control, 'id' | 'metadata'>>;
}

const defaultLefReduction: Distribution = { type: 'pert', params: { min: 0.1, mode: 0.5, max: 0.9 } };

export function ControlFormModal({ open, onClose, editControlId, prefill }: ControlFormModalProps) {
  const { getControl, createControl, updateControl, deleteControl } = useControlStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ControlCategory>('preventive');
  const [lefReduction, setLefReduction] = useState<Distribution>(defaultLefReduction);
  const [hasLmReduction, setHasLmReduction] = useState(false);
  const [lmReduction, setLmReduction] = useState<Distribution>({ type: 'pert', params: { min: 0, mode: 0.3, max: 0.6 } });
  const [attackTechniques, setAttackTechniques] = useState<string[]>([]);
  const [d3fendTechniques, setD3fendTechniques] = useState<string[]>([]);
  const [techInput, setTechInput] = useState('');
  const [d3fInput, setD3fInput] = useState('');
  const [_source, setSource] = useState<'custom' | 'd3fend-mapped' | 'template'>('custom');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editControlId) {
      getControl(editControlId).then((c) => {
        setName(c.name);
        setDescription(c.description ?? '');
        setCategory(c.category);
        setLefReduction(c.lefReduction);
        setHasLmReduction(!!c.lmReduction);
        if (c.lmReduction) setLmReduction(c.lmReduction);
        setAttackTechniques([...c.attackTechniques]);
        setD3fendTechniques([...c.d3fendTechniques]);
        setSource(c.metadata.source ?? 'custom');
      });
    } else if (prefill) {
      setName(prefill.name ?? '');
      setDescription(prefill.description ?? '');
      setCategory(prefill.category ?? 'preventive');
      if (prefill.lefReduction) setLefReduction(prefill.lefReduction);
      else setLefReduction(defaultLefReduction);
      setHasLmReduction(!!prefill.lmReduction);
      if (prefill.lmReduction) setLmReduction(prefill.lmReduction);
      setAttackTechniques(prefill.attackTechniques ?? []);
      setD3fendTechniques(prefill.d3fendTechniques ?? []);
      setSource('custom');
    } else {
      setName('');
      setDescription('');
      setCategory('preventive');
      setLefReduction(defaultLefReduction);
      setHasLmReduction(false);
      setAttackTechniques([]);
      setD3fendTechniques([]);
      setSource('custom');
    }
    setNameError('');
    setTechInput('');
    setD3fInput('');
  }, [open, editControlId, prefill, getControl]);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name is required');
      return;
    }
    if (trimmed.length > 200) {
      setNameError('Name must be 200 characters or less');
      return;
    }
    setSaving(true);
    try {
      const data: Omit<Control, 'id' | 'metadata'> & { metadata?: Control['metadata'] } = {
        name: trimmed,
        description: description.trim() || undefined,
        category,
        attackTechniques,
        d3fendTechniques,
        lefReduction,
        lmReduction: hasLmReduction ? lmReduction : undefined,
      };
      if (editControlId) {
        await updateControl(editControlId, data);
      } else {
        await createControl(data);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }, [name, description, category, attackTechniques, d3fendTechniques, lefReduction, hasLmReduction, lmReduction, editControlId, createControl, updateControl, onClose]);

  const handleDelete = useCallback(async () => {
    if (!editControlId) return;
    if (!confirm('Delete this control? Existing assignments will become orphaned.')) return;
    await deleteControl(editControlId);
    onClose();
  }, [editControlId, deleteControl, onClose]);

  const addTechnique = () => {
    const val = techInput.trim().toUpperCase();
    if (val && /^T\d{4}(\.\d{3})?$/.test(val) && !attackTechniques.includes(val)) {
      setAttackTechniques([...attackTechniques, val]);
    }
    setTechInput('');
  };

  const addD3fend = () => {
    const val = d3fInput.trim().toUpperCase();
    if (val && /^D3-[A-Z]{2,5}$/.test(val) && !d3fendTechniques.includes(val)) {
      setD3fendTechniques([...d3fendTechniques, val]);
    }
    setD3fInput('');
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 8,
          width: 560,
          maxHeight: '80vh',
          overflow: 'auto',
          padding: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>
          {editControlId ? 'Edit Control' : 'New Control'}
        </h3>

        <div className="form-group">
          <label className="form-label">Name *</label>
          <input
            className={`form-input${nameError ? ' error' : ''}`}
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(''); }}
            maxLength={200}
          />
          {nameError && <div className="form-error">{nameError}</div>}
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={2000}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Category *</label>
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as ControlCategory)}
          >
            <option value="preventive">Preventive</option>
            <option value="detective">Detective</option>
            <option value="corrective">Corrective</option>
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          <DistributionInput
            label="LEF Reduction (0-1)"
            value={lefReduction}
            onChange={setLefReduction}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={hasLmReduction}
              onChange={(e) => setHasLmReduction(e.target.checked)}
            />
            LM Reduction (optional)
          </label>
          {hasLmReduction && (
            <div style={{ marginTop: 8 }}>
              <DistributionInput
                label="LM Reduction (0-1)"
                value={lmReduction}
                onChange={setLmReduction}
              />
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label">ATT&CK Techniques</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="form-input"
              placeholder="e.g. T1566"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTechnique(); } }}
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary" onClick={addTechnique} style={{ fontSize: 12 }}>
              Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {attackTechniques.map((t) => (
              <span
                key={t}
                style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  fontSize: 11,
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {t}
                <button
                  onClick={() => setAttackTechniques(attackTechniques.filter((x) => x !== t))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, color: '#1d4ed8', lineHeight: 1 }}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">D3FEND Techniques</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="form-input"
              placeholder="e.g. D3-MFA"
              value={d3fInput}
              onChange={(e) => setD3fInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addD3fend(); } }}
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary" onClick={addD3fend} style={{ fontSize: 12 }}>
              Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {d3fendTechniques.map((t) => (
              <span
                key={t}
                style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#dcfce7',
                  color: '#166534',
                  fontSize: 11,
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {t}
                <button
                  onClick={() => setD3fendTechniques(d3fendTechniques.filter((x) => x !== t))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12, color: '#166534', lineHeight: 1 }}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
          {editControlId && (
            <button className="btn btn-danger" onClick={handleDelete} style={{ marginRight: 'auto' }}>
              Delete
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editControlId ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
