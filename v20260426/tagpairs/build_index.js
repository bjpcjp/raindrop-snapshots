#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dir = path.dirname(process.argv[1]);
const files = fs.readdirSync(dir)
  .filter(f => f.endsWith('.html') && f !== 'index.html')
  .sort();

// Build prefix frequency map (prefix → count of files sharing it)
const prefixCount = new Map();
for (const file of files) {
  const base = file.replace(/\.html$/, '');
  const parts = base.split('-');
  for (let i = 1; i < parts.length; i++) {
    const prefix = parts.slice(0, i).join('-');
    prefixCount.set(prefix, (prefixCount.get(prefix) || 0) + 1);
  }
}

// For each file, tag1 = longest prefix with count > 1
function getTag1(filename) {
  const base = filename.replace(/\.html$/, '');
  const parts = base.split('-');
  let tag1 = parts[0];
  for (let i = 2; i < parts.length; i++) {
    const prefix = parts.slice(0, i).join('-');
    if ((prefixCount.get(prefix) || 0) > 1) tag1 = prefix;
  }
  return tag1;
}

// Group files by tag1
const groups = new Map();
for (const file of files) {
  const tag1 = getTag1(file);
  if (!groups.has(tag1)) groups.set(tag1, []);
  groups.get(tag1).push(file);
}

// Count articles (<div class="card">) in each file
function countArticles(filename) {
  const content = fs.readFileSync(path.join(dir, filename), 'utf8');
  return (content.match(/<div class="card">/g) || []).length;
}

// Generate index.html
const sortedTag1s = [...groups.keys()].sort((a, b) => groups.get(b).length - groups.get(a).length);

const rows = sortedTag1s.map(tag1 => {
  const items = groups.get(tag1);
  const tag2Links = items.map(f => {
    const base = f.replace(/\.html$/, '');
    const tag2 = base.slice(tag1.length + 1); // strip "tag1-"
    const n = countArticles(f);
    return `      <li><a href="${f}">${tag2}</a> <span class="count">(${n})</span></li>`;
  }).join('\n');
  return `  <details>
    <summary><strong>${tag1}</strong></summary>
    <ul>
${tag2Links}
    </ul>
  </details>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Brian Piercy's Raindrop.io article library, version 20260426</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #222; }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
    p.meta { color: #666; font-size: 0.9rem; margin-bottom: 1.5rem; }
    details { border: 1px solid #ddd; border-radius: 4px; margin: 0.3rem 0; }
    summary { padding: 0.5rem 0.75rem; cursor: pointer; user-select: none; background: #f5f5f5; border-radius: 4px; }
    summary:hover { background: #e8e8e8; }
    details[open] summary { border-radius: 4px 4px 0 0; background: #e0eaff; }
    .count { color: #888; font-weight: normal; font-size: 0.85rem; }
    ul { margin: 0; padding: 0.5rem 0.75rem 0.5rem 1.5rem; list-style: disc; }
    li { padding: 0.15rem 0; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .controls { margin-bottom: 1rem; }
    button { margin-right: 0.5rem; padding: 0.3rem 0.8rem; cursor: pointer; border: 1px solid #ccc; border-radius: 3px; background: #fff; }
    button:hover { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>Brian Piercy's Raindrop.io article library, version 20260426</h1>
  <p class="meta">${sortedTag1s.length} primary tags &mdash; ${files.length} total pairs</p>
  <div class="controls">
    <button onclick="document.querySelectorAll('details').forEach(d=>d.open=true)">Expand all</button>
    <button onclick="document.querySelectorAll('details').forEach(d=>d.open=false)">Collapse all</button>
  </div>
${rows}
</body>
</html>
`;

const outPath = path.join(dir, 'index.html');
fs.writeFileSync(outPath, html);
console.log(`Written: ${outPath}`);
console.log(`${sortedTag1s.length} tag1 groups, ${files.length} files`);
