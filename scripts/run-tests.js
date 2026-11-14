import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function findTestFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(full));
    } else if (entry.name.endsWith('.test.ts')) {
      results.push(full);
    }
  }
  return results;
}

const testFiles = findTestFiles('src');
console.log(`[PROSCREEN] Running ${testFiles.length} test suites:`);
testFiles.forEach((f) => console.log(`  - ${f}`));

const result = spawnSync('npx', ['tsx', '--test', ...testFiles], {
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 0);
