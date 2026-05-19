import { type Page, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FIXTURE_DIR = path.resolve(__dirname, '..', 'fixtures');

export class TreeBuilder {
  constructor(private page: Page) {}

  /** Navigate to app, clear IndexedDB, and reload for a clean state */
  async reset() {
    await this.page.goto('/');
    await this.page.evaluate(() => indexedDB.deleteDatabase('riskweb'));
    await this.page.reload();
    await expect(this.page.getByText('RiskWeb')).toBeVisible();
  }

  /** Get the bounding box of the React Flow canvas area */
  private async getCanvasBounds() {
    const canvas = this.page.locator('.react-flow');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('React Flow canvas not found');
    return box;
  }

  /** Right-click at an absolute position within the canvas and add a node.
   *  offsetX/offsetY are fractions of the canvas size (0-1). */
  async addNodeViaContextMenu(type: 'leaf' | 'and' | 'or', offsetX = 0.5, offsetY = 0.5) {
    const box = await this.getCanvasBounds();
    const x = box.x + box.width * offsetX;
    const y = box.y + box.height * offsetY;

    // Click on empty pane first to dismiss any selection, then right-click
    await this.page.mouse.click(x, y);
    await this.page.waitForTimeout(100);
    await this.page.mouse.click(x, y, { button: 'right' });

    const labels: Record<string, string> = {
      leaf: 'Add Leaf Node',
      and: 'Add AND Gate',
      or: 'Add OR Gate',
    };
    const menuItem = this.page.getByText(labels[type], { exact: true });
    // If the pane context menu didn't appear (hit a node), try a different spot
    const visible = await menuItem.isVisible().catch(() => false);
    if (!visible) {
      // Close any node context menu by pressing Escape
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(100);
      // Try a corner of the canvas
      const altX = box.x + box.width * 0.1;
      const altY = box.y + box.height * 0.1;
      await this.page.mouse.click(altX, altY, { button: 'right' });
    }
    await expect(menuItem).toBeVisible({ timeout: 3000 });
    await menuItem.click();

    // Wait for the node to appear
    await this.page.waitForTimeout(300);
  }

  /** Click a node on canvas by its label text */
  async selectNode(label: string) {
    await this.page.locator('.react-flow__node').filter({ hasText: label }).click();
  }

  /** Wait for the property panel to show content for a given node */
  async waitForPropertyPanel(text: string) {
    await expect(this.page.getByText(text)).toBeVisible({ timeout: 5000 });
  }

  /** Click the Run Simulation button and wait for results */
  async runSimulationAndWait() {
    await this.page.getByText('Run Simulation', { exact: true }).click();
    await expect(this.page.getByText('Summary Statistics')).toBeVisible({ timeout: 30000 });
  }

  /** Click a toolbar button by text */
  async clickToolbarButton(text: string) {
    await this.page.locator('button').filter({ hasText: text }).click();
  }
}
