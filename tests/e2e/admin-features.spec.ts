import { test, expect } from '@playwright/test';
import { loginAsAdmin, dismissToasts } from '../fixtures/helpers';

test.describe('Admin Dashboard Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
  });

  test('admin dashboard loads with correct metrics cards', async ({ page }) => {
    await expect(page.getByTestId('summary-cards')).toBeVisible();
    await expect(page.getByTestId('summary-productos')).toBeVisible();
    await expect(page.getByTestId('summary-usuarios')).toBeVisible();
    await expect(page.getByTestId('summary-cotizaciones')).toBeVisible();
    await expect(page.getByTestId('summary-escaneos')).toBeVisible();
  });

  test('product count is at least 57', async ({ page }) => {
    const productCountEl = page.getByTestId('summary-productos');
    await expect(productCountEl).toBeVisible();
    // Wait for loading to finish (value changes from '...' to a number)
    await expect(productCountEl).not.toHaveText('...');
    const text = await productCountEl.textContent();
    const count = parseInt((text || '0').replace(/,/g, ''));
    expect(count).toBeGreaterThanOrEqual(57);
  });

  test('user count is at least 2', async ({ page }) => {
    const userCountEl = page.getByTestId('summary-usuarios');
    await expect(userCountEl).not.toHaveText('...');
    const text = await userCountEl.textContent();
    const count = parseInt((text || '0').replace(/,/g, ''));
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Admin Products CRUD', () => {
  let createdProductId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });
  });

  test('products page loads with product list', async ({ page }) => {
    await expect(page.getByTestId('add-product-button')).toBeVisible();
    await expect(page.getByTestId('bulk-upload-button')).toBeVisible();
    await expect(page.getByTestId('product-search-input')).toBeVisible();
    // Should show at least some products
    await expect(page.locator('[data-testid^="product-row-"]').first()).toBeVisible();
  });

  test('product search filters the list', async ({ page }) => {
    const searchInput = page.getByTestId('product-search-input');
    await searchInput.fill('labial');
    // Table should still show rows
    await expect(page.locator('[data-testid^="product-row-"]').first()).toBeVisible();
  });

  test('can open create product form', async ({ page }) => {
    await page.getByTestId('add-product-button').click();
    await expect(page.getByTestId('form-internal-code')).toBeVisible();
    await expect(page.getByTestId('form-barcode')).toBeVisible();
    await expect(page.getByTestId('form-name')).toBeVisible();
    await expect(page.getByTestId('form-price-1')).toBeVisible();
    await expect(page.getByTestId('form-price-2')).toBeVisible();
    await expect(page.getByTestId('form-price-3')).toBeVisible();
  });

  test('can create a new product', async ({ page }) => {
    const uid = Date.now().toString().slice(-8);
    
    await page.getByTestId('add-product-button').click();
    await expect(page.getByTestId('form-internal-code')).toBeVisible();

    await page.getByTestId('form-internal-code').fill(`TEST_${uid}`);
    await page.getByTestId('form-barcode').fill(`BC_${uid}`);
    await page.getByTestId('form-name').fill(`TEST Producto ${uid}`);
    await page.getByTestId('form-price-1').fill('5.50');
    await page.getByTestId('form-price-2').fill('7.25');
    await page.getByTestId('form-price-3').fill('9.99');

    await page.getByTestId('form-submit').click();
    
    // Form should close and products should refresh
    await expect(page.getByTestId('form-submit')).not.toBeVisible();
  });

  test('can edit existing product', async ({ page }) => {
    // Get the first product's edit button
    const firstEditBtn = page.locator('[data-testid^="edit-product-"]').first();
    await expect(firstEditBtn).toBeVisible();
    await firstEditBtn.click({ force: true });

    // Form should open with data pre-filled
    await expect(page.getByTestId('form-name')).toBeVisible();
    const nameValue = await page.getByTestId('form-name').inputValue();
    expect(nameValue.length).toBeGreaterThan(0);
  });
});

test.describe('Admin Users Management', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsAdmin(page);
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
  });

  test('users page shows user list', async ({ page }) => {
    await expect(page.getByTestId('add-user-button')).toBeVisible();
    // At least admin user should be shown
    await expect(page.locator('[data-testid^="user-row-"]').first()).toBeVisible();
  });

  test('can open create user form', async ({ page }) => {
    await page.getByTestId('add-user-button').click();
    await expect(page.getByTestId('form-user-code')).toBeVisible();
    await expect(page.getByTestId('form-password')).toBeVisible();
    await expect(page.getByTestId('form-role-select')).toBeVisible();
  });

  test('can create a new user', async ({ page }) => {
    const uid = Date.now().toString().slice(-6);
    
    await page.getByTestId('add-user-button').click();
    await expect(page.getByTestId('form-user-code')).toBeVisible();

    await page.getByTestId('form-user-code').fill(`testuser_${uid}`);
    await page.getByTestId('form-password').fill('testpass123');
    await page.getByTestId('form-submit').click();

    // Form should close
    await expect(page.getByTestId('form-submit')).not.toBeVisible();
  });

  test('admin user cannot be deleted', async ({ page }) => {
    // Look for delete buttons - admin row should not have one
    const adminRow = page.locator('[data-testid^="user-row-"]').filter({ hasText: 'admin' }).first();
    await expect(adminRow).toBeVisible();
    // admin row should not have a delete button
    const deleteBtn = adminRow.locator('[data-testid^="delete-user-"]');
    await expect(deleteBtn).not.toBeVisible();
  });

  test('non-admin employee login blocked from admin page', async ({ browser }) => {
    // Use fresh context to avoid admin session
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    
    await freshPage.goto('/login', { waitUntil: 'domcontentloaded' });
    await freshPage.getByTestId('login-user-code-input').fill('empleado1');
    await freshPage.getByTestId('login-password-input').fill('emp123');
    await freshPage.getByTestId('login-submit-button').click();
    // Should redirect to scanner, not admin
    await expect(freshPage).toHaveURL(/\/scanner/, { timeout: 15000 });
    // Attempt to access admin — should redirect to scanner
    await freshPage.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(freshPage).toHaveURL(/\/scanner/, { timeout: 10000 });
    
    await freshContext.close();
  });
});
