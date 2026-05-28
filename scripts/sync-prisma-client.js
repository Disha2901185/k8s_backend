const fs = require('fs');
const path = require('path');

const sourceDir = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
const targetDir = path.join(process.cwd(), 'node_modules', '@prisma', 'client', '.prisma', 'client');
const clientEntryFiles = [
  path.join(sourceDir, 'index.js'),
  path.join(targetDir, 'index.js'),
];

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Generated Prisma client not found at ${sourceDir}`);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });

for (const filePath of clientEntryFiles) {
  if (!fs.existsSync(filePath)) {
    continue;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  if (!contents.includes('"copyEngine": false')) {
    continue;
  }

  fs.writeFileSync(filePath, contents.replace('"copyEngine": false', '"copyEngine": true'));
  console.log(`Normalized Prisma client engine config in ${filePath}`);
}

console.log(`Synced Prisma client to ${targetDir}`);
