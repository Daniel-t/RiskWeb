import { test, expect } from '@playwright/test';
import path from 'path';
import { TreeBuilder, FIXTURE_DIR } from './helpers/tree-builder';

test.describe('Import/Export scenarios', () => {
  let tb: TreeBuilder;

  test.beforeEach(async ({ page }) => {
    tb = new TreeBuilder(page);
    await tb.reset();
  });

  test('import a valid scenario JSON file', async ({ page }) => {
    const fixturePath = path.join(FIXTURE_DIR, 'sample-scenario.json');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Import', { exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixturePath);

    // Wait for nodes to appear on the canvas
    await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 5000 });

    // Verify scenario name was loaded
    await expect(page.getByText('E2E Test Scenario')).toBeVisible();

    // Verify node labels are present
    await expect(
      page.locator('.react-flow__node').filter({ hasText: 'Phishing Attack' }),
    ).toHaveCount(1);
    await expect(
      page.locator('.react-flow__node').filter({ hasText: 'SQL Injection' }),
    ).toHaveCount(1);
  });

  test('import and then run simulation', async ({ page }) => {
    const fixturePath = path.join(FIXTURE_DIR, 'sample-scenario.json');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Import', { exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixturePath);

    await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 5000 });

    // Run simulation — the imported scenario should be valid
    await tb.runSimulationAndWait();

    // Verify results appear (use getByRole to avoid SVG text duplicates)
    await expect(page.getByRole('cell', { name: 'Mean' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'P50' })).toBeVisible();
  });

  test('export scenario produces a download', async ({ page }) => {
    const fixturePath = path.join(FIXTURE_DIR, 'sample-scenario.json');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Import', { exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixturePath);

    await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 5000 });

    // Export and verify download
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('Export', { exact: true }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });
});
