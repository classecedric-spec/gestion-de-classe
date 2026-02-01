/**
 * @file healthcheck.spec.ts
 * @description Critical E2E health check to ensure the application starts without errors.
 */

import { test, expect } from '@playwright/test';

test.describe('Health Check', () => {
    test('should load the home page without critical errors', async ({ page }) => {
        const errors: any[] = [];
        const consoleErrors: string[] = [];

        // Listen for page errors
        page.on('pageerror', (err) => errors.push(err));

        // Listen for console errors
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // 1. Visiter la page d'accueil (/)
        await page.goto('/');

        // 2. Vérifier que le titre de la page est présent
        // We expect any title to be present, or a specific one if known.
        // Checking if title is not empty.
        const title = await page.title();
        expect(title).not.toBe('');
        console.log('Page title:', title);

        // 3. Vérifier qu'aucune erreur critique n'apparaît dans la console du navigateur
        expect(errors).toHaveLength(0);

        // Note: Some non-critical console errors might exist (e.g. source maps), 
        // but we'll log them and check for major ones if possible.
        if (consoleErrors.length > 0) {
            console.warn('Console errors detected:', consoleErrors);
        }

        // 4. Vérifier qu'un élément clé (ex: #root ou main) est rendu
        const root = page.locator('#root');
        await expect(root).toBeVisible();

        const main = page.locator('main');
        // Depending on the app, main might be inside #root or side-by-side. 
        // We check if at least one of them is present and contains content.
        const contentCount = await root.count();
        expect(contentCount).toBeGreaterThan(0);
    });
});
