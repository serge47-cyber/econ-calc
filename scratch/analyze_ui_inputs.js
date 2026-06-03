const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '../economic-tasks.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// 1. Find all inputs and selects in HTML
const inputRegex = /<(input|select|button)\s+([^>]*?)id="([^"]+)"([^>]*?)>/g;
const htmlElements = {};
let match;
while ((match = inputRegex.exec(html)) !== null) {
  const tag = match[1];
  const attrs = match[2] + match[4];
  const id = match[3];
  
  let type = tag;
  if (tag === 'input') {
    const typeMatch = /type="([^"]+)"/.exec(attrs);
    type = typeMatch ? typeMatch[1] : 'text';
  }
  
  const isHidden = attrs.includes('display:none') || attrs.includes('display: none') || attrs.includes('type="hidden"');
  
  htmlElements[id] = { id, tag, type, isHidden, line: html.substring(0, match.index).split('\n').length };
}

// 2. Find all document.getElementById in JS
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let jsCode = '';
while ((match = scriptRegex.exec(html)) !== null) {
  if (match[1].includes('function ci()')) {
    jsCode = match[1];
    break;
  }
}

const getElementRegex = /document\.getElementById\(\s*'([^']+)'\s*\)/g;
const jsRefs = {};
while ((match = getElementRegex.exec(jsCode)) !== null) {
  const id = match[1];
  jsRefs[id] = (jsRefs[id] || 0) + 1;
}

// 3. Analyze
console.log("=== ANALYSIS OF INPUTS IN economic-tasks.html ===");

console.log("\n1. Elements in HTML but NOT referenced in JS (Potential Dead HTML):");
let deadHTMLCount = 0;
for (const [id, el] of Object.entries(htmlElements)) {
  if (!jsRefs[id] && el.tag !== 'button' && id !== 'modal' && id !== 'modal-title' && id !== 'modal-body') {
    console.log(`- ID: ${id} (${el.tag} type="${el.type}") on line ${el.line}`);
    deadHTMLCount++;
  }
}
if (deadHTMLCount === 0) console.log("None found!");

console.log("\n2. JS References to IDs NOT present in HTML (Potential Broken JS):");
let brokenJSCount = 0;
for (const id of Object.keys(jsRefs)) {
  if (!htmlElements[id]) {
    console.log(`- ID: ${id} (referenced ${jsRefs[id]} times in JS)`);
    brokenJSCount++;
  }
}
if (brokenJSCount === 0) console.log("None found!");

console.log("\n3. Mapping of all range/number/select controls:");
for (const [id, el] of Object.entries(htmlElements)) {
  if (el.tag === 'button') continue;
  const isUsed = jsRefs[id] ? "YES" : "NO";
  console.log(`- ID: ${id} | HTML tag: ${el.tag} | Type: ${el.type} | Line: ${el.line} | Referenced in JS: ${isUsed}`);
}
