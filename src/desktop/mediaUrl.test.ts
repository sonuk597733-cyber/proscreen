import test from 'node:test';
import assert from 'node:assert/strict';
import { fromProScreenMediaUrl, toProScreenMediaUrl } from './mediaUrl';

test('toProScreenMediaUrl and fromProScreenMediaUrl round-trip Windows paths with special chars', () => {
  const winPath = 'C:\\Users\\John Doe\\Videos\\Clip #1 (100%)?.webm';
  const url = toProScreenMediaUrl(winPath);
  assert.equal(
    url,
    'proscreen-media://local/C:/Users/John%20Doe/Videos/Clip%20%231%20(100%25)%3F.webm'
  );
  const decoded = fromProScreenMediaUrl(url, 'win32');
  assert.equal(decoded, winPath);
});

test('toProScreenMediaUrl and fromProScreenMediaUrl round-trip POSIX paths', () => {
  const posixPath = '/home/alex/Videos/demo #2.mp4';
  const url = toProScreenMediaUrl(posixPath);
  assert.equal(url, 'proscreen-media://local/home/alex/Videos/demo%20%232.mp4');
  const decoded = fromProScreenMediaUrl(url, 'linux');
  assert.equal(decoded, posixPath);
});

test('fromProScreenMediaUrl rejects non-proscreen protocols and malformed URLs', () => {
  assert.equal(fromProScreenMediaUrl('https://example.com/video.webm', 'win32'), null);
  assert.equal(fromProScreenMediaUrl('file:///C:/test.webm', 'win32'), null);
  assert.equal(fromProScreenMediaUrl('not a url', 'win32'), null);
});
