import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('=== DEPLOYING DIST-WEBSITE TO GH-PAGES BRANCH ===\n');

const distWebsiteDir = path.resolve('dist-website');

// Clean any accidental .git or downloads folder in dist-website
const existingGit = path.join(distWebsiteDir, '.git');
if (fs.existsSync(existingGit)) {
  fs.rmSync(existingGit, { recursive: true, force: true });
}
const distDownloads = path.join(distWebsiteDir, 'downloads');
if (fs.existsSync(distDownloads)) {
  fs.rmSync(distDownloads, { recursive: true, force: true });
}

if (!fs.existsSync(distWebsiteDir) || !fs.existsSync(path.join(distWebsiteDir, 'index.html'))) {
  console.error('ERROR: dist-website/index.html not found. Run "npm run build:website" first.');
  process.exit(1);
}

// Add .nojekyll to dist-website to prevent GitHub Pages Jekyll processing
fs.writeFileSync(path.join(distWebsiteDir, '.nojekyll'), '');

const repoUrl = 'https://github.com/sonuk597733-cyber/proscreen.git';

try {
  process.chdir(distWebsiteDir);
  console.log('1. Initializing temporary git in dist-website...');
  execSync('git init -b gh-pages', { stdio: 'inherit' });
  execSync('git config user.name "sonu kumar"', { stdio: 'inherit' });
  execSync('git config user.email "sonuk597733@gmail.com"', { stdio: 'inherit' });

  console.log('2. Staging all website files (excluding raw EXEs)...');
  execSync('git add -A', { stdio: 'inherit' });

  console.log('3. Committing website bundle...');
  execSync('git commit -m "deploy: official ProScreen website to GitHub Pages"', { stdio: 'inherit' });

  console.log(`4. Pushing to ${repoUrl} (branch: gh-pages)...`);
  execSync(`git push -f ${repoUrl} gh-pages`, { stdio: 'inherit' });

  console.log('✔ Pushed to gh-pages successfully.');
} catch (err) {
  console.error('Deploy to gh-pages failed:', err);
  process.exit(1);
} finally {
  const gitDir = path.join(distWebsiteDir, '.git');
  if (fs.existsSync(gitDir)) {
    fs.rmSync(gitDir, { recursive: true, force: true });
  }
}

console.log('\n=== GH-PAGES DEPLOYMENT COMPLETE ===');
