import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';

console.log('=== PUBLISHING PROSCREEN RELEASE ASSETS VIA GITHUB API ===\n');

// 1. Retrieve token securely from GCM without printing it
function getAuthHeader() {
  const input = 'protocol=https\nhost=github.com\n\n';
  const out = execSync('git credential fill', {
    input,
    encoding: 'utf-8',
    timeout: 5000,
  });
  const lines = out.split('\n');
  let user = '';
  let pass = '';
  for (const line of lines) {
    if (line.startsWith('username=')) user = line.split('=')[1].trim();
    if (line.startsWith('password=')) pass = line.split('=')[1].trim();
  }
  if (!pass) {
    throw new Error('No password or token returned from Git Credential Manager');
  }
  return {
    user,
    authHeader: `Bearer ${pass}`,
  };
}

const { user, authHeader } = getAuthHeader();
console.log(`Authenticated as GitHub user: ${user}`);

const repoOwner = 'sonuk597733-cyber';
const repoName = 'proscreen';
const tagName = 'v1.0.0';

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      if (Buffer.isBuffer(postData)) {
        req.write(postData);
      } else {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
    }
    req.end();
  });
}

async function getOrCreateRelease() {
  console.log(`Checking existing release for tag ${tagName}...`);
  const getOpt = {
    hostname: 'api.github.com',
    path: `/repos/${repoOwner}/${repoName}/releases/tags/${tagName}`,
    method: 'GET',
    headers: {
      'User-Agent': 'ProScreen-Release-Publisher',
      Accept: 'application/vnd.github+json',
      Authorization: authHeader,
    },
  };

  const getRes = await httpsRequest(getOpt);
  if (getRes.statusCode === 200) {
    const release = JSON.parse(getRes.body);
    console.log(`Release found: ${release.name} (id: ${release.id})`);
    return release;
  }

  console.log(`Release not found for tag ${tagName} (HTTP ${getRes.statusCode}). Creating release...`);
  const releaseBody = {
    tag_name: tagName,
    target_commitish: 'main',
    name: 'ProScreen v1.0.0 — Production Release',
    body: `## ProScreen v1.0.0 — Official Production Release

Professional screen annotation, recording, and presentation studio for Windows and modern web browsers.

### Official Windows Desktop Releases
- **Windows Installer:** \`ProScreen-Setup-1.0.0.exe\` (132.7 MB)
  - SHA-256: \`D7DB64EEF56D0313E4E6E5CF6352F6CD6E315628366B3A718963A49AD80A388D\`
- **Windows Portable:** \`ProScreen-Portable-1.0.0.exe\` (118.4 MB)
  - SHA-256: \`A933048460EBCB7D5C76C421D170F8F0A914EB7B6B320D88665A6056EE9B58D2\`

### Chrome Extension Package (Manifest V3)
- **Universal Extension ZIP:** \`ProScreen-Chrome-Extension-1.0.0.zip\` (779.9 KB)
  - SHA-256: \`40B58190175316611860DAC801D91E12DA3E4821E2637313C49B520F647E6D7A\`

### Official Website
[https://sonuk597733-cyber.github.io/proscreen/](https://sonuk597733-cyber.github.io/proscreen/)
`,
    draft: false,
    prerelease: false,
  };

  const postOpt = {
    hostname: 'api.github.com',
    path: `/repos/${repoOwner}/${repoName}/releases`,
    method: 'POST',
    headers: {
      'User-Agent': 'ProScreen-Release-Publisher',
      Accept: 'application/vnd.github+json',
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  };

  const postRes = await httpsRequest(postOpt, releaseBody);
  if (postRes.statusCode >= 200 && postRes.statusCode < 300) {
    const release = JSON.parse(postRes.body);
    console.log(`Created release successfully: ${release.name} (id: ${release.id})`);
    return release;
  } else {
    throw new Error(`Failed to create release: HTTP ${postRes.statusCode} - ${postRes.body}`);
  }
}

function uploadAsset(releaseId, filePath, fileName, contentType) {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(filePath);
    console.log(`Uploading ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);

    const uploadUrl = `https://uploads.github.com/repos/${repoOwner}/${repoName}/releases/${releaseId}/assets?name=${encodeURIComponent(fileName)}`;
    const parsedUrl = new URL(uploadUrl);

    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'User-Agent': 'ProScreen-Release-Publisher',
          Accept: 'application/vnd.github+json',
          Authorization: authHeader,
          'Content-Type': contentType,
          'Content-Length': stats.size,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✔ Successfully uploaded ${fileName}!`);
            resolve(JSON.parse(body));
          } else {
            console.error(`Failed to upload ${fileName}: HTTP ${res.statusCode} ${body}`);
            reject(new Error(`Upload failed for ${fileName}: HTTP ${res.statusCode}`));
          }
        });
      }
    );

    req.on('error', reject);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(req);
  });
}

async function run() {
  try {
    const release = await getOrCreateRelease();

    // Check existing assets on release
    const existingAssets = release.assets || [];
    const existingNames = new Set(existingAssets.map((a) => a.name));
    console.log(`Current assets in release:`, Array.from(existingNames));

    const filesToUpload = [
      {
        fileName: 'ProScreen-Setup-1.0.0.exe',
        filePath: path.resolve('release', 'ProScreen-Setup-1.0.0.exe'),
        contentType: 'application/octet-stream',
      },
      {
        fileName: 'ProScreen-Portable-1.0.0.exe',
        filePath: path.resolve('release', 'ProScreen-Portable-1.0.0.exe'),
        contentType: 'application/octet-stream',
      },
      {
        fileName: 'ProScreen-Chrome-Extension-1.0.0.zip',
        filePath: path.resolve('release', 'ProScreen-Chrome-Extension-1.0.0.zip'),
        contentType: 'application/zip',
      },
    ];

    for (const item of filesToUpload) {
      if (!fs.existsSync(item.filePath)) {
        throw new Error(`File ${item.filePath} does not exist!`);
      }
      if (existingNames.has(item.fileName)) {
        console.log(`Asset ${item.fileName} already exists in release. Skipping upload.`);
      } else {
        await uploadAsset(release.id, item.filePath, item.fileName, item.contentType);
      }
    }

    console.log('\n✔ All release assets uploaded successfully to GitHub Release v1.0.0!');
  } catch (err) {
    console.error('\nRelease publication error:', err.message);
    process.exit(1);
  }
}

run();
