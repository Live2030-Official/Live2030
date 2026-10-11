import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';
export const PUBLIC_KEY = 'is_public_route';

/**
 * Require one or more staff permissions on a controller or handler.
 * Routes WITHOUT this decorator are treated as public (no admin auth required),
 * so the mobile/user-facing API is unaffected.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Explicitly mark a route as public (bypasses admin permission checks). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
