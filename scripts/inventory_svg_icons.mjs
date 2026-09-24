import fs from 'node:fs';
import { ALL_TOOLS } from '../src/tools/toolsRegistry.js';

const dir = './src/assets/fixmyfile-49-svg-icons';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg')).sort();

console.log('Total SVG files in directory:', files.length);

const inventory = [];
for (const f of files) {
  const content = fs.readFileSync(`${dir}/${f}`, 'utf8');
  const size = fs.statSync(`${dir}/${f}`).size;
  const viewBoxMatch = content.match(/viewBox=["']([^"']+)["']/);
  const isValidSvg = content.trim().startsWith('<svg') && content.trim().endsWith('</svg>');
  
  // Extract title if present
  const titleMatch = content.match(/<title>([^<]+)<\/title>/);

  inventory.push({
    filename: f,
    size,
    viewBox: viewBoxMatch ? viewBoxMatch[1] : 'NONE',
    title: titleMatch ? titleMatch[1] : '',
    isValid: isValidSvg
  });
}

console.log(`Are all 49 valid SVGs? ${inventory.every(i => i.isValid)}`);
console.log('Unique viewBoxes:', [...new Set(inventory.map(i => i.viewBox))]);

console.log('\n--- Full Inventory of 49 SVGs ---');
inventory.forEach((item, idx) => {
  console.log(`${(idx + 1).toString().padStart(2, ' ')}. ${item.filename.padEnd(30)} | ${item.size} bytes | viewBox="${item.viewBox}" | Title: "${item.title}"`);
});

// Map each tool in ALL_TOOLS to the corresponding SVG
console.log('\n--- Mapping 49 Active Tools to SVG Files ---');
let matchedCount = 0;
const mapping = [];

for (const tool of ALL_TOOLS) {
  // SVG filenames are prefixed with number e.g. "01-jpg-to-pdf.svg"
  // Try matching by tool.id in filename e.g. `-${tool.id}.svg`
  const matchedFile = files.find(f => f.endsWith(`-${tool.id}.svg`));
  if (matchedFile) {
    matchedCount++;
    mapping.push({
      id: tool.id,
      name: tool.name,
      path: tool.path,
      iconKey: tool.icon,
      svgFile: matchedFile
    });
  } else {
    console.error(`NO MATCH FOUND FOR TOOL: ${tool.id} (${tool.name})`);
  }
}

console.log(`\nMatched tools: ${matchedCount} / ${ALL_TOOLS.length}`);

console.log('\nDetailed Mapping:');
mapping.forEach((m, i) => {
  console.log(`${(i + 1).toString().padStart(2, ' ')}. [${m.id.padEnd(24)}] ${m.name.padEnd(26)} -> ${m.path.padEnd(25)} -> ${m.svgFile}`);
});
