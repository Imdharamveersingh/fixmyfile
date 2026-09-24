import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('=== FIXMYFILE: LOGO 2 BRANDING REPLACEMENT TEST SUITE ===', async (t) => {
  const headerJsx = fs.readFileSync('src/components/Header.jsx', 'utf8');
  const footerJsx = fs.readFileSync('src/components/Footer.jsx', 'utf8');
  const logoJsx = fs.readFileSync('src/components/Logo.jsx', 'utf8');
  const appCss = fs.readFileSync('src/App.css', 'utf8');

  // 1. Asset existence and import in Header and Footer
  await t.test('1. logo 2 asset exists and is imported in Header and Footer', () => {
    assert.ok(fs.existsSync('src/assets/logo 2.png'), 'src/assets/logo 2.png must exist');
    assert.match(headerJsx, /import\s+logo2\s+from\s+['"]\.\.\/assets\/logo 2\.png['"]/, 'Header imports logo 2');
    assert.match(footerJsx, /import\s+logo2\s+from\s+['"]\.\.\/assets\/logo 2\.png['"]/, 'Footer imports logo 2');
    assert.match(logoJsx, /import\s+logo2\s+from\s+['"]\.\.\/assets\/logo 2\.png['"]/, 'Logo.jsx imports logo 2');
  });

  // 2. Removal of separately rendered visible FixMyFile text
  await t.test('2. No separate visible FixMyFile text rendered in Header or Footer', () => {
    assert.ok(!headerJsx.includes('>FixMyFile<'), 'Header must not render separate visible FixMyFile text element');
    assert.ok(!footerJsx.includes('>FixMyFile<'), 'Footer must not render separate visible FixMyFile text element');
    assert.ok(!logoJsx.includes('>FixMyFile<'), 'Logo.jsx must not render separate visible FixMyFile text element');

    assert.ok(!headerJsx.includes('className="brand-name"'), 'Header must not render brand-name text element');
    assert.ok(!footerJsx.includes('className="brand-title"'), 'Footer must not render brand-title text element');
  });

  // 3. Proper alt attribute for accessibility
  await t.test('3. Accessible alt="FixMyFile" on logo images', () => {
    assert.match(headerJsx, /alt="FixMyFile"/, 'Header logo has alt="FixMyFile"');
    assert.match(footerJsx, /alt="FixMyFile"/, 'Footer logo has alt="FixMyFile"');
    assert.match(logoJsx, /alt="FixMyFile"/, 'Logo.jsx has alt="FixMyFile"');
  });

  // 4. Logo links to homepage
  await t.test('4. Logo links to "/" in Header and Footer', () => {
    assert.match(headerJsx, /<Link\s+to="\/"\s+className="brand-logo"/, 'Header logo links to "/"');
    assert.match(footerJsx, /<Link\s+to="\/"\s+className="footer-brand"/, 'Footer logo links to "/"');
  });

  // 5. CSS Responsive Sizing Rules
  await t.test('5. CSS responsive sizing rules for logo 2 in Header and Footer', () => {
    assert.match(appCss, /\.brand-logo-img\s*\{[^}]*height:\s*38px;/, 'Desktop header logo height is 38px');
    assert.match(appCss, /\.brand-logo-img\s*\{[^}]*object-fit:\s*contain;/, 'Header logo uses object-fit: contain');
    assert.match(appCss, /\.footer-logo-img\s*\{[^}]*height:\s*44px;/, 'Footer logo height is 44px');
    assert.match(appCss, /\.footer-logo-img\s*\{[^}]*object-fit:\s*contain;/, 'Footer logo uses object-fit: contain');

    // Mobile overrides
    assert.match(appCss, /@media\s*\(max-width:\s*640px\)\s*\{[^}]*\.brand-logo-img\s*\{[^}]*height:\s*30px;/, 'Mobile header logo height scaled to 30px');
    assert.match(appCss, /@media\s*\(max-width:\s*640px\)\s*\{[^}]*\.footer-logo-img\s*\{[^}]*height:\s*36px;/, 'Mobile footer logo height scaled to 36px');
  });
});
