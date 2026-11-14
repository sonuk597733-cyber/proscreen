import https from 'https';

console.log('=== VERIFYING REAL DOWNLOAD PAYLOADS AND BINARY HEADERS ===\n');

function testAsset(name, url, expectedMagicAscii) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 && res.headers.location) {
        https.get(res.headers.location, (dlRes) => {
          const chunks = [];
          let total = 0;
          dlRes.on('data', (c) => {
            total += c.length;
            if (chunks.length < 5) chunks.push(c);
            if (total > 30000) dlRes.destroy();
          });
          dlRes.on('close', () => {
            const buf = Buffer.concat(chunks);
            const ascii = buf.subarray(0, 2).toString('ascii');
            const hex = buf.subarray(0, 4).toString('hex').toUpperCase();
            const pass = ascii === expectedMagicAscii && dlRes.statusCode === 200;
            console.log(`[${pass ? '✔ PASS' : '❌ FAIL'}] ${name}:`);
            console.log(`  - Direct Download URL: ${url}`);
            console.log(`  - HTTP Status: ${dlRes.statusCode}`);
            console.log(`  - Content-Length: ${dlRes.headers['content-length']} bytes`);
            console.log(`  - Magic bytes: 0x${hex} (ASCII: '${ascii}')`);
            resolve(pass);
          });
        });
      } else {
        console.error(`❌ Expected HTTP 302 redirect for ${name}, got ${res.statusCode}`);
        resolve(false);
      }
    });
  });
}

async function run() {
  await testAsset(
    'Windows Setup Installer (.exe)',
    'https://github.com/sonuk597733-cyber/proscreen/releases/download/v1.0.0/ProScreen-Setup-1.0.0.exe',
    'MZ'
  );

  await testAsset(
    'Windows Portable Executable (.exe)',
    'https://github.com/sonuk597733-cyber/proscreen/releases/download/v1.0.0/ProScreen-Portable-1.0.0.exe',
    'MZ'
  );

  await testAsset(
    'Chrome Extension Distributable (.zip)',
    'https://github.com/sonuk597733-cyber/proscreen/releases/download/v1.0.0/ProScreen-Chrome-Extension-1.0.0.zip',
    'PK'
  );

  console.log('\n=== REAL ASSET BINARY VERIFICATION COMPLETE ===');
}

run();
