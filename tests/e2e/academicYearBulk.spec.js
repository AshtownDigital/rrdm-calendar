// Playwright e2e tests: verify bulk-generate buttons navigate correctly
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';

test.describe('Academic Years page – bulk generate buttons', () => {
  async function verifyButton(page, labelRegex, years) {
    await page.goto(`${BASE_URL}/academic-years`);
    await page.getByText(labelRegex).click();
    await page.waitForURL(new RegExp(`/academic-years/bulk-generate-warning\\?numberOfYears=${years}$`));
    expect(page.url()).toMatch(new RegExp(`/academic-years/bulk-generate-warning\\?numberOfYears=${years}$`));
    await expect(page.locator('h1')).toHaveText(/confirm bulk generation/i);
  }

  test('Generate 1 Year button', async ({ page }) => {
    await verifyButton(page, /generate 1 year/i, 1);
  });

  test('Generate 5 Years button', async ({ page }) => {
    await verifyButton(page, /generate 5 years/i, 5);
  });

  test('Generate 10 Years button', async ({ page }) => {
    await verifyButton(page, /generate 10 years/i, 10);
  });
});
