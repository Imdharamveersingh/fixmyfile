import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

import {
  ALL_TOOLS,
  PHASE_1_TOOLS,
  PHASE_2_TOOLS,
  PHASE_3_TOOLS,
  TOTAL_STRATEGY_TOOLS,
  getToolById
} from './src/tools/toolsRegistry.js';

test('=== Homepage Phase 3 Integration Test Suite ===', async (t) => {
  const homePagePath = path.resolve('src/pages/HomePage.jsx');
  const homePageContent = fs.readFileSync(homePagePath, 'utf8');

  await t.test('1. Registry tool counts and phases (Phase 3 Complete: 7 tools, 49 active, 55 planned strategy)', () => {
    assert.strictEqual(PHASE_1_TOOLS.length, 6, 'Phase 1 should have exactly 6 tools');
    assert.strictEqual(PHASE_2_TOOLS.length, 6, 'Phase 2 should have exactly 6 tools');
    assert.strictEqual(PHASE_3_TOOLS.length, 7, 'Phase 3 should have all 7 tools completed');
    assert.strictEqual(ALL_TOOLS.length, 49, 'Total active tools in registry must equal 49');
    assert.strictEqual(TOTAL_STRATEGY_TOOLS, 55, 'Total planned strategy tools must equal 55');
  });

  await t.test('2. All 7 Phase 3 tools registry metadata', () => {
    const expectedP3 = [
      'qr-code-generator',
      'barcode-generator',
      'currency-converter',
      'percentage-calculator',
      'password-generator',
      'word-counter',
      'emi-calculator'
    ];
    for (const toolId of expectedP3) {
      const tool = getToolById(toolId);
      assert.ok(tool, `Tool ${toolId} must exist in registry`);
      assert.strictEqual(tool.phase, 'Phase 3');
      assert.strictEqual(tool.status, 'Ready');
    }
  });

  await t.test('3. Phase integrity: Phase 3 tools belong to Phase 3 and have valid paths', () => {
    for (const tool of PHASE_3_TOOLS) {
      assert.strictEqual(tool.phase, 'Phase 3');
      assert.ok(tool.path.startsWith('/'));
      assert.ok(ALL_TOOLS.some((t) => t.id === tool.id));
    }
  });

  await t.test('4. HomePage imports PHASE_3_TOOLS', () => {
    assert.ok(
      homePageContent.includes('PHASE_3_TOOLS'),
      'HomePage.jsx must import PHASE_3_TOOLS from toolsRegistry'
    );
  });

  await t.test('5. HomePage Hero eyebrow badge is present', () => {
    assert.match(
      homePageContent,
      /<span className="hero-eyebrow">\s*FAST • FREE • PRIVATE\s*<\/span>/,
      'Hero eyebrow must display "FAST • FREE • PRIVATE"'
    );
  });

  await t.test('6. HomePage Hero description reflects complete utility suite', () => {
    assert.match(
      homePageContent,
      /A clean, focused collection of 49 high-demand digital utility tools/,
      'Hero description must mention 49 high-demand digital utility tools'
    );
  });

  await t.test('7. HomePage Stats row derives active tool count from ALL_TOOLS.length and strategy count from TOTAL_STRATEGY_TOOLS', () => {
    assert.match(
      homePageContent,
      /<span className="stat-number">\s*\{\s*ALL_TOOLS\.length\s*\}\s*<\/span>\s*<span className="stat-label">Active Tools<\/span>/,
      'Active Tools count must be dynamic via ALL_TOOLS.length'
    );
    assert.match(
      homePageContent,
      /<span className="stat-number">\s*\{\s*TOTAL_STRATEGY_TOOLS\s*\}\s*<\/span>\s*<span className="stat-label">Total Strategy Tools<\/span>/,
      'Total Strategy Tools count must be dynamic via TOTAL_STRATEGY_TOOLS'
    );
    assert.match(homePageContent, />100%<\/span>\s*<span className="stat-label">Client-First Design<\/span>/);
  });

  await t.test('8. HomePage Calculators & Generators Section exists with proper title', () => {
    assert.match(
      homePageContent,
      /<h2 className="section-title">\s*Calculators &amp; Generators|Calculators & Generators\s*<\/h2>/,
      'Section title must be "Calculators & Generators"'
    );
    assert.match(
      homePageContent,
      /PHASE_3_TOOLS\.map\(/,
      'HomePage must map over PHASE_3_TOOLS'
    );
  });

  await t.test('9. HomePage Image Tools and PDF Tools sections are preserved', () => {
    assert.match(
      homePageContent,
      /<h2 className="section-title">\s*Image Tools\s*<\/h2>/,
      'Phase 2 section title must be preserved'
    );
    assert.match(
      homePageContent,
      /PHASE_2_TOOLS\.map\(/,
      'HomePage must map over PHASE_2_TOOLS'
    );
    assert.match(
      homePageContent,
      /<h2 className="section-title">\s*PDF Tools\s*<\/h2>/,
      'Phase 1 section title must be preserved'
    );
    assert.match(
      homePageContent,
      /PHASE_1_TOOLS\.map\(/,
      'HomePage must map over PHASE_1_TOOLS'
    );
  });

  await t.test('10. Header and Footer navigation verification', () => {
    const headerPath = path.resolve('src/components/Header.jsx');
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    assert.match(headerContent, /FixMyFile/);
    assert.match(headerContent, /<Link[^>]*to="\/qr-code-generator"[^>]*>[\s\S]*?QR Code Generator[\s\S]*?<\/Link>/);
    assert.match(headerContent, /<Link[^>]*to="\/emi-calculator"[^>]*>[\s\S]*?EMI Calculator[\s\S]*?<\/Link>/);

    const footerPath = path.resolve('src/components/Footer.jsx');
    const footerContent = fs.readFileSync(footerPath, 'utf8');
    assert.match(footerContent, /Calculators & Generators/);
    assert.match(footerContent, /<Link to="\/qr-code-generator">Calculators & Generators<\/Link>/);
    assert.match(footerContent, /100% Private & Browser-Based/);
  });

  await t.test('11. All 19 routes registered uniquely in App.jsx', () => {
    const appPath = path.resolve('src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    for (const tool of ALL_TOOLS) {
      const cleanPath = tool.path.replace(/^\//, '');
      const pattern = new RegExp(`path="${cleanPath}"`, 'g');
      const matches = appContent.match(pattern) || [];
      assert.strictEqual(matches.length, 1, `Route ${cleanPath} must be registered exactly once in App.jsx`);
    }
  });
});
