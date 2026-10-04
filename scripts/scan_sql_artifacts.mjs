import fs from 'fs';
import path from 'path';

const sqlFiles = [
  'supabase/migrations/20261006000001_m1_security_reconciliation.sql',
  'M1_PREFLIGHT.sql',
  'M1_POSTFLIGHT.sql'
];

let totalArtifacts = 0;

for (const file of sqlFiles) {
  const filePath = path.resolve('D:/TopVeda/TopVeda', file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf-8');

  // Real HTML tags: e.g. <br>, <div>, <p>, <span>, etc.
  const htmlTagRegex = /<\/?(br|div|p|span|a|b|i|strong|em|table|tr|td|th|ul|ol|li|h[1-6]|script|style|iframe|body|head|html)\b[^>]*>/gi;

  const checks = [
    { name: 'Escaped comments (\\--)', regex: /\\--/g },
    { name: 'Escaped identifiers (\\.)', regex: /\\\./g },
    { name: 'HTML entities (&#...)', regex: /&#[a-zA-Z0-9]+;/g },
    { name: 'Actual HTML tags (<br>, <div>, etc.)', regex: htmlTagRegex },
    { name: 'Markdown backticks in SQL body', regex: /```/g },
    { name: 'Unescaped markdown bold in SQL', regex: /\*\*[^*]+\*\*/g },
  ];

  console.log(`\n=== Scanning: ${file} ===`);
  let fileArtifacts = 0;
  for (const check of checks) {
    const matches = content.match(check.regex);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      console.log(`  [FAIL] Found ${count} instances of ${check.name}:`, matches);
      fileArtifacts += count;
    } else {
      console.log(`  [PASS] 0 instances of ${check.name}`);
    }
  }
  totalArtifacts += fileArtifacts;
}

console.log(`\n========================================`);
console.log(`Total Artifacts Found Across All Files: ${totalArtifacts}`);
console.log(`========================================\n`);

// Test try_cast_uuid regex logic
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const testCases = [
  { input: '123e4567-e89b-12d3-a456-426614174000', expected: true, desc: 'Valid lowercase UUID' },
  { input: '123E4567-E89B-12D3-A456-426614174000', expected: true, desc: 'Valid uppercase UUID' },
  { input: 'not-a-uuid', expected: false, desc: 'Invalid string' },
  { input: '123e4567-e89b-12d3-a456-42661417400', expected: false, desc: 'Truncated UUID' },
  { input: '123e4567-e89b-12d3-a456-4266141740000', expected: false, desc: 'Overlong UUID' },
  { input: '', expected: false, desc: 'Empty string' },
  { input: null, expected: false, desc: 'Null value' },
  { input: 'undefined', expected: false, desc: 'String undefined' }
];

console.log('=== Testing UUID Regex Validation ===');
for (const tc of testCases) {
  const result = tc.input !== null && uuidRegex.test(tc.input);
  const pass = result === tc.expected;
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${tc.desc}: input="${tc.input}" => ${result}`);
}
