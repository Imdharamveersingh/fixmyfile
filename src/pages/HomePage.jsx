import React from 'react';
import ToolCard from '../components/ToolCard';
import CategorySectionHeading from '../components/CategorySectionHeading';
import { CATEGORY_SVG_MAP } from '../components/categorySvgMap';
import { TOOL_SVG_MAP } from '../components/toolSvgMap';
import { HOMEPAGE_CATEGORIES, getHomepageCategoryTools } from '../data/homepageCategories';

const FLOATING_HERO_TOOLS = [
  // Left flank
  { id: 'merge-pdf', className: 'tool-float-1', tier: 'all' },
  { id: 'pdf-to-word', className: 'tool-float-2', tier: 'laptop-up' },
  { id: 'image-compressor', className: 'tool-float-3', tier: 'tablet-up' },
  { id: 'video-compressor', className: 'tool-float-4', tier: 'all' },
  { id: 'jpg-to-pdf', className: 'tool-float-5', tier: 'desktop-up' },
  { id: 'image-cropper', className: 'tool-float-6', tier: 'desktop-up' },
  // Right flank
  { id: 'image-converter', className: 'tool-float-7', tier: 'all' },
  { id: 'barcode-generator', className: 'tool-float-8', tier: 'laptop-up' },
  { id: 'gif-maker', className: 'tool-float-9', tier: 'tablet-up' },
  { id: 'qr-code-generator', className: 'tool-float-10', tier: 'all' },
  { id: 'video-to-gif', className: 'tool-float-11', tier: 'desktop-up' },
  { id: 'password-generator', className: 'tool-float-12', tier: 'desktop-up' }
];

const CATEGORY_CARDS = [
  {
    id: 'pdf-tools',
    title: 'PDF Tools',
    accentName: 'pdf',
    shortDesc: 'Convert, merge, compress, protect, and extract PDF files.'
  },
  {
    id: 'image-tools',
    title: 'Image Tools',
    accentName: 'image',
    shortDesc: 'Convert, compress, resize, crop, and enhance image files.'
  },
  {
    id: 'media-tools',
    title: 'Media Tools',
    accentName: 'media',
    shortDesc: 'Convert and optimize video, audio, and animated GIF files.'
  },
  {
    id: 'generators',
    title: 'Generators',
    accentName: 'generators',
    shortDesc: 'Create QR codes, barcodes, passwords, and useful calculators.'
  }
];

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero-section">
        {/* Decorative Floating Tool SVGs Layer */}
        <div className="hero-floating-tools" aria-hidden="true">
          {FLOATING_HERO_TOOLS.map((item) => {
            const svgUrl = TOOL_SVG_MAP[item.id];
            if (!svgUrl) return null;
            return (
              <img
                key={item.id}
                src={svgUrl}
                alt=""
                aria-hidden="true"
                focusable="false"
                className={`hero-floating-tool ${item.className} float-tier-${item.tier}`}
              />
            );
          })}
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            Simple tools for <span className="text-gradient">everyday files</span>.
          </h1>
          <p className="hero-description">
            Free, fast, and private tools. Your files stay on your device — we never store your data.
          </p>

          <div className="hero-actions">
            <a href="#pdf-tools" className="btn-hero-primary" id="hero-explore-tools">
              Explore All Tools
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
            <a href="#categories" className="btn-hero-secondary" id="hero-browse-categories">
              Browse Categories
            </a>
          </div>
        </div>
      </section>

      {/* Category Discovery Navigation */}
      <section id="categories" className="category-discovery-section" aria-label="Browse tools by category">
        <div id="browse-categories" className="category-anchor"></div>
        <div className="category-discovery-header">
          <span className="category-discovery-label">Browse tools by category</span>
        </div>

        <div className="category-discovery-grid">
          {CATEGORY_CARDS.map((cat) => {
            const count = getHomepageCategoryTools(cat.id).length;
            const catSvg = CATEGORY_SVG_MAP[cat.id];
            return (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className={`category-discovery-card category-card-${cat.accentName}`}
                aria-label={`${cat.title}, ${count} tools: ${cat.shortDesc}`}
              >
                <div className="category-card-top">
                  <div className="category-card-icon-wrap">
                    <img
                      src={catSvg}
                      alt=""
                      aria-hidden="true"
                      focusable="false"
                      width={38}
                      height={38}
                      className="category-card-icon"
                    />
                  </div>
                  <span className="category-card-badge">{count} tools</span>
                </div>
                <div className="category-card-info">
                  <h3 className="category-card-title">{cat.title}</h3>
                  <p className="category-card-desc">{cat.shortDesc}</p>
                </div>
                <div className="category-card-footer">
                  <span className="category-card-action">
                    Explore tools
                    <svg
                      className="category-card-arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* Exactly 4 User-Facing Categories Covering All 49 Active Tools */}
      {HOMEPAGE_CATEGORIES.map((category) => {
        const tools = getHomepageCategoryTools(category.id);
        const isGenerators = category.id === 'generators';
        const categoryKey = category.id === 'generators' ? 'generators' : category.id.replace('-tools', '');
        return (
          <section key={category.id} id={category.id} className="tools-section">
            <div className="section-header">
              <CategorySectionHeading category={category} />
            </div>

            <div className={`tools-grid ${isGenerators ? 'phase3-grid generators-grid' : ''}`}>
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} category={categoryKey} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
