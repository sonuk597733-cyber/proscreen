import https from 'https';

console.log('=== PROSCREEN PRODUCTION LIVE VERIFICATION SUITE ===\n');

function checkUrl(url, expectedStatuses = [200, 302]) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'ProScreen-QA-Verification/1.0',
        },
      },
      (res) => {
        let size = 0;
        res.on('data', (chunk) => {
          size += chunk.length;
          // Don't download entire huge files if redirected
          if (res.statusCode === 302 || size > 65536) {
            req.destroy();
          }
        });
        res.on('close', () => {
          const pass = expectedStatuses.includes(res.statusCode);
          resolve({
            url,
            statusCode: res.statusCode,
            location: res.headers.location || null,
            contentLength: res.headers['content-length'] || null,
            contentType: res.headers['content-type'] || null,
            pass,
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({
        url,
        statusCode: 0,
        error: err.message,
        pass: false,
      });
    });
    req.end();
  });
}

async function run() {
  const websiteBase = 'https://sonuk597733-cyber.github.io/proscreen';
  
  console.log('1. Checking Live Website and Deep Routes:');
  const routes = [
    '/',
    '/?p=/features',
    '/?p=/download',
    '/?p=/extension',
    '/?p=/shortcuts',
    '/?p=/privacy',
    '/?p=/terms',
    '/?p=/changelog',
    '/?p=/docs',
    '/?p=/support',
    '/?p=/security',
    '/404.html',
  ];

  for (const r of routes) {
    const result = await checkUrl(`${websiteBase}${r}`, [200]);
    const statusMark = result.pass ? '✔ PASS' : '❌ FAIL';
    console.log(`  [${statusMark}] ${result.statusCode} - ${websiteBase}${r}`);
  }

  console.log('\n2. Checking GitHub Release v1.0.0 Assets:');
  const releaseAssets = [
    {
      name: 'ProScreen-Setup-1.0.0.exe',
      url: 'https://github.com/sonuk597733-cyber/proscreen/releases/download/v1.0.0/ProScreen-Setup-1.0.0.exe',
    },
    {
      name: 'ProScreen-Portable-1.0.0.exe',
      url: 'https://github.com/sonuk597733-cyber/proscreen/releases/download/v1.0.0/ProScreen-Portable-1.0.0.exe',
    },
    {
      name: 'ProScreen-Chrome-Extension-1.0.0.zip',
      url: 'https://github.com/sonuk597733-cyber/proscreen/releases/download/v1.0.0/ProScreen-Chrome-Extension-1.0.0.zip',
    },
  ];

  for (const asset of releaseAssets) {
    const result = await checkUrl(asset.url, [200, 302]);
    const statusMark = result.pass ? '✔ PASS' : '❌ FAIL';
    console.log(`  [${statusMark}] HTTP ${result.statusCode} - ${asset.name}`);
    if (result.location) {
      console.log(`          Redirect target: ${result.location.substring(0, 80)}...`);
    }
  }

  console.log('\n=== VERIFICATION RUN COMPLETE ===\n');
}

run();
