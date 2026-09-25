import React from 'react';
import { Link } from 'react-router-dom';
import ToolIcon from './ToolIcon';

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

export function getToolCategory(tool) {
  if (!tool) return 'generators';
  const id = tool.id || '';
  if (PDF_TOOL_IDS.has(id)) return 'pdf';
  if (IMAGE_TOOL_IDS.has(id)) return 'image';
  if (MEDIA_TOOL_IDS.has(id)) return 'media';
  if (GENERATOR_TOOL_IDS.has(id)) return 'generators';

  const cat = (tool.category || '').toLowerCase();
  if (cat.includes('pdf')) return 'pdf';
  if (cat.includes('image')) return 'image';
  if (cat.includes('video') || cat.includes('audio') || cat.includes('media')) return 'media';
  return 'generators';
}

export default function ToolCard({ tool, category }) {
  const { name, path, icon, id, description } = tool;
  const cat = category || getToolCategory(tool);

  return (
    <Link to={path} className="tool-card" data-category={cat} aria-label={`Open ${name} tool`}>
      <div className="tool-card-icon-wrap">
        <ToolIcon icon={icon || id} />
      </div>
      <h3 className="tool-card-title">{name}</h3>
      <p className="tool-card-description">{description}</p>
    </Link>
  );
}
