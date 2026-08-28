import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'Mac Chrome', width: 1440, height: 900 },
  { name: 'Mac Safari', width: 1280, height: 800 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'Pixel 5', width: 393, height: 851 },
];

for (const vp of viewports) {
  test(`responsive ${vp.name} — dashboard renders`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await expect(page.getByText('KOÇ MATRIX ULTRA')).toBeVisible();
    // snapshot (visual regression placeholder)
    await expect(page).toHaveScreenshot(`dashboard-${vp.name.replace(/\s/g,'-')}.png`, { maxDiffPixels: 100 });
  });
}
