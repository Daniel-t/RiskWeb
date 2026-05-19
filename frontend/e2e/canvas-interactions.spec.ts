import { test, expect } from '@playwright/test';
import { TreeBuilder } from './helpers/tree-builder';

test.describe('Canvas interactions', () => {
  let tb: TreeBuilder;

  test.beforeEach(async ({ page }) => {
    tb = new TreeBuilder(page);
    await tb.reset();
  });

  test('context menu shows correct options on empty canvas', async ({ page }) => {
    const box = await page.locator('.react-flow').boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2, { button: 'right' });

    await expect(page.getByText('Add Leaf Node')).toBeVisible();
    await expect(page.getByText('Add AND Gate')).toBeVisible();
    await expect(page.getByText('Add OR Gate')).toBeVisible();
  });

  test('add and delete a node', async ({ page }) => {
    await tb.addNodeViaContextMenu('leaf');
    await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 });

    // Right-click the node to get node context menu
    await page.locator('.react-flow__node').first().click({ button: 'right' });
    await expect(page.getByText('Delete Node')).toBeVisible();
    await page.getByText('Delete Node').click();

    await expect(page.locator('.react-flow__node')).toHaveCount(0);
  });

  test('duplicate a node', async ({ page }) => {
    await tb.addNodeViaContextMenu('leaf');
    await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 });

    await page.locator('.react-flow__node').first().click({ button: 'right' });
    await expect(page.getByText('Duplicate Node')).toBeVisible();
    await page.getByText('Duplicate Node').click();

    await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 5000 });
  });

  test('auto layout button works', async ({ page }) => {
    await tb.addNodeViaContextMenu('or', 0.4, 0.3);
    await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 5000 });

    await tb.addNodeViaContextMenu('leaf', 0.3, 0.6);
    await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 5000 });

    await tb.addNodeViaContextMenu('leaf', 0.6, 0.6);
    await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 5000 });

    // Click Auto Layout
    await page.getByText('Auto Layout', { exact: true }).click();

    // Nodes should still exist
    await expect(page.locator('.react-flow__node')).toHaveCount(3);
  });
});
