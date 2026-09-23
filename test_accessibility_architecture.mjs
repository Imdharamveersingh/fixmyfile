/**
 * Automated Accessibility Architecture & Guarantees Test Suite
 * Validates Step 6 accessibility infrastructure without requiring external server.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('=== FixMyFile: Accessibility Architecture Test Suite ===', async (t) => {
  await t.test('1. Layout contains skip-to-content bypass link and main landmark', () => {
    const layout = fs.readFileSync('src/components/Layout.jsx', 'utf8');
    assert.match(layout, /<a\s+href="#main-content"\s+className="skip-to-content">/, 'Skip-to-content link exists in Layout.jsx');
    assert.match(layout, /<main\s+className="main-content"\s+id="main-content"\s+tabIndex="-1">/, 'Primary main landmark with ID and tabIndex exists');
  });

  await t.test('2. Single main landmark guaranteed across all 49 tools', () => {
    function getToolJsxFiles(dir) {
      let files = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(getToolJsxFiles(fullPath));
        } else if (entry.name === 'index.jsx') {
          files.push(fullPath);
        }
      }
      return files;
    }

    const toolFiles = getToolJsxFiles('src/tools');
    assert.strictEqual(toolFiles.length, 49, 'Expected 49 tool index.jsx files');

    const filesWithNestedMain = [];
    for (const file of toolFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (/<main[\s>]/.test(content)) {
        filesWithNestedMain.push(file);
      }
    }

    assert.deepStrictEqual(
      filesWithNestedMain,
      [],
      `No tool should contain a nested <main> tag. Found in: ${filesWithNestedMain.join(', ')}`
    );
  });

  await t.test('3. Header dropdowns expose correct ARIA relationships and focus recovery', () => {
    const header = fs.readFileSync('src/components/Header.jsx', 'utf8');
    const categories = ['pdf', 'image', 'media', 'generators'];

    for (const cat of categories) {
      assert.ok(
        header.includes(`id="nav-dropdown-btn-${cat}"`),
        `Dropdown button for ${cat} has explicit ID`
      );
      assert.ok(
        header.includes(`aria-controls="nav-dropdown-menu-${cat}"`),
        `Dropdown button for ${cat} has aria-controls`
      );
      assert.ok(
        header.includes(`id="nav-dropdown-menu-${cat}"`),
        `Dropdown menu for ${cat} has explicit ID`
      );
      assert.ok(
        header.includes(`aria-labelledby="nav-dropdown-btn-${cat}"`),
        `Dropdown menu for ${cat} has aria-labelledby`
      );
    }

    // Caret SVGs must have aria-hidden
    assert.match(header, /className="dropdown-caret"\s+aria-hidden="true"/, 'Dropdown caret SVGs are hidden from screen readers');

    // Escape key focus restoration
    assert.match(header, /btn\.focus\(\)/, 'Escape key handler restores focus to triggering button');
  });

  await t.test('4. Footer trust badge has aria-hidden SVG', () => {
    const footer = fs.readFileSync('src/components/Footer.jsx', 'utf8');
    assert.match(footer, /<svg\s+aria-hidden="true"/, 'Footer trust badge SVG is marked aria-hidden');
  });

  await t.test('5. Global CSS contains focus-visible, skip-link, and reduced-motion tokens', () => {
    const css = fs.readFileSync('src/index.css', 'utf8');
    assert.ok(css.includes(':focus-visible'), 'Global :focus-visible rules defined');
    assert.ok(css.includes('.skip-to-content'), '.skip-to-content styles defined');
    assert.ok(css.includes('#main-content:focus'), '#main-content:focus outline suppression defined');
    assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Prefers-reduced-motion query defined');
    assert.ok(css.includes('.sr-only'), '.sr-only utility class defined');
  });
});
