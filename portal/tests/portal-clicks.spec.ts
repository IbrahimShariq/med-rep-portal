import { expect, test } from '@playwright/test';

test('portal click-everywhere smoke path', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'Doctors' }).click();
  await expect(page.getByRole('heading', { name: 'Add Doctor' })).toBeVisible();
  await page.getByPlaceholder('Paste Google Maps URL or lat,lng').fill('33.7104,73.0567');
  await page.getByRole('button', { name: 'Use location' }).click();
  await expect(page.locator('iframe[title="Doctor Google Map"]')).toBeVisible();

  await page.getByRole('button', { name: 'Sales Profiles' }).click();
  await expect(page.getByRole('heading', { name: 'Create Sales Profile' })).toBeVisible();
  await page.getByLabel('Name').fill('Smoke Test Sales Person');
  await page.getByLabel('Email').fill('smoke-test@example.local');
  await page.getByRole('button', { name: 'Clear' }).click();

  await page.getByRole('button', { name: 'Reports' }).click();
  await expect(page.getByRole('heading', { name: 'Attendance Sync Log' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Visit Reports' })).toBeVisible();

  await page.getByRole('button', { name: 'Branding' }).click();
  await expect(page.getByRole('heading', { name: 'Dynamic App Name and Logo' })).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'System Settings' })).toBeVisible();

  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page.getByText('Active Sales Persons')).toBeVisible();

  expect(errors).toEqual([]);
});
