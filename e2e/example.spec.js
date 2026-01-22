import { test, expect } from '@playwright/test';

test('landing page has title and login button', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Gestion de Classe/);

    // Check for main actions
    const loginLink = page.getByRole('link', { name: /commencer|connexion/i }).first();
    await expect(loginLink).toBeVisible();
});
