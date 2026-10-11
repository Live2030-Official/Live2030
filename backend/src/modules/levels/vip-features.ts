export type VipFeatureCategory =
  | 'chat'
  | 'profile'
  | 'privacy'
  | 'rooms'
  | 'gifts'
  | 'effects'
  | 'protection'
  | 'priority';

export interface VipFeatureDefinition {
  key: string;
  label: string;
  description: string;
  category: VipFeatureCategory;
}

export const VIP_FEATURE_CATEGORIES: { key: VipFeatureCategory; label: string }[] = [
  { key: 'chat', label: 'Chat & Messaging' },
  { key: 'profile', label: 'Profile & Identity' },
  { key: 'privacy', label: 'Privacy & Stealth' },
  { key: 'rooms', label: 'Rooms & Hosting' },
  { key: 'gifts', label: 'Gifts' },
  { key: 'effects', label: 'Entrance & Celebration Effects' },
  { key: 'protection', label: 'Protection & Immunity' },
  { key: 'priority', label: 'Visibility & Priority' },
];

/**
 * Canonical catalog of every VIP benefit that can be granted or revoked
 * per tier from the Admin Dashboard. This is the single source of truth the
 * admin panel renders, so toggling a key here immediately controls that
 * benefit across the apps.
 */
export const VIP_FEATURE_CATALOG: VipFeatureDefinition[] = [
  { key: 'unlimitedChat', label: 'Unlimited Chat', description: 'No daily chat message limits.', category: 'chat' },
  { key: 'unlimitedPrivateMedia', label: 'Unlimited Private Photos & Media', description: 'Send private photos and media without limits.', category: 'chat' },
  { key: 'unlimitedComments', label: 'Unlimited Comments', description: 'Post comments without daily limits.', category: 'chat' },
  { key: 'rejectStrangerMessages', label: 'Reject Stranger Messages', description: 'Only receive DMs from people you follow.', category: 'chat' },
  { key: 'disableFollowing', label: 'Disable Following', description: 'Prevent others from following your profile.', category: 'chat' },
  { key: 'vipChatBubble', label: 'VIP Chat Bubble', description: 'Exclusive styled message bubble in rooms.', category: 'chat' },

  { key: 'vipBadge', label: 'VIP Badge', description: 'Tier badge shown next to your name.', category: 'profile' },
  { key: 'vipFrame', label: 'VIP Avatar Frame', description: 'Static VIP avatar frame.', category: 'profile' },
  { key: 'animatedFrame', label: 'Animated VIP Frame', description: 'Animated avatar frame.', category: 'profile' },
  { key: 'animatedAvatar', label: 'Animated Profile Picture', description: 'Use an animated avatar aura.', category: 'profile' },
  { key: 'customId', label: 'Vanity Custom ID', description: 'Claim a unique vanity platform ID.', category: 'profile' },
  { key: 'customNameColor', label: 'Custom Name Color', description: 'Pick a custom color for your name.', category: 'profile' },
  { key: 'specialUniqueName', label: 'Special Unique Name', description: 'Reserve a special/exclusive display name.', category: 'profile' },
  { key: 'exclusiveNameStyle', label: 'Exclusive Name Style', description: 'Fully exclusive name styling.', category: 'profile' },
  { key: 'topVipFrame', label: 'Top VIP Frame', description: 'Ultimate tier avatar frame.', category: 'profile' },
  { key: 'topVipBadge', label: 'Top VIP Badge', description: 'Ultimate tier badge insignia.', category: 'profile' },
  { key: 'exclusiveVipIdentity', label: 'Exclusive VIP Identity', description: 'Unique high-tier identity marker.', category: 'profile' },

  { key: 'hideLocationInRooms', label: 'Hide Location In Rooms', description: 'Conceal country/flag in live & audio rooms.', category: 'privacy' },
  { key: 'invisibleOnlineStatus', label: 'Invisible Online Status', description: 'Hide the green active indicator.', category: 'privacy' },
  { key: 'hideCountry', label: 'Hide Country / Flag', description: 'Remove the country badge entirely.', category: 'privacy' },
  { key: 'mysteryMode', label: 'Mystery Mode', description: 'Browse feeds with a mystery avatar aura.', category: 'privacy' },
  { key: 'hideFromVisitors', label: 'Hide From Profile Visitors', description: 'Do not appear in visitors histories.', category: 'privacy' },
  { key: 'hideRoomFromTrending', label: 'Hide Room From Trending', description: 'Exclude your rooms from public discovery.', category: 'privacy' },
  { key: 'anonymousInGames', label: 'Anonymous Mode In Games', description: 'Conceal identity while playing games.', category: 'privacy' },
  { key: 'stealthRoomAccess', label: 'Stealth Room Access', description: 'Enter rooms silently without notifications.', category: 'privacy' },
  { key: 'appLoginNotification', label: 'App Login Notification', description: 'Announce your login inside the app.', category: 'privacy' },

  { key: 'viewProfileVisitors', label: 'View Profile Visitors', description: 'See who visited your profile.', category: 'rooms' },
  { key: 'lockRooms', label: 'Room PIN Locking', description: 'Lock your rooms with a PIN.', category: 'rooms' },
  { key: 'customRoomCover', label: 'Custom Room Cover', description: 'Choose a custom cover for your room.', category: 'rooms' },

  { key: 'specialVipGifts', label: 'Special VIP Gifts', description: 'Send exclusive VIP-only gifts.', category: 'gifts' },
  { key: 'additionalGiftSet', label: 'Additional Gift Set', description: 'Unlock an extra set of gifts.', category: 'gifts' },

  { key: 'specialEntryEffect', label: 'Special Entry Effect', description: 'Animated banner when entering a room.', category: 'effects' },
  { key: 'legendaryLoginEffect', label: 'Legendary Login Effect', description: 'Legendary login celebration effect.', category: 'effects' },
  { key: 'highestLoginEffect', label: 'Highest Login Effect', description: 'Top-tier login celebration effect.', category: 'effects' },
  { key: 'dailyGlobalRoomAnnouncement', label: 'Global Room Announcement', description: 'Daily VIP announcement across all rooms.', category: 'effects' },

  { key: 'kickProtection', label: 'Kick Protection', description: 'Cannot be kicked from rooms.', category: 'protection' },
  { key: 'banProtection', label: 'Ban Protection', description: 'Cannot be banned from comments or rooms.', category: 'protection' },
  { key: 'kickImmunity', label: 'Kick Immunity', description: 'Immunity from being kicked by hosts.', category: 'protection' },

  { key: 'higherPriorityInLists', label: 'Higher Priority In Lists', description: 'Appear higher in lists and feeds.', category: 'priority' },
  { key: 'higherPriorityInMenus', label: 'Higher Priority In Menus', description: 'Appear higher in menus.', category: 'priority' },
  { key: 'maxSystemPriority', label: 'Maximum System Priority', description: 'Highest possible system priority.', category: 'priority' },
];

export function getVipFeatureCatalog(): VipFeatureDefinition[] {
  return VIP_FEATURE_CATALOG;
}
