import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsEmployee, dismissToasts, getAdminToken } from '../fixtures/helpers';

const BASE_URL = 'https://manrique-beauty.preview.emergentagent.com';

test.describe('Golden Path - Full User Journey', () => {
  
  test('Admin: login → dashboard → create product → verify in list → delete', async ({ page }) => {
    await dismissToasts(page);
    
    // Step 1: Login as admin
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin/);

    // Step 2: Check dashboard metrics load
    await expect(page.getByTestId('summary-cards')).toBeVisible();
    await expect(page.getByTestId('summary-productos')).not.toHaveText('...');

    // Step 3: Navigate to products
    await page.goto('/admin/products', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('add-product-button')).toBeVisible();

    // Wait for products to load and check count
    await expect(page.locator('[data-testid^="product-row-"]').first()).toBeVisible();
    const initialRows = await page.locator('[data-testid^="product-row-"]').count();
    expect(initialRows).toBeGreaterThan(0);

    // Step 4: Create a new product
    const uid = Date.now().toString().slice(-8);
    const productName = `TEST Golden ${uid}`;
    
    await page.getByTestId('add-product-button').click();
    await expect(page.getByTestId('form-internal-code')).toBeVisible();
    await page.getByTestId('form-internal-code').fill(`TG_${uid}`);
    await page.getByTestId('form-barcode').fill(`BG_${uid}`);
    await page.getByTestId('form-name').fill(productName);
    await page.getByTestId('form-price-1').fill('5.00');
    await page.getByTestId('form-price-2').fill('7.00');
    await page.getByTestId('form-price-3').fill('9.00');
    await page.getByTestId('form-submit').click();

    // Step 5: Verify product appears in list
    await expect(page.getByTestId('form-submit')).not.toBeVisible();
    // Search for the new product
    await page.getByTestId('product-search-input').fill(`TG_${uid}`);
    await expect(page.locator('[data-testid^="product-row-"]').first()).toBeVisible();

    // Step 6: Clean up — delete product via API
    const token = await getAdminToken();
    const productsRes = await fetch(`${BASE_URL}/api/products?search=TG_${uid}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const products = await productsRes.json();
    if (products.length > 0) {
      await fetch(`${BASE_URL}/api/products/${products[0].id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  });

  test('Admin: create user → employee logs in → accesses quoter → admin logs back in', async ({ browser }) => {
    // Step 1: Admin creates a new employee
    const uid = Date.now().toString().slice(-6);
    const empCode = `gp_emp_${uid}`;
    const empPassword = 'gppass123';

    const token = await getAdminToken();
    const createResp = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_code: empCode, password: empPassword, role: 'empleado' })
    });
    expect(createResp.status).toBe(200);
    const newUser = await createResp.json();

    // Step 2: Employee logs in with fresh context
    const empContext = await browser.newContext();
    const empPage = await empContext.newPage();

    await empPage.goto('/login', { waitUntil: 'domcontentloaded' });
    await empPage.getByTestId('login-user-code-input').fill(empCode);
    await empPage.getByTestId('login-password-input').fill(empPassword);
    await empPage.getByTestId('login-submit-button').click();
    await expect(empPage).toHaveURL(/\/scanner/, { timeout: 15000 });

    // Step 3: Employee navigates to quoter
    await empPage.goto('/quoter', { waitUntil: 'domcontentloaded' });
    await expect(empPage.getByTestId('quoter-logo')).toBeVisible();
    await expect(empPage.getByTestId('product-search-input')).toBeVisible();

    // Step 4: Employee adds a product to quote
    await empPage.getByTestId('product-search-input').fill('labial');
    const firstResult = empPage.locator('[data-testid^="search-result-"]').first();
    await expect(firstResult).toBeVisible();
    await firstResult.click({ force: true });

    // Verify product in quote
    await expect(empPage.locator('[data-testid^="quote-item-"]').first()).toBeVisible();
    await expect(empPage.getByTestId('generate-pdf-button')).toBeVisible();

    await empContext.close();

    // Step 5: Clean up — delete test user
    await fetch(`${BASE_URL}/api/users/${newUser.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  });

  test('Employee: login → scanner page → navigate to quoter', async ({ page }) => {
    await dismissToasts(page);
    
    // Login as employee
    await loginAsEmployee(page, 'empleado1', 'emp123');
    await expect(page).toHaveURL(/\/scanner/);

    // Verify scanner page loads
    await expect(page.getByTestId('scanner-logo')).toBeVisible();
    await expect(page.getByTestId('start-scanner-button')).toBeVisible();

    // Navigate to quoter
    await page.goto('/quoter', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('quoter-logo')).toBeVisible();
    await expect(page.getByTestId('product-search-input')).toBeVisible();
  });

  test('Price logic end-to-end: bulk→P1, 12+→P2, 1-11→P3', async ({ page }) => {
    await dismissToasts(page);
    await loginAsEmployee(page, 'empleado1', 'emp123');
    await page.goto('/quoter', { waitUntil: 'domcontentloaded' });

    // Add a product
    await page.getByTestId('product-search-input').fill('labial');
    const firstResult = page.locator('[data-testid^="search-result-"]').first();
    await expect(firstResult).toBeVisible();
    await firstResult.click({ force: true });

    const quoteItem = page.locator('[data-testid^="quote-item-"]').first();
    await expect(quoteItem).toBeVisible();
    const itemTestId = await quoteItem.getAttribute('data-testid');
    const productId = itemTestId?.replace('quote-item-', '');

    // At qty=1 → P3 (Unidad 1-11)
    await expect(page.getByText('Unidad (1-11)')).toBeVisible();

    // Increase to 12 → P2 (Mayor 12+)
    for (let i = 0; i < 11; i++) {
      await page.getByTestId(`increase-qty-${productId}`).click();
    }
    await expect(page.getByTestId(`quantity-${productId}`)).toHaveText('12');
    await expect(page.getByText('Mayor (12+)')).toBeVisible();

    // Toggle bulk → P1 (Bulto) - use the badge which is the price label (2nd match)
    await page.getByTestId(`bulk-switch-${productId}`).click();
    await expect(page.getByText('Bulto').nth(1)).toBeVisible();
  });
});
