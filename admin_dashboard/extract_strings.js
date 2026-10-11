const fs = require('fs');

const files = [
  './admin_dashboard/src/app/page.tsx',
  './admin_dashboard/src/app/agency/page.tsx'
];

const stringSet = new Set();

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');

  // Match JSX text: >Text<
  const jsxTextRegex = />\s*([A-Za-z][A-Za-z0-9 ,.'’\(\)\/\-–—&%+:\?]{2,90})\s*</g;
  let m;
  while ((m = jsxTextRegex.exec(content)) !== null) {
    const text = m[1].trim();
    if (text.length > 1 && !text.startsWith('http') && !text.includes('className') && !text.includes('{') && !text.includes('}')) {
      stringSet.add(text);
    }
  }

  // Match placeholder="..." and title="..." and label: "..."
  const attrRegex = /(?:placeholder|title|label|subtitle|header)\s*[:=]\s*["']([^"']{3,90})["']/g;
  while ((m = attrRegex.exec(content)) !== null) {
    const text = m[1].trim();
    if (!text.startsWith('http') && !text.includes('className')) {
      stringSet.add(text);
    }
  }
}

const sorted = Array.from(stringSet).sort();
console.log('Total unique strings extracted:', sorted.length);
fs.writeFileSync('./admin_dashboard/extracted_strings.json', JSON.stringify(sorted, null, 2));
console.log('First 40 strings:');
console.log(sorted.slice(0, 40));
