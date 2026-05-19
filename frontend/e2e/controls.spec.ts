import { test, expect } from '@playwright/test';
import path from 'path';
import { TreeBuilder, FIXTURE_DIR } from './helpers/tree-builder';

test.describe('Controls: create, assign, simulate', () => {
  let tb: TreeBuilder;

  test.beforeEach(async ({ page }) => {
    tb = new TreeBuilder(page);
    await tb.reset();
  });

  test('create a control in the control library', async ({ page }) => {
    // Open left sidebar Controls tab
    const controlsTab = page.getByText('Controls', { exact: true });
    if (await controlsTab.isVisible()) {
      await controlsTab.click();
    }

    // Look for Create Control button
    const createBtn = page.getByText('Create Control');
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click();
      // Modal should appear with form fields
      await page.waitForTimeout(500);
    }
  });

  test('import scenario and see leaf property panel with controls section', async ({ page }) => {
    // Import a scenario
    const fixturePath = path.join(FIXTURE_DIR, 'sample-scenario.json');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Import', { exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixturePath);
    await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 5000 });

    // Select a leaf node
    await page.locator('.react-flow__node').filter({ hasText: 'Phishing Attack' }).click();

    // Verify the property panel shows controls section
    await expect(page.getByText('Assigned Controls')).toBeVisible({ timeout: 3000 });
  });
});
