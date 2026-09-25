import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';
import { TOOL_SVG_MAP } from './src/components/toolSvgMap.js';

test('=== FIXMYFILE: HEADER MEGA-MENU TOOL SVG ICONS TEST SUITE ===', async (t) => {
  const headerPath = path.resolve('src/components/Header.jsx');
  const cssPath = path.resolve('src/App.css');
  const headerCode = fs.readFileSync(headerPath, 'utf8');
  const cssCode = fs.readFileSync(cssPath, 'utf8');

  await t.test('1. Header imports shared ToolIcon component without duplicate mapping', () => {
    assert(
      headerCode.includes("import ToolIcon from './ToolIcon';"),
      'Header.jsx must import shared ToolIcon component'
    );
    // Ensure no new mapping was created in Header.jsx
    assert(
      !headerCode.includes('new URL('),
      'Header.jsx must not recreate SVG URL mappings'
    );
  });

  await t.test('2. Exactly 49 active tools have SVG icon links in Header mega-menus', () => {
    const activeTools = ALL_TOOLS.filter((t) => t.status === 'Ready');
    assert.strictEqual(activeTools.length, 49, 'Expected 49 active tools');

    for (const tool of activeTools) {
      // Must link to tool path
      assert(
        headerCode.includes(`to="${tool.path}"`),
        `Header.jsx must have link to ${tool.path}`
      );

      // Must include ToolIcon with tool.id
      assert(
        headerCode.includes(`icon="${tool.id}"`),
        `Header.jsx must render ToolIcon with icon="${tool.id}"`
      );

      // Must resolve in authoritative TOOL_SVG_MAP
      assert(
        TOOL_SVG_MAP[tool.id],
        `Tool id "${tool.id}" must exist in TOOL_SVG_MAP`
      );
    }
  });

  await t.test('3. ToolIcon size is 18px across all dropdown tool links', () => {
    const iconMatches = Array.from(headerCode.matchAll(/<ToolIcon\s+icon="([^"]+)"\s+size=\{([0-9]+)\}/g));
    assert.strictEqual(iconMatches.length, 49, `Expected exactly 49 ToolIcon usages in Header, got ${iconMatches.length}`);

    for (const match of iconMatches) {
      const toolId = match[1];
      const size = match[2];
      assert.strictEqual(size, '18', `ToolIcon for "${toolId}" must have size={18}`);
    }
  });

  await t.test('4. CSS architecture: flex layout, 8px gap, 18px dimensions, and object-fit contain', () => {
    // Mega menu link layout
    assert(cssCode.includes('.mega-menu-link'), 'App.css must style .mega-menu-link');
    assert(cssCode.includes('gap: 8px'), 'App.css must specify gap: 8px between icon and label');
    
    // Mega menu tool icon styling
    assert(cssCode.includes('.mega-menu-tool-icon'), 'App.css must style .mega-menu-tool-icon');
    assert(cssCode.includes('width: 18px'), 'App.css must specify width: 18px for .mega-menu-tool-icon');
    assert(cssCode.includes('height: 18px'), 'App.css must specify height: 18px for .mega-menu-tool-icon');
    assert(cssCode.includes('object-fit: contain'), 'App.css must specify object-fit: contain for .mega-menu-tool-icon');
  });

  await t.test('5. Categorical distribution across all 4 mega-menu dropdowns', () => {
    // PDF Tools: 18
    const pdfBlock = headerCode.split('id="nav-dropdown-menu-pdf"')[1]?.split('id="nav-dropdown-menu-image"')[0] || '';
    const pdfIcons = Array.from(pdfBlock.matchAll(/icon="([^"]+)"/g));
    assert.strictEqual(pdfIcons.length, 18, `PDF Tools must contain 18 tool icons, found ${pdfIcons.length}`);

    // Image Tools: 20
    const imageBlock = headerCode.split('id="nav-dropdown-menu-image"')[1]?.split('id="nav-dropdown-menu-media"')[0] || '';
    const imageIcons = Array.from(imageBlock.matchAll(/icon="([^"]+)"/g));
    assert.strictEqual(imageIcons.length, 20, `Image Tools must contain 20 tool icons, found ${imageIcons.length}`);

    // Media Tools: 4
    const mediaBlock = headerCode.split('id="nav-dropdown-menu-media"')[1]?.split('id="nav-dropdown-menu-generators"')[0] || '';
    const mediaIcons = Array.from(mediaBlock.matchAll(/icon="([^"]+)"/g));
    assert.strictEqual(mediaIcons.length, 4, `Media Tools must contain 4 tool icons, found ${mediaIcons.length}`);

    // Generators: 7
    const genBlock = headerCode.split('id="nav-dropdown-menu-generators"')[1]?.split('</nav>')[0] || '';
    const genIcons = Array.from(genBlock.matchAll(/icon="([^"]+)"/g));
    assert.strictEqual(genIcons.length, 7, `Generators must contain 7 tool icons, found ${genIcons.length}`);
  });
});
