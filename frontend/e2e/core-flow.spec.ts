import { test, expect } from '@playwright/test';
import path from 'path';
import { TreeBuilder, FIXTURE_DIR } from './helpers/tree-builder';

test.describe('Core Flow: build tree, configure, simulate', () => {
  let tb: TreeBuilder;

  test.beforeEach(async ({ page }) => {
    tb = new TreeBuilder(page);
    await tb.reset();
  });

  test('app loads with RiskWeb title', async ({ page }) => {
    await expect(page.getByText('RiskWeb')).toBeVisible();
    await expect(page.getByText('Drag nodes from the palette')).toBeVisible();
  });

  test('add nodes via context menu', async ({ page }) => {
    await tb.addNodeViaContextMenu('or', 0.5, 0.3);
    await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 });

    await tb.addNodeViaContextMenu('leaf', 0.3, 0.6);
    await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 5000 });

    await tb.addNodeViaContextMenu('leaf', 0.7, 0.6);
    await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 5000 });
  });

  test('select leaf node shows property panel', async ({ page }) => {
    await tb.addNodeViaContextMenu('leaf');
    await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 });

    // Click the node to select it
    await page.locator('.react-flow__node').first().click();
    // Property panel should show leaf content
    await expect(page.getByText('LEF (events/yr)')).toBeVisible();
  });

  test('import, run simulation, and see results', async ({ page }) => {
    // Use import for a reliable pre-built scenario instead of manual node creation
    const fixturePath = path.join(FIXTURE_DIR, 'sample-scenario.json');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Import', { exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixturePath);

    await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 5000 });

    // Run simulation
    await tb.runSimulationAndWait();

    // Verify results (use getByRole to avoid SVG text duplicates)
    await expect(page.getByRole('cell', { name: 'Mean' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'P50' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'P90' })).toBeVisible();
  });
});
