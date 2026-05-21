import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Control, ControlMeta, ControlAssignment, Distribution } from '@shared/index';

// Mock api module
vi.mock('../../services/api', () => ({
  listControls: vi.fn(),
  getControl: vi.fn(),
  createControl: vi.fn(),
  updateControl: vi.fn(),
  deleteControl: vi.fn(),
}));

// Mock scenarioStore
const mockMarkDirty = vi.fn();
vi.mock('../scenarioStore', () => ({
  useScenarioStore: {
    getState: () => ({ markDirty: mockMarkDirty }),
  },
}));

import * as api from '../../services/api';
import { useControlStore } from '../controlStore';

const constantDist = (v: number): Distribution => ({
  type: 'constant',
  params: { value: v },
});

const makeControl = (id: string, name?: string): Control => ({
  id,
  name: name ?? id,
  category: 'preventive',
  attackTechniques: [],
  d3fendTechniques: [],
  lefReduction: constantDist(0.5),
  metadata: { created: '2026-01-01', modified: '2026-01-01' },
});

const makeControlMeta = (id: string, name?: string): ControlMeta => ({
  id,
  name: name ?? id,
  category: 'preventive',
  attackTechniques: [],
  modified: '2026-01-01',
});

function resetStore() {
  useControlStore.setState({
    controls: [],
    controlCache: new Map(),
    assignments: [],
    isLoading: false,
  });
}

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

// ---------- CRUD operations ----------

describe('controlStore CRUD operations', () => {
  it('loadControls populates controls list from API', async () => {
    const metas = [makeControlMeta('c1'), makeControlMeta('c2')];
    vi.mocked(api.listControls).mockResolvedValue(metas);

    await useControlStore.getState().loadControls();

    expect(api.listControls).toHaveBeenCalledOnce();
    expect(useControlStore.getState().controls).toEqual(metas);
  });

  it('loadControls sets isLoading during fetch', async () => {
    let resolvePromise: (v: ControlMeta[]) => void;
    vi.mocked(api.listControls).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const promise = useControlStore.getState().loadControls();
    expect(useControlStore.getState().isLoading).toBe(true);

    resolvePromise!([]);
    await promise;
    expect(useControlStore.getState().isLoading).toBe(false);
  });

  it('loadControls handles API error gracefully', async () => {
    vi.mocked(api.listControls).mockRejectedValue(new Error('network'));

    await useControlStore.getState().loadControls();

    expect(useControlStore.getState().isLoading).toBe(false);
    expect(useControlStore.getState().controls).toEqual([]);
  });

  it('getControl returns cached control without API call', async () => {
    const control = makeControl('c1');
    useControlStore.setState({ controlCache: new Map([['c1', control]]) });

    const result = await useControlStore.getState().getControl('c1');

    expect(result).toBe(control);
    expect(api.getControl).not.toHaveBeenCalled();
  });

  it('getControl fetches from API and caches on miss', async () => {
    const control = makeControl('c1');
    vi.mocked(api.getControl).mockResolvedValue(control);

    const result = await useControlStore.getState().getControl('c1');

    expect(api.getControl).toHaveBeenCalledWith('c1');
    expect(result).toEqual(control);
    expect(useControlStore.getState().controlCache.get('c1')).toEqual(control);
  });

  it('createControl calls API, caches result, reloads list', async () => {
    const control = makeControl('c-new');
    vi.mocked(api.createControl).mockResolvedValue(control);
    vi.mocked(api.listControls).mockResolvedValue([makeControlMeta('c-new')]);

    const result = await useControlStore.getState().createControl({
      name: 'c-new',
      category: 'preventive',
      attackTechniques: [],
      d3fendTechniques: [],
      lefReduction: constantDist(0.5),
    });

    expect(api.createControl).toHaveBeenCalledOnce();
    expect(result).toEqual(control);
    expect(useControlStore.getState().controlCache.get('c-new')).toEqual(control);
    expect(api.listControls).toHaveBeenCalled();
  });

  it('updateControl calls API, updates cache, reloads list', async () => {
    const updated = makeControl('c1', 'Updated');
    vi.mocked(api.updateControl).mockResolvedValue(updated);
    vi.mocked(api.listControls).mockResolvedValue([makeControlMeta('c1', 'Updated')]);

    const result = await useControlStore.getState().updateControl('c1', {
      name: 'Updated',
      category: 'preventive',
      attackTechniques: [],
      d3fendTechniques: [],
      lefReduction: constantDist(0.5),
    });

    expect(api.updateControl).toHaveBeenCalledWith('c1', expect.anything());
    expect(result.name).toBe('Updated');
    expect(useControlStore.getState().controlCache.get('c1')!.name).toBe('Updated');
  });

  it('deleteControl calls API, removes from cache, reloads list', async () => {
    useControlStore.setState({ controlCache: new Map([['c1', makeControl('c1')]]) });
    vi.mocked(api.deleteControl).mockResolvedValue(undefined);
    vi.mocked(api.listControls).mockResolvedValue([]);

    await useControlStore.getState().deleteControl('c1');

    expect(api.deleteControl).toHaveBeenCalledWith('c1');
    expect(useControlStore.getState().controlCache.has('c1')).toBe(false);
    expect(api.listControls).toHaveBeenCalled();
  });
});

// ---------- Assignment operations ----------

describe('controlStore assignment operations', () => {
  it('addAssignment appends new assignment with enabled=true', () => {
    useControlStore.getState().addAssignment('c1', 'n1');

    const assignments = useControlStore.getState().assignments;
    expect(assignments).toHaveLength(1);
    expect(assignments[0].controlId).toBe('c1');
    expect(assignments[0].nodeId).toBe('n1');
    expect(assignments[0].enabled).toBe(true);
    expect(assignments[0].id).toBeTruthy();
  });

  it('addAssignment prevents duplicate (same controlId + nodeId)', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    useControlStore.getState().addAssignment('c1', 'n1');

    expect(useControlStore.getState().assignments).toHaveLength(1);
  });

  it('addAssignment allows same control on different nodes', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    useControlStore.getState().addAssignment('c1', 'n2');

    expect(useControlStore.getState().assignments).toHaveLength(2);
  });

  it('addAssignment calls markDirty', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    expect(mockMarkDirty).toHaveBeenCalled();
  });

  it('removeAssignment removes by id', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    const id = useControlStore.getState().assignments[0].id;

    useControlStore.getState().removeAssignment(id);

    expect(useControlStore.getState().assignments).toHaveLength(0);
  });

  it('removeAssignment calls markDirty', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    mockMarkDirty.mockClear();
    const id = useControlStore.getState().assignments[0].id;

    useControlStore.getState().removeAssignment(id);
    expect(mockMarkDirty).toHaveBeenCalled();
  });

  it('removeAssignmentsForNode removes all assignments for given nodeId', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    useControlStore.getState().addAssignment('c2', 'n1');
    useControlStore.getState().addAssignment('c1', 'n2');

    useControlStore.getState().removeAssignmentsForNode('n1');

    const assignments = useControlStore.getState().assignments;
    expect(assignments).toHaveLength(1);
    expect(assignments[0].nodeId).toBe('n2');
  });

  it('removeAssignmentsForNode does NOT call markDirty', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    mockMarkDirty.mockClear();

    useControlStore.getState().removeAssignmentsForNode('n1');
    expect(mockMarkDirty).not.toHaveBeenCalled();
  });

  it('toggleAssignment flips enabled flag', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    const id = useControlStore.getState().assignments[0].id;
    expect(useControlStore.getState().assignments[0].enabled).toBe(true);

    useControlStore.getState().toggleAssignment(id);
    expect(useControlStore.getState().assignments[0].enabled).toBe(false);

    useControlStore.getState().toggleAssignment(id);
    expect(useControlStore.getState().assignments[0].enabled).toBe(true);
  });

  it('toggleAssignment calls markDirty', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    mockMarkDirty.mockClear();
    const id = useControlStore.getState().assignments[0].id;

    useControlStore.getState().toggleAssignment(id);
    expect(mockMarkDirty).toHaveBeenCalled();
  });

  it('updateAssignmentOverride sets override distributions', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    const id = useControlStore.getState().assignments[0].id;

    const override = constantDist(0.9);
    useControlStore.getState().updateAssignmentOverride(id, {
      lefReductionOverride: override,
    });

    const assignment = useControlStore.getState().assignments[0];
    expect(assignment.lefReductionOverride).toEqual(override);
  });

  it('updateAssignmentOverride calls markDirty', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    mockMarkDirty.mockClear();
    const id = useControlStore.getState().assignments[0].id;

    useControlStore.getState().updateAssignmentOverride(id, {
      lefReductionOverride: constantDist(0.9),
    });
    expect(mockMarkDirty).toHaveBeenCalled();
  });
});

// ---------- getNodeAssignments ----------

describe('controlStore getNodeAssignments', () => {
  it('returns only assignments matching nodeId', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    useControlStore.getState().addAssignment('c2', 'n1');
    useControlStore.getState().addAssignment('c1', 'n2');

    const result = useControlStore.getState().getNodeAssignments('n1');
    expect(result).toHaveLength(2);
    for (const a of result) {
      expect(a.nodeId).toBe('n1');
    }
  });

  it('returns empty array for node with no assignments', () => {
    expect(useControlStore.getState().getNodeAssignments('nonexistent')).toEqual([]);
  });
});

// ---------- loadAssignments / resetAssignments ----------

describe('controlStore loadAssignments / resetAssignments', () => {
  it('loadAssignments replaces all assignments', () => {
    useControlStore.getState().addAssignment('c1', 'n1');

    const newAssignments: ControlAssignment[] = [
      { id: 'x1', controlId: 'c9', nodeId: 'n9', enabled: true },
      { id: 'x2', controlId: 'c8', nodeId: 'n8', enabled: false },
    ];
    useControlStore.getState().loadAssignments(newAssignments);

    expect(useControlStore.getState().assignments).toEqual(newAssignments);
  });

  it('resetAssignments clears assignments to empty array', () => {
    useControlStore.getState().addAssignment('c1', 'n1');
    useControlStore.getState().resetAssignments();
    expect(useControlStore.getState().assignments).toEqual([]);
  });
});

// ---------- Known gaps (documenting current behavior) ----------

describe('controlStore known gaps', () => {
  it('deleteControl does NOT cascade-remove related assignments', async () => {
    // Add an assignment referencing control c1
    useControlStore.getState().addAssignment('c1', 'n1');
    useControlStore.setState({ controlCache: new Map([['c1', makeControl('c1')]]) });

    vi.mocked(api.deleteControl).mockResolvedValue(undefined);
    vi.mocked(api.listControls).mockResolvedValue([]);

    await useControlStore.getState().deleteControl('c1');

    // Assignment remains orphaned — this is a known gap
    const assignments = useControlStore.getState().assignments;
    expect(assignments).toHaveLength(1);
    expect(assignments[0].controlId).toBe('c1');
  });
});
