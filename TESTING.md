# Testing Guide

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm test -- --run

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## Writing Tests

Tests are located next to the files they test with `.test.js` extension.

### Example Service Test

```javascript
import { describe, it, expect, vi } from 'vitest';
import { myService } from './myService';

describe('myService', () => {
  it('should test functionality', () => {
    expect(myService.someMethod()).toBe(expected);
  });
});
```

## Test Structure

- `src/test/setup.js` - Global test configuration
- `src/test/utils.js` - Test helper functions
- `vitest.config.js` - Vitest configuration

## More Info

See [tests_setup_walkthrough.md](file:///Users/a/.gemini/antigravity/brain/af0aa601-f6fb-4fee-9b2d-5dc5fdec91c5/tests_setup_walkthrough.md) in the brain folder for full documentation.
