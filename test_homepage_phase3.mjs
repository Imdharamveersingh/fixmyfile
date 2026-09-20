import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

import {
  ALL_TOOLS,
  PHASE_1_TOOLS,
  PHASE_2_TOOLS,
  PHASE_3_TOOLS,
  getToolByPath,
  getToolById
} from './src/tools/toolsRegistry.js';

test('=== Homepage Phase 3 Integration Test Suite ===', async (t) => {
  const homePagePath = path.resolve('src/pages/HomePage.jsx');
  const homePageContent = fs.readFileSync(homePagePath, 'utf8');

  await t.test('1. Registry tool counts and phases', () => {
    assert.strictEqual(PHASE_1_TOOLS.length, 6, 'Phase 1 should have exactly 6 tools');
    assert.strictEqual(PHASE_2_TOOLS.length, 6, 'Phase 2 should have exactly 6 tools');
    assert.strictEqual(PHASE_3_TOOLS.length, 1, 'Phase 3 should currently have 1 tool (QR Code Generator)');
    assert.strictEqual(ALL_TOOLS.length, 13, 'Total active tools in registry must equal 13');
  });

  await t.test('2. QR Code Generator registry metadata', () => {
    const qrTool = getToolByPath('/qr-code-generator');
    assert.ok(qrTool, 'QR Code Generator tool must be retrievable by path /qr-code-generator');
    assert.strictEqual(qrTool.id, 'qr-code-generator');
    assert.strictEqual(qrTool.name, 'QR Code Generator');
    assert.strictEqual(qrTool.category, 'Generators');
    assert.strictEqual(qrTool.phase, 'Phase 3');
    assert.strictEqual(qrTool.status, 'Ready');

    const byId = getToolById('qr-code-generator');
    assert.deepStrictEqual(byId, qrTool, 'getToolById must match getToolByPath');
  });

  await t.test('3. Future tools guard: Barcode Generator is NOT in registry', () => {
    const barcodeTool = getToolByPath('/barcode-generator');
    assert.strictEqual(barcodeTool, undefined, 'Barcode Generator should not be in toolsRegistry yet');
    const barcodeById = getToolById('barcode-generator');
    assert.strictEqual(barcodeById, undefined, 'Barcode Generator should not be retrievable by ID');
  });

  await t.test('4. HomePage imports PHASE_3_TOOLS', () => {
    assert.match(
      homePageContent,
      /import\s+.*PHASE_3_TOOLS.*from\s+['"]\.\.\/tools\/toolsRegistry['"]/,
      'HomePage.jsx must import PHASE_3_TOOLS from toolsRegistry'
    );
  });

  await t.test('5. HomePage Hero badge specifies Phase 3 Active', () => {
    assert.match(
      homePageContent,
      /<div className="hero-badge">\s*Phase 3 Active\s*<\/div>/,
      'Hero badge must display "Phase 3 Active"'
    );
  });

  await t.test('6. HomePage Hero description reflects Phase 3 progression', () => {
    assert.match(
      homePageContent,
      /Phase 1 PDF tools and Phase 2 image tools are complete, with Phase 3 generators now rolling out/,
      'Hero description must mention Phase 1 and Phase 2 complete, and Phase 3 generators rolling out'
    );
  });

  await t.test('7. HomePage Stats row derives active tool count from ALL_TOOLS.length', () => {
    assert.match(
      homePageContent,
      /<span className="stat-number">\s*\{\s*ALL_TOOLS\.length\s*\}\s*<\/span>\s*<span className="stat-label">Active Tools<\/span>/,
      'Active Tools count must be dynamic via ALL_TOOLS.length'
    );
    assert.match(homePageContent, />36<\/span>\s*<span className="stat-label">Total Strategy Tools<\/span>/);
    assert.match(homePageContent, />100%<\/span>\s*<span className="stat-label">Client-First Design<\/span>/);
  });

  await t.test('8. HomePage Phase 3 Section exists with proper title and badge', () => {
    assert.match(
      homePageContent,
      /<h2 className="section-title">\s*Phase 3: Calculators &amp; Generators|Phase 3: Calculators & Generators\s*<\/h2>/,
      'Section title must be "Phase 3: Calculators & Generators"'
    );
    assert.match(
      homePageContent,
      /<span className="phase-indicator">\s*Phase 3 Active\s*<\/span>/,
      'Phase 3 indicator badge must state "Phase 3 Active"'
    );
    assert.match(
      homePageContent,
      /PHASE_3_TOOLS\.map\(/,
      'HomePage must map over PHASE_3_TOOLS'
    );
  });

  await t.test('9. HomePage Phase 2 and Phase 1 sections are preserved', () => {
    assert.match(
      homePageContent,
      /<h2 className="section-title">\s*Phase 2: Image Tools\s*<\/h2>/,
      'Phase 2 section title must be preserved'
    );
    assert.match(
      homePageContent,
      /PHASE_2_TOOLS\.map\(/,
      'HomePage must map over PHASE_2_TOOLS'
    );
    assert.match(
      homePageContent,
      /<h2 className="section-title">\s*Phase 1: PDF Tools\s*<\/h2>/,
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
    assert.match(headerContent, /<span className="brand-badge">\s*Phase 3\s*<\/span>/);
    assert.match(headerContent, /<Link to="\/qr-code-generator">QR Code Generator<\/Link>/);
    assert.doesNotMatch(headerContent, /barcode-generator/i, 'Header must not show barcode generator');

    const footerPath = path.resolve('src/components/Footer.jsx');
    const footerContent = fs.readFileSync(footerPath, 'utf8');
    assert.match(footerContent, /Phase 3: Generators/);
    assert.match(footerContent, /<Link to="\/qr-code-generator">QR Code Generator<\/Link>/);
    assert.match(footerContent, /Phase 3 Active/);
    assert.doesNotMatch(footerContent, /barcode-generator/i, 'Footer must not show barcode generator');
  });

  await t.test('11. No duplicate QR code tool or broken routes in App.jsx', () => {
    const appPath = path.resolve('src/App.jsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    const qrRouteMatches = appContent.match(/path="qr-code-generator"/g) || [];
    assert.strictEqual(qrRouteMatches.length, 1, 'There must be exactly one /qr-code-generator route in App.jsx');
  });
});
