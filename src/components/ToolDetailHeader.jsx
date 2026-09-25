import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getToolById } from '../tools/toolsRegistry.js';
import ToolIcon from './ToolIcon.jsx';

const PDF_TOOL_IDS = new Set([
  'jpg-to-pdf', 'pdf-to-word', 'pdf-to-jpg', 'word-to-pdf', 'merge-pdf',
  'compress-pdf', 'split-pdf', 'pdf-to-excel', 'pdf-to-powerpoint', 'rotate-pdf',
  'protect-pdf', 'unlock-pdf', 'pdf-to-text', 'extract-pdf-pages', 'delete-pdf-pages',
  'reorder-pdf-pages', 'pdf-ocr', 'extract-text-from-pdf'
]);

const IMAGE_TOOL_IDS = new Set([
  'background-remover', 'image-compressor', 'image-resizer', 'image-converter',
  'jpg-to-png', 'png-to-jpg', 'heic-to-jpg', 'webp-to-jpg', 'jpg-to-webp',
  'webp-to-png', 'image-rotate-flip', 'image-watermark', 'image-to-pdf',
  'image-upscaler', 'image-to-base64', 'image-cropper', 'image-to-text',
  'jpg-to-text', 'png-to-text', 'screenshot-to-text'
]);

const MEDIA_TOOL_IDS = new Set([
  'mp4-to-mp3', 'video-compressor', 'video-to-gif', 'gif-maker'
]);

const GENERATOR_TOOL_IDS = new Set([
  'qr-code-generator', 'barcode-generator', 'currency-converter',
  'percentage-calculator', 'password-generator', 'word-counter', 'emi-calculator'
]);

function getToolCategory(toolId) {
  if (PDF_TOOL_IDS.has(toolId)) return 'pdf';
  if (IMAGE_TOOL_IDS.has(toolId)) return 'image';
  if (MEDIA_TOOL_IDS.has(toolId)) return 'media';
  if (GENERATOR_TOOL_IDS.has(toolId)) return 'generators';
  return 'generators';
}

function getToolCapabilityBadges(toolId) {
  if (PDF_TOOL_IDS.has(toolId)) {
    if (toolId === 'merge-pdf') return ['PDF', 'Multiple Files', '100% Private'];
    if (toolId === 'split-pdf') return ['PDF', 'Page Range Extract', '100% Private'];
    if (toolId === 'compress-pdf') return ['PDF', 'Smart Compression', '100% Private'];
    if (toolId === 'protect-pdf' || toolId === 'unlock-pdf') return ['PDF', 'Security & Password', '100% Private'];
    if (toolId === 'pdf-ocr' || toolId === 'extract-text-from-pdf') return ['PDF', 'OCR Text Extraction', '100% Private'];
    if (toolId === 'extract-pdf-pages' || toolId === 'delete-pdf-pages' || toolId === 'reorder-pdf-pages') return ['PDF', 'Visual Page Grid', '100% Private'];
    return ['PDF', 'Direct Conversion', '100% Private'];
  }
  if (IMAGE_TOOL_IDS.has(toolId)) {
    if (toolId === 'background-remover') return ['Image', 'AI Background Removal', '100% Private'];
    if (toolId === 'image-cropper') return ['Image', 'Aspect Ratio Presets', '100% Private'];
    if (toolId === 'image-upscaler') return ['Image', 'High-Res Upscaling', '100% Private'];
    if (toolId === 'image-compressor') return ['Image', 'Lossless Optimization', '100% Private'];
    if (toolId === 'image-resizer') return ['Image', 'Dimension Control', '100% Private'];
    if (toolId.includes('to-text')) return ['Image', 'Client-Side OCR', '100% Private'];
    return ['Image', 'Lossless Processing', '100% Private'];
  }
  if (MEDIA_TOOL_IDS.has(toolId)) {
    if (toolId === 'mp4-to-mp3') return ['Media', 'Audio Stream Extract', '100% Private'];
    if (toolId === 'video-compressor') return ['Media', 'WebAssembly Engine', '100% Private'];
    if (toolId === 'video-to-gif' || toolId === 'gif-maker') return ['Media', 'Animated GIF Export', '100% Private'];
    return ['Media', 'Client-Side Media', '100% Private'];
  }
  if (GENERATOR_TOOL_IDS.has(toolId)) {
    if (toolId === 'qr-code-generator') return ['Generator', 'Vector SVG & PNG', '100% Private'];
    if (toolId === 'barcode-generator') return ['Generator', 'Linear 1D Barcodes', '100% Private'];
    if (toolId === 'password-generator') return ['Security', 'Cryptographic Randomness', '100% Private'];
    if (toolId === 'currency-converter') return ['Calculator', 'Exchange Rates', '100% Private'];
    if (toolId === 'percentage-calculator') return ['Calculator', 'Instant Formulas', '100% Private'];
    if (toolId === 'emi-calculator') return ['Calculator', 'Amortization Plan', '100% Private'];
    if (toolId === 'word-counter') return ['Text', 'Real-Time Character Count', '100% Private'];
    return ['Utility', 'Instant Output', '100% Private'];
  }
  return ['Utility', 'Client-Side Only', '100% Private'];
}

/**
 * ToolDetailHeader Component
 * Provides a standardized, accessible header, breadcrumb, SVG icon,
 * and capability badges across all tool detail pages.
 *
 * @param {string} [toolId] - Unique tool identifier from toolsRegistry
 * @param {object} [tool] - Tool metadata object (alternative to toolId)
 * @param {string} [title] - Optional override for canonical H1 title
 * @param {string} [description] - Optional override for user-facing description
 * @param {string} [className] - Optional extra class name for wrapper
 */
export default function ToolDetailHeader({
  toolId,
  tool,
  title,
  description,
  className = ''
}) {
  const meta = tool || (toolId ? getToolById(toolId) : null);
  const headerRef = useRef(null);
  const category = meta ? getToolCategory(meta.id) : 'generators';

  useEffect(() => {
    if (headerRef.current?.parentElement) {
      headerRef.current.parentElement.setAttribute('data-category', category);
    }
  }, [category]);

  if (!meta) return null;

  const breadcrumbName = meta.name;
  const rawTitle = (title || meta.name).trim();
  const headingTitle = /\bfree\b/i.test(rawTitle) ? rawTitle : `${rawTitle} Free`;
  const desc = description || meta.description;
  const capabilityBadges = getToolCapabilityBadges(meta.id);

  return (
    <header
      ref={headerRef}
      className={`tool-detail-header category-${category} ${className}`.trim()}
      data-category={category}
    >
      {/* Semantic Breadcrumb Navigation */}
      <nav
        className="tool-detail-breadcrumb tool-breadcrumb-nav breadcrumb-nav tool-breadcrumbs breadcrumb"
        aria-label="Breadcrumb"
      >
        <ol className="tool-breadcrumb-list breadcrumb-list">
          <li className="tool-breadcrumb-item breadcrumb-item">
            <Link to="/" className="tool-breadcrumb-link breadcrumb-link">Home</Link>
          </li>
          <li
            className="tool-breadcrumb-separator breadcrumb-separator"
            aria-hidden="true"
          >
            /
          </li>
          <li
            className="tool-breadcrumb-item tool-breadcrumb-current breadcrumb-current"
            aria-current="page"
          >
            {breadcrumbName}
          </li>
        </ol>
      </nav>

      {/* Tool Header Area: Icon, H1, Description, Capability Badges */}
      <div className="tool-header-hero">
        <div className="tool-header-icon-wrap" aria-hidden="true">
          <ToolIcon icon={meta.id} size={42} className="tool-header-svg" />
        </div>
        <div className="tool-header-content">
          <h1 className="tool-detail-h1 tool-h1 tool-title tool-main-title">
            {headingTitle}
          </h1>
          {desc && (
            <p className="tool-detail-description tool-intro tool-description tool-subtitle">
              {desc}
            </p>
          )}
          <div className="tool-capability-pills" aria-label="Tool capabilities">
            {capabilityBadges.map((badge, idx) => (
              <span key={idx} className="tool-capability-pill">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
