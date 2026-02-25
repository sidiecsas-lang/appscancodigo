import { test, expect } from '@playwright/test';
import { loginAsEmployee, dismissToasts } from '../fixtures/helpers';

test.describe('Quoter Page - Employee Flow', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsEmployee(page, 'empleado1', 'emp123');
    await page.goto('/quoter', { waitUntil: 'domcontentloaded' });
  });

  test('quoter page loads with all key elements', async ({ page }) => {
    await expect(page.getByTestId('quoter-logo')).toBeVisible();
    await expect(page.getByTestId('client-name-input')).toBeVisible();
    await expect(page.getByTestId('product-search-input')).toBeVisible();
  });

  test('empty quote shows empty state message', async ({ page }) => {
    await expect(page.getByText('No hay productos agregados')).toBeVisible();
  });

  test('product search returns results', async ({ page }) => {
    const searchInput = page.getByTestId('product-search-input');
    await searchInput.fill('labial');
    // Wait for debounce + API call to return results
    await expect(page.locator('[data-testid^="search-result-"]').first()).toBeVisible();
  });

  test('adding product to quote updates item list', async ({ page }) => {
    const searchInput = page.getByTestId('product-search-input');
    await searchInput.fill('labial');
    const firstResult = page.locator('[data-testid^="search-result-"]').first();
    await expect(firstResult).toBeVisible();
    await firstResult.click({ force: true });

    // Quote items should now show
    await expect(page.locator('[data-testid^="quote-item-"]').first()).toBeVisible();
    // Generate PDF and Share buttons should appear
    await expect(page.getByTestId('generate-pdf-button')).toBeVisible();
    await expect(page.getByTestId('share-button')).toBeVisible();
  });

  test('quantity controls work correctly', async ({ page }) => {
    // Add a product
    const searchInput = page.getByTestId('product-search-input');
    await searchInput.fill('labial');
    const firstResult = page.locator('[data-testid^="search-result-"]').first();
    await expect(firstResult).toBeVisible();
    await firstResult.click({ force: true });

    // Get the product ID from the quote item
    const quoteItem = page.locator('[data-testid^="quote-item-"]').first();
    await expect(quoteItem).toBeVisible();
    const itemTestId = await quoteItem.getAttribute('data-testid');
    const productId = itemTestId?.replace('quote-item-', '');

    // Initial quantity should be 1
    await expect(page.getByTestId(`quantity-${productId}`)).toHaveText('1');

    // Increase quantity
    await page.getByTestId(`increase-qty-${productId}`).click();
    await expect(page.getByTestId(`quantity-${productId}`)).toHaveText('2');

    // Decrease quantity
    await page.getByTestId(`decrease-qty-${productId}`).click();
    await expect(page.getByTestId(`quantity-${productId}`)).toHaveText('1');
  });

  test('removing item from quote works', async ({ page }) => {
    // Add a product
    const searchInput = page.getByTestId('product-search-input');
    await searchInput.fill('labial');
    const firstResult = page.locator('[data-testid^="search-result-"]').first();
    await expect(firstResult).toBeVisible();
    await firstResult.click({ force: true });

    // Verify item added
    const quoteItem = page.locator('[data-testid^="quote-item-"]').first();
    await expect(quoteItem).toBeVisible();
    const itemTestId = await quoteItem.getAttribute('data-testid');
    const productId = itemTestId?.replace('quote-item-', '');

    // Remove item
    await page.getByTestId(`remove-item-${productId}`).click();

    // Quote should be empty again
    await expect(page.getByText('No hay productos agregados')).toBeVisible();
  });

  test('client name input accepts text', async ({ page }) => {
    const clientNameInput = page.getByTestId('client-name-input');
    await clientNameInput.fill('Test Cliente ABC');
    await expect(clientNameInput).toHaveValue('Test Cliente ABC');
  });
});

test.describe('Quoter - Price Logic Verification', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await loginAsEmployee(page, 'empleado1', 'emp123');
    await page.goto('/quoter', { waitUntil: 'domcontentloaded' });
  });

  test('price label shows P3 for quantity 1-11', async ({ page }) => {
    const searchInput = page.getByTestId('product-search-input');
    await searchInput.fill('labial');
    const firstResult = page.locator('[data-testid^="search-result-"]').first();
    await expect(firstResult).toBeVisible();
    await firstResult.click({ force: true });

    // At qty=1, price label should be P3 / Unidad
    await expect(page.getByText('P3')).toBeVisible();
  });
});
