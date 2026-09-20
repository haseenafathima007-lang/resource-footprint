import { describe, it, expect } from 'vitest';
import { postAuthDestination } from './postAuthDestination.ts';

describe('postAuthDestination', () => {
  it('routes to /onboarding when user has no baseline and no intended destination', () => {
    expect(postAuthDestination(false)).toBe('/onboarding');
    expect(postAuthDestination(false, null)).toBe('/onboarding');
    expect(postAuthDestination(false, undefined)).toBe('/onboarding');
  });

  it('routes to /dashboard when user has baseline and no intended destination', () => {
    expect(postAuthDestination(true)).toBe('/dashboard');
    expect(postAuthDestination(true, null)).toBe('/dashboard');
  });

  it('preserves intended destination when valid', () => {
    expect(postAuthDestination(false, '/onboarding?from=simulator')).toBe('/onboarding?from=simulator');
    expect(postAuthDestination(true, '/account')).toBe('/account');
    expect(postAuthDestination(false, '/custom-page')).toBe('/custom-page');
  });

  it('ignores self-referential auth routes and applies baseline logic', () => {
    expect(postAuthDestination(false, '/auth')).toBe('/onboarding');
    expect(postAuthDestination(true, '/auth')).toBe('/dashboard');
    expect(postAuthDestination(false, '/login')).toBe('/onboarding');
    expect(postAuthDestination(true, '/login')).toBe('/dashboard');
  });

  it('ignores non-path intended destinations', () => {
    expect(postAuthDestination(false, 'javascript:alert(1)')).toBe('/onboarding');
    expect(postAuthDestination(true, 'https://evil.com')).toBe('/dashboard');
  });
});
