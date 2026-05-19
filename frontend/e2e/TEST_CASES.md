# RiskWeb Test Cases

## Test Framework

- **Unit Tests**: Vitest (38 tests across 3 files)
- **E2E Tests**: Playwright + Chromium (14 tests across 5 files)

### Commands

```bash
cd frontend
npm test              # Run unit tests
npm run test:watch    # Unit tests in watch mode
npm run test:coverage # Unit tests with coverage
npm run test:e2e      # Run E2E tests (headless)
npm run test:e2e:headed # E2E tests with visible browser
npm run test:all      # Run both unit + E2E
```

---

## Unit Tests

### distributions.test.ts (7 tests)

Tests `sampleDistribution()` from `src/workers/distributions.ts`.

| # | Test Case | Verifies |
|---|---|---|
| 1 | Constant returns exact value | `constant(42)` returns 42 |
| 2 | Constant returns zero for value=0 | Edge case |
| 3 | PERT samples within [min, max] | 10k samples all in bounds |
| 4 | PERT mean approximates (min+4*mode+max)/6 | Statistical correctness |
| 5 | PERT returns min when min===max | Degenerate case |
| 6 | Lognormal produces positive values | 10k samples > 0 |
| 7 | Lognormal mean approximates exp(mu+sigma^2/2) | Statistical correctness |
| 8 | Same seed produces identical sequence | Deterministic PRNG |

### fairEngine.test.ts (22 tests)

Tests `topologicalSort()`, `evaluateTree()`, and `validateScenario()` from `src/workers/fairEngine.ts`.

**topologicalSort (4 tests)**

| # | Test Case | Verifies |
|---|---|---|
| 1 | Single node returns [id] | Trivial tree |
| 2 | Linear chain: leaf first, root last | Ordering correctness |
| 3 | Fan-out: both children before root | Multi-child ordering |
| 4 | Throws on cycle | Cycle detection |

**evaluateTree (7 tests)**

| # | Test Case | Verifies |
|---|---|---|
| 1 | Single leaf returns sampled LEF | Basic evaluation |
| 2 | Leaf with no fairInputs returns lef 0 | Defensive default |
| 3 | OR gate: 1-prod(1-LEF_i) | OR gate formula |
| 4 | AND gate: product of LEFs | AND gate formula |
| 5 | Control LEF reduction applied | 50% reduction halves LEF |
| 6 | Disabled control ignored | enabled:false bypass |
| 7 | Multiple controls stack multiplicatively | Compound reduction |

**validateScenario (9 tests)**

| # | Test Case | Verifies |
|---|---|---|
| 1 | Valid scenario returns empty errors | Happy path |
| 2 | Empty nodes | Error message |
| 3 | Multiple roots | Root count validation |
| 4 | Cycle detected | Cycle error |
| 5 | Missing lossMagnitude | LM required |
| 6 | Invalid PERT params (min > max) | Parameter validation |
| 7 | Iterations = 0 | Min iterations |
| 8 | Iterations > 1,000,000 | Max iterations |
| 9 | Leaf missing fairInputs | LEF required on leaves |

### validate.test.ts (9 tests)

Tests the `validateScenario()` type guard from `src/services/validate.ts`.

| # | Test Case | Verifies |
|---|---|---|
| 1 | Valid minimal scenario returns true | Happy path |
| 2 | null returns false | Null guard |
| 3 | undefined returns false | Undefined guard |
| 4 | Missing id returns false | Required field |
| 5 | Empty name returns false | Non-empty name |
| 6 | Name > 200 chars returns false | Max length |
| 7 | Missing nodes array returns false | Required field |
| 8 | Invalid node type returns false | Enum validation |
| 9 | Edge missing sourceId returns false | Edge structure |
| 10 | Missing simulationConfig returns false | Required field |

---

## E2E Tests

### core-flow.spec.ts (4 tests)

| # | Test Case | Steps |
|---|---|---|
| 1 | App loads with RiskWeb title | Navigate, verify title + empty state |
| 2 | Add nodes via context menu | Right-click -> add OR, leaf, leaf -> verify 3 nodes |
| 3 | Select leaf shows property panel | Add leaf, click it, verify LEF input visible |
| 4 | Import, run simulation, see results | Import fixture, run sim, verify Mean/P50/P90 |

### canvas-interactions.spec.ts (4 tests)

| # | Test Case | Steps |
|---|---|---|
| 1 | Context menu shows correct options | Right-click pane, verify Add Leaf/AND/OR visible |
| 2 | Add and delete a node | Add leaf, right-click, Delete, verify count=0 |
| 3 | Duplicate a node | Add leaf, right-click, Duplicate, verify count=2 |
| 4 | Auto layout works | Add 3 nodes, click Auto Layout, verify 3 remain |

### import-export.spec.ts (3 tests)

| # | Test Case | Steps |
|---|---|---|
| 1 | Import valid scenario JSON | Import fixture, verify 3 nodes + labels |
| 2 | Import and run simulation | Import, run sim, verify results table |
| 3 | Export produces download | Import, export, verify .json download |

### save-load.spec.ts (1 test)

| # | Test Case | Steps |
|---|---|---|
| 1 | Save, new, load roundtrip | Add node, save to IndexedDB, new, load, verify restored |

### controls.spec.ts (2 tests)

| # | Test Case | Steps |
|---|---|---|
| 1 | Control library tab accessible | Click Controls tab, verify Create Control visible |
| 2 | Leaf property panel shows controls | Import, select leaf, verify "Assigned Controls" section |

---

## Test Fixture

`e2e/fixtures/sample-scenario.json`: Minimal valid scenario with 1 OR gate + 2 leaves (Phishing Attack, SQL Injection), PERT loss magnitude, 1000 iterations, seed=42.

## Bug Found During Testing

**LeafNode infinite render loop** (`src/components/Canvas/nodes/LeafNode.tsx`): The Zustand selector `state.assignments.filter(a => a.nodeId === id)` created a new array reference on every render, causing React's `useSyncExternalStore` to trigger infinite re-renders when loading multiple nodes at once. Fixed by selecting `state.assignments` and memoizing the filter with `useMemo`.
