/**
 * Staff permission catalog + role presets for the Live2030 Admin Panel (RBAC).
 *
 * Every protected admin endpoint declares one or more permission keys via
 * `@RequirePermissions(...)`. A staff account is granted permissions either by
 * its `StaffRole` preset or by explicit per-account overrides stored on
 * `User.permissions`. The `SUPER_ADMIN` role (and `*`) grants every permission.
 */

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

/** Master catalog of every capability exposed to staff accounts. */
export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: 'overview.view', label: 'View Executive Overview', group: 'Overview' },

  { key: 'users.view', label: 'View Users', group: 'Users' },
  { key: 'users.edit', label: 'Edit Users', group: 'Users' },
  { key: 'users.ban', label: 'Ban / Suspend Users', group: 'Users' },
  { key: 'users.verify', label: 'Grant / Revoke Verification', group: 'Users' },
  { key: 'users.wallet', label: 'Adjust Wallets', group: 'Users' },

  { key: 'financial.view', label: 'View Financial Reports', group: 'Finance' },
  { key: 'payments.view', label: 'View Payment Orders', group: 'Finance' },
  { key: 'withdrawals.view', label: 'View Withdrawals', group: 'Finance' },
  { key: 'withdrawals.manage', label: 'Approve / Reject Withdrawals', group: 'Finance' },
  { key: 'economics.manage', label: 'Edit Revenue Split', group: 'Finance' },

  { key: 'gifts.view', label: 'View Gifts', group: 'Gifts' },
  { key: 'gifts.manage', label: 'Manage Gifts', group: 'Gifts' },

  { key: 'agencies.view', label: 'View Agencies', group: 'Agencies' },
  { key: 'agencies.manage', label: 'Manage Agencies', group: 'Agencies' },

  { key: 'resellers.view', label: 'View Resellers', group: 'Resellers' },
  { key: 'resellers.manage', label: 'Manage Resellers', group: 'Resellers' },

  { key: 'coin_packages.view', label: 'View Coin Packages', group: 'Recharge' },
  { key: 'coin_packages.manage', label: 'Manage Coin Packages', group: 'Recharge' },

  { key: 'games.view', label: 'View Games', group: 'Games' },
  { key: 'games.manage', label: 'Manage Games', group: 'Games' },

  { key: 'content.view', label: 'View Content Moderation', group: 'Content' },
  { key: 'content.moderate', label: 'Hide / Remove Content & Warn Users', group: 'Content' },
  { key: 'notifications.manage', label: 'Broadcast Notifications', group: 'Content' },
  { key: 'audit.view', label: 'View Admin Audit Log', group: 'Security' },

  { key: 'levels.view', label: 'View Level Tiers', group: 'Levels' },
  { key: 'levels.manage', label: 'Manage Level Assets & Tiers', group: 'Levels' },

  { key: 'vip.view', label: 'View VIP Tiers', group: 'VIP' },
  { key: 'vip.manage', label: 'Manage VIP Tiers', group: 'VIP' },

  { key: 'live.view', label: 'View Live Rooms', group: 'Live' },
  { key: 'live.manage', label: 'Moderate / End Live Rooms', group: 'Live' },

  { key: 'support.view', label: 'View Reports', group: 'Support' },
  { key: 'support.manage', label: 'Resolve Reports', group: 'Support' },

  { key: 'staff.view', label: 'View Staff Accounts', group: 'Staff' },
  { key: 'staff.manage', label: 'Create / Edit Staff Accounts', group: 'Staff' },
];

export const ALL_PERMISSIONS = PERMISSION_CATALOG.map((p) => p.key);

/** Role presets. `SUPER_ADMIN` is the wildcard. */
export const ROLE_PERMISSION_PRESETS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ALL_PERMISSIONS.filter((p) => !p.startsWith('staff.')),
  MODERATOR: [
    'overview.view',
    'users.view',
    'users.ban',
    'users.verify',
    'live.view',
    'live.manage',
    'support.view',
    'support.manage',
    'content.view',
    'content.moderate',
    'notifications.manage',
    'audit.view',
    'gifts.view',
    'games.view',
  ],
  SUPPORT: [
    'overview.view',
    'users.view',
    'support.view',
    'support.manage',
    'live.view',
    'content.view',
  ],
  FINANCE: [
    'overview.view',
    'financial.view',
    'payments.view',
    'withdrawals.view',
    'withdrawals.manage',
    'economics.manage',
    'users.view',
    'users.wallet',
  ],
  MARKETING: [
    'overview.view',
    'gifts.view',
    'gifts.manage',
    'vip.view',
    'vip.manage',
    'coin_packages.view',
    'coin_packages.manage',
    'resellers.view',
    'agencies.view',
    'games.view',
  ],
};

/** Roles that may sign in to the admin panel. */
export const STAFF_ROLES = Object.keys(ROLE_PERMISSION_PRESETS);

/**
 * Resolve the effective permission set for a staff user.
 * Explicit `user.permissions` entries ADD to the role preset (never remove).
 */
export function resolvePermissions(user: {
  role?: string | null;
  staffRole?: string | null;
  permissions?: string[] | null;
}): string[] {
  if (user.role === 'SUPER_ADMIN') return ['*'];
  const presetRole = (user.staffRole as string) || (user.role === 'AGENCY_ADMIN' ? 'ADMIN' : '');
  const preset = ROLE_PERMISSION_PRESETS[presetRole] || [];
  if (preset.includes('*')) return ['*'];
  const explicit = Array.isArray(user.permissions) ? user.permissions : [];
  return Array.from(new Set([...preset, ...explicit]));
}

/** True if the effective permission set satisfies every required key. */
export function hasAllPermissions(effective: string[], required: string[]): boolean {
  if (!required || required.length === 0) return true;
  if (effective.includes('*')) return true;
  return required.every((r) => effective.includes(r));
}
