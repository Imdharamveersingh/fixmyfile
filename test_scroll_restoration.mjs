import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('=== Route Navigation Scroll Restoration Suite ===', async (t) => {
  const scrollToTopPath = path.resolve('src/components/ScrollToTop.jsx');
  const appPath = path.resolve('src/App.jsx');

  await t.test('1. ScrollToTop component file exists', () => {
    assert.ok(fs.existsSync(scrollToTopPath), 'src/components/ScrollToTop.jsx must exist');
  });

  await t.test('2. ScrollToTop imports useLocation from react-router-dom', () => {
    const content = fs.readFileSync(scrollToTopPath, 'utf8');
    assert.match(content, /import\s*\{[^}]*useLocation[^}]*\}\s*from\s*['"]react-router-dom['"]/);
  });

  await t.test('3. ScrollToTop resets scroll position to top: 0 with instant behavior', () => {
    const content = fs.readFileSync(scrollToTopPath, 'utf8');
    assert.match(content, /top:\s*0/);
    assert.match(content, /left:\s*0/);
    assert.match(content, /behavior:\s*['"]instant['"]/);
    assert.match(content, /document\.documentElement\.scrollTop\s*=\s*0/);
    assert.match(content, /document\.body\.scrollTop\s*=\s*0/);
  });

  await t.test('4. ScrollToTop watches pathname and hash', () => {
    const content = fs.readFileSync(scrollToTopPath, 'utf8');
    assert.match(content, /const\s*\{\s*pathname,\s*hash\s*\}\s*=\s*useLocation\(\)/);
    assert.match(content, /\[pathname,\s*hash\]/);
  });

  await t.test('5. App.jsx imports and mounts ScrollToTop inside BrowserRouter', () => {
    const appContent = fs.readFileSync(appPath, 'utf8');
    assert.match(appContent, /import\s+ScrollToTop\s+from\s+['"]\.\/components\/ScrollToTop['"]/);
    assert.match(appContent, /<BrowserRouter>[\s\S]*?<ScrollToTop\s*\/>[\s\S]*?<Routes>/);
  });

  await t.test('6. ScrollToTop preserves anchor scrolling when hash is present', () => {
    const content = fs.readFileSync(scrollToTopPath, 'utf8');
    assert.match(content, /if\s*\(\s*hash\s*\)/);
    assert.match(content, /scrollIntoView/);
  });
});
