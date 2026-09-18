import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...walk(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  }
  return results;
}

const targetDirs = ['out', '.next/static'];
let totalFixed = 0;
let filesModified = 0;

for (const targetDir of targetDirs) {
  if (!fs.existsSync(targetDir)) continue;
  const jsFiles = walk(targetDir);
  for (const filePath of jsFiles) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('static{') && !content.includes('static {')) continue;

    let fileFixCount = 0;
    const updated = content.replace(/static\s*\{([^}]+)\}/g, (match, body) => {
      fileFixCount++;
      totalFixed++;
      const trimmed = body.trim().replace(/;+$/, '');
      const safeExpr = trimmed.replace(/;/g, ',');
      return `static _st${fileFixCount}=(${safeExpr});`;
    });

    if (updated !== content) {
      fs.writeFileSync(filePath, updated, 'utf8');
      filesModified++;
      console.log(`[Safari Fix] Downleveled ${fileFixCount} static blocks in: ${filePath}`);
    }
  }
}

console.log(`[Safari Fix] Complete: Fixed ${totalFixed} static block(s) across ${filesModified} file(s).`);

