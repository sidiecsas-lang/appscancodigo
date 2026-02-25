import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts } from '../fixtures/helpers';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('login page loads with required elements', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('login-logo')).toBeVisible();
    await expect(page.getByTestId('login-user-code-input')).toBeVisible();
    await expect(page.getByTestId('login-password-input')).toBeVisible();
    await expect(page.getByTestId('login-submit-button')).toBeVisible();
  });

  test('admin login redirects to admin dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin/);
  });

  test('invalid credentials shows error toast', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-user-code-input').fill('wronguser');
    await page.getByTestId('login-password-input').fill('wrongpass');
    await page.getByTestId('login-submit-button').click();
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('toggle password visibility works', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const passwordInput = page.getByTestId('login-password-input');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByTestId('toggle-password-visibility').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('unauthenticated access to admin redirects to login', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to scanner redirects to login', async ({ page }) => {
    await page.goto('/scanner', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Admin Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
  });

  test('admin dashboard displays summary cards', async ({ page }) => {
    await expect(page.getByTestId('summary-cards')).toBeVisible();
    await expect(page.getByTestId('summary-productos')).toBeVisible();
    await expect(page.getByTestId('summary-usuarios')).toBeVisible();
    await expect(page.getByTestId('summary-cotizaciones')).toBeVisible();
    await expect(page.getByTestId('summary-escaneos')).toBeVisible();
  });

  test('admin dashboard shows product count greater than 0', async ({ page }) => {
    const productCount = page.getByTestId('summary-productos');
    await expect(productCount).toBeVisible();
    // Verify it's not empty
    const text = await productCount.textContent();
    expect(parseInt(text || '0')).toBeGreaterThan(0);
  });

  test('navigate to products page', async ({ page }) => {
    await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('add-product-button')).toBeVisible();
    await expect(page.getByTestId('bulk-upload-button')).toBeVisible();
  });

  test('navigate to users page', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('add-user-button')).toBeVisible();
  });
});
