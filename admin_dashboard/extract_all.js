const fs = require('fs');

const files = [
  './admin_dashboard/src/app/page.tsx',
  './admin_dashboard/src/app/agency/page.tsx'
];

const stringSet = new Set();

// Add foundational UI vocabulary
const foundational = [
  'Overview', 'Users', 'Reports', 'Streams', 'Resellers', 'Agencies', 'Gifts',
  'Payouts', 'Financial', 'Contact Support', 'VIP Features', 'Super Admin',
  'Admin Console', 'Agency Portal', 'Talent Agency Portal', 'Search', 'Filter',
  'Export', 'Download', 'Save Changes', 'Confirm', 'Cancel', 'Close', 'Delete',
  'Edit', 'Update', 'Create', 'Add', 'Send Coins', 'Approve', 'Reject',
  'Kill Stream', 'Terminate Room', 'Ban User', 'Suspend', 'Warn', 'Unban',
  'Reset Password', 'View Profile', 'View Stream', 'Copy ID', 'Copied',
  'Connect', 'Disconnect', 'Online', 'Offline', 'Status', 'Actions', 'Details',
  'Date', 'Name', 'Email', 'Role', 'Level', 'Diamonds', 'Coins', 'Balance',
  'All Statuses', 'All Types', 'All Roles', 'Loading...', 'Please wait',
  'Success', 'Error', 'Log Out', 'Logout', 'Active', 'Inactive', 'Banned',
  'Suspended', 'Pending', 'Approved', 'Rejected', 'Completed', 'Failed',
  'Gross Volume', 'Exchange Rate', 'USD', 'Total Revenue', 'Wallet',
  'Wallet Balance', 'Adjust Wallet', 'Adjust Revenue', 'Adjust VIP',
  'Preview', 'Type', 'Category', 'Region', 'Reset', 'Resolved', 'Dismiss',
  'Done', 'Saving...', 'Viewers', 'Live', 'Host', 'Broadcaster', 'Member',
  'Members', 'Broadcasters', 'Commission', 'Cut', 'Net', 'Earnings',
  'Password', 'Login', 'Sign In', 'Sign Out', 'Settings', 'Profile',
  'Help', 'Support', 'Documentation', 'Audit', 'Note', 'Reason', 'Amount',
  'Target', 'Account', 'System', 'Live Stream', 'Audio Party', 'Voice Party',
  'Phone', 'Mobile', 'Country', 'Code', 'Created At', 'Updated At', 'ID',
  'Operation Successful', 'Failed to update', 'An error occurred'
];

foundational.forEach(s => stringSet.add(s));

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');

  // Match JSX text: >Text<
  const jsxTextRegex = />\s*([A-Za-z][A-Za-z0-9 ,.'’\(\)\/\-–—&%+:\?#!]{1,90})\s*</g;
  let m;
  while ((m = jsxTextRegex.exec(content)) !== null) {
    const text = m[1].trim();
    if (text.length > 1 && !text.startsWith('http') && !text.includes('className') && !text.includes('{') && !text.includes('}')) {
      stringSet.add(text);
    }
  }

  // Match attributes: placeholder, title, label, subtitle
  const attrRegex = /(?:placeholder|title|label|subtitle|header)\s*[:=]\s*["']([^"']{2,90})["']/g;
  while ((m = attrRegex.exec(content)) !== null) {
    const text = m[1].trim();
    if (!text.startsWith('http') && !text.includes('className')) {
      stringSet.add(text);
    }
  }

  // Match string literals inside buttons, alerts, headers
  const alertRegex = /(?:alert|confirm|prompt)\s*\(\s*["']([^"']{2,90})["']\s*\)/g;
  while ((m = alertRegex.exec(content)) !== null) {
    const text = m[1].trim();
    stringSet.add(text);
  }
}

// Clean up and filter out pure codes/hex/classes
const cleaned = Array.from(stringSet).filter(s => {
  const t = s.trim();
  if (t.length <= 1) return false;
  if (/^[0-9+.\-/: ]+$/.test(t)) return false; // purely numbers/phone
  if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return false; // hex colors
  if (t.startsWith('http://') || t.startsWith('https://')) return false;
  if (t.startsWith('bg-') || t.startsWith('text-') || t.startsWith('border-')) return false;
  return true;
}).sort();

console.log('Total cleaned unique strings:', cleaned.length);
fs.writeFileSync('./admin_dashboard/extracted_strings.json', JSON.stringify(cleaned, null, 2));
