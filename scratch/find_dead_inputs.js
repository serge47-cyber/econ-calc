const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '../economic-tasks.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Parse HTML elements
const inputRegex = /<input\s+([^>]*?)id="([^"]+)"([^>]*?)>/g;
const selectRegex = /<select\s+([^>]*?)id="([^"]+)"([^>]*?)>/g;
const inputs = [];

let match;
while ((match = inputRegex.exec(html)) !== null) {
  const attrs = match[1] + match[3];
  const id = match[2];
  const typeMatch = /type="([^"]+)"/.exec(attrs);
  const type = typeMatch ? typeMatch[1] : 'text';
  inputs.push({ id, type, line: html.substring(0, match.index).split('\n').length });
}

const selects = [];
while ((match = selectRegex.exec(html)) !== null) {
  const id = match[2];
  selects.push({ id, line: html.substring(0, match.index).split('\n').length });
}

// Find JS script
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let jsCode = '';
while ((match = scriptRegex.exec(html)) !== null) {
  if (match[1].includes('function ci()')) {
    jsCode = match[1];
    break;
  }
}

// Check references
const unusedInputs = [];
const dynamicPatterns = [
  /pa_cf/, /pb_cf/, /pc_cf/ // these are matched dynamically: 'pa_cf' + i
];

for (const input of inputs) {
  const id = input.id;
  const isDirectlyUsed = jsCode.includes(`'${id}'`) || jsCode.includes(`"${id}"`);
  let isDynamicallyUsed = false;
  for (const pat of dynamicPatterns) {
    if (pat.test(id)) {
      isDynamicallyUsed = true;
      break;
    }
  }
  
  if (!isDirectlyUsed && !isDynamicallyUsed) {
    unusedInputs.push(input);
  }
}

console.log("Unused inputs in HTML (Falsely declared or dead code):");
if (unusedInputs.length === 0) {
  console.log("None!");
} else {
  unusedInputs.forEach(i => console.log(`- ID: ${i.id} | Type: ${i.type} on line ${i.line}`));
}

// Let's check for duplicate names (e.g. range and number with same name/id or similar name)
console.log("\nChecking for duplicate/similar IDs:");
const idMap = {};
for (const i of inputs) {
  const base = i.id.replace(/_range|_text|_val|c_|a_|n_|d_|b_|st_|bo_|rp_|l_|w_|pa_|pb_|pc_|sc_|ma_|mb_|fa_|fs_/, '');
  if (!idMap[base]) idMap[base] = [];
  idMap[base].push(i);
}
for (const [base, items] of Object.entries(idMap)) {
  if (items.length > 1 && base !== '' && base !== 'cf' && base !== 'cf1' && base !== 'cf2' && base !== 'cf3' && base !== 'cf4' && base !== 'cf5') {
    console.log(`Base: ${base}`);
    items.forEach(i => console.log(`  - ID: ${i.id} | Type: ${i.type} on line ${i.line}`));
  }
}
