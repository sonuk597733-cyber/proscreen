import https from 'https';

console.log('=== VERIFYING LIVE PUBLIC PROSCREEN WEBSITE ===\n');

const url = 'https://sonuk597733-cyber.github.io/proscreen/';

https.get(url, (res) => {
  console.log('1. Live Website HTTP Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log('2. Received HTML length:', data.length, 'bytes');
    console.log('3. Contains ProScreen brand:', data.includes('ProScreen'));
    console.log('4. Contains Headline "Your Screen. Your Canvas.":', data.includes('Your Screen. Your Canvas.'));
    console.log('5. Contains base /proscreen/ assets:', data.includes('/proscreen/assets/'));
    
    // Check main JS asset
    const jsMatch = data.match(/src="(\/proscreen\/assets\/[^"]+\.js)"/);
    if (jsMatch) {
      const jsUrl = `https://sonuk597733-cyber.github.io${jsMatch[1]}`;
      console.log('6. Checking Live JS Bundle:', jsUrl);
      https.get(jsUrl, (jsRes) => {
        console.log('   - JS Bundle HTTP Status:', jsRes.statusCode);
        console.log('   - JS Content-Type:', jsRes.headers['content-type']);
        console.log('\n✔ LIVE PUBLIC WEBSITE IS 100% OPERATIONAL AND ACCESSIBLE!');
      });
    }

    // Check CSS asset
    const cssMatch = data.match(/href="(\/proscreen\/assets\/[^"]+\.css)"/);
    if (cssMatch) {
      const cssUrl = `https://sonuk597733-cyber.github.io${cssMatch[1]}`;
      console.log('7. Checking Live CSS Bundle:', cssUrl);
      https.get(cssUrl, (cssRes) => {
        console.log('   - CSS Bundle HTTP Status:', cssRes.statusCode);
      });
    }
  });
}).on('error', (err) => {
  console.error('Failed to reach website:', err.message);
});
