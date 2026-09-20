/**
 * Determines where to route a user after authentication.
 * If an intended destination was provided (e.g. preserved via ProtectedRoute location state)
 * and is not an auth route ('/auth' or '/login'), it preserves that intended destination.
 * Otherwise:
 * - If the user has an existing baseline: routes to '/dashboard'.
 * - If the user has no baseline: routes to '/onboarding'.
 */
export function postAuthDestination(
  hasBaseline: boolean,
  intendedDestination?: string | null
): string {
  if (
    intendedDestination &&
    intendedDestination !== '/auth' &&
    intendedDestination !== '/login' &&
    intendedDestination.startsWith('/')
  ) {
    return intendedDestination;
  }

  return hasBaseline ? '/dashboard' : '/onboarding';
}
