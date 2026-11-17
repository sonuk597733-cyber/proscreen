import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import {
  pickFirstExistingPath,
  resolveBundledIconCandidates,
  resolveDesktopHtmlTarget,
} from './electronPaths';

test('resolveDesktopHtmlTarget returns dev server URL when VITE_DEV_SERVER_URL is set', () => {
  const target = resolveDesktopHtmlTarget('/app/dist-electron', 'toolbar', 'http://localhost:3000/');
  assert.deepEqual(target, {
    type: 'url',
    url: 'http://localhost:3000/desktop-toolbar.html',
  });
});

test('resolveDesktopHtmlTarget resolves packaged dist/ HTML file in production mode', () => {
  const target = resolveDesktopHtmlTarget('/resources/app.asar/dist-electron', 'overlay');
  assert.equal(target.type, 'file');
  if (target.type === 'file') {
    assert.equal(
      target.filePath,
      path.join('/resources/app.asar/dist-electron', '../dist', 'desktop-overlay.html')
    );
  }
});

test('resolveBundledIconCandidates prefers dist/icons then public/icons', () => {
  const candidates = resolveBundledIconCandidates('/app/dist-electron', ['icon32.png', 'icon16.png']);
  assert.deepEqual(candidates, [
    path.join('/app/dist-electron', '../dist/icons', 'icon32.png'),
    path.join('/app/dist-electron', '../dist/icons', 'icon16.png'),
    path.join('/app/dist-electron', '../public/icons', 'icon32.png'),
    path.join('/app/dist-electron', '../public/icons', 'icon16.png'),
  ]);
});

test('pickFirstExistingPath selects the first matching icon candidate safely', () => {
  const candidates = ['/missing/a.ico', '/found/b.png', '/also/c.png'];
  const picked = pickFirstExistingPath(candidates, (p) => p === '/found/b.png');
  assert.equal(picked, '/found/b.png');
  assert.equal(pickFirstExistingPath(candidates, () => false), null);
});
