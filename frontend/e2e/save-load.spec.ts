import { test, expect } from '@playwright/test';
import { TreeBuilder } from './helpers/tree-builder';

test.describe('Save and Load scenarios via IndexedDB', () => {
  let tb: TreeBuilder;

  test.beforeEach(async ({ page }) => {
    tb = new TreeBuilder(page);
    await tb.reset();
  });

  test('save scenario, create new, then load it back', async ({ page }) => {
    // 1. Build a tree from scratch (avoids import ID mismatch with IndexedDB)
    await tb.addNodeViaContextMenu('leaf');
    await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 });

    // 2. Save the scenario (as new — no scenarioStore.id yet, so createScenario is called)
    await page.getByText('Save', { exact: true }).click();
    await page.waitForTimeout(1000);

    // 3. Click New to clear
    await page.getByText('New', { exact: true }).click();
    // If confirmation dialog appears, confirm it
    const confirmBtn = page.getByRole('button', { name: 'Confirm' });
    if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(300);

    // Verify canvas is cleared
    await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 3000 });

    // 4. Load the saved scenario
    await page.getByText('Load', { exact: true }).click();
    await expect(page.getByText('Load Scenario')).toBeVisible();

    // The saved scenario should appear (with default name "Untitled Scenario")
    const scenarioRow = page.locator('td').filter({ hasText: 'Untitled Scenario' });
    await expect(scenarioRow).toBeVisible({ timeout: 3000 });
    await scenarioRow.click();

    await page.locator('button.btn-primary').filter({ hasText: 'Load' }).click();

    // 5. Verify tree is restored
    await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 });
  });
});
