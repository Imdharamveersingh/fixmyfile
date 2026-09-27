import React from 'react';
import ToolCard from '../components/ToolCard';
import CategorySectionHeading from '../components/CategorySectionHeading';
import { CATEGORY_SVG_MAP } from '../components/categorySvgMap';
import { TOOL_SVG_MAP } from '../components/toolSvgMap';
import { HOMEPAGE_CATEGORIES, getHomepageCategoryTools } from '../data/homepageCategories';

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

const FLOATING_HERO_ICONS = [
  // PDF tools
  {
    id: 'merge-pdf',
    x: '3%',
    y: '10%',
    size: 34,
    rotation: -6,
    delay: 0.2,
    duration: 5.6,
    opacity: 0.14,
    deviceClass: 'float-all'
  },
  {
    id: 'pdf-to-word',
    x: '6%',
    y: '38%',
    size: 30,
    rotation: 4,
    delay: 1.4,
    duration: 6.2,
    opacity: 0.12,
    deviceClass: 'float-tablet-up'
  },
  {
    id: 'jpg-to-pdf',
    x: '3%',
    y: '68%',
    size: 36,
    rotation: -4,
    delay: 2.5,
    duration: 5.2,
    opacity: 0.14,
    deviceClass: 'float-all'
  },
  // Image tools
  {
    id: 'image-compressor',
    x: '7%',
    y: '88%',
    size: 32,
    rotation: 5,
    delay: 0.8,
    duration: 6.5,
    opacity: 0.12,
    deviceClass: 'float-desktop-only'
  },
  {
    id: 'image-converter',
    x: '93%',
    y: '10%',
    size: 36,
    rotation: 6,
    delay: 0.5,
    duration: 5.8,
    opacity: 0.14,
    deviceClass: 'float-all'
  },
  {
    id: 'image-cropper',
    x: '94%',
    y: '64%',
    size: 34,
    rotation: 7,
    delay: 2.8,
    duration: 5.4,
    opacity: 0.13,
    deviceClass: 'float-desktop-only'
  },
  // Media tools
  {
    id: 'video-compressor',
    x: '90%',
    y: '86%',
    size: 36,
    rotation: -6,
    delay: 1.1,
    duration: 6.4,
    opacity: 0.14,
    deviceClass: 'float-tablet-up'
  },
  {
    id: 'gif-maker',
    x: '88%',
    y: '92%',
    size: 28,
    rotation: 4,
    delay: 3.2,
    duration: 5.0,
    opacity: 0.11,
    deviceClass: 'float-desktop-only'
  },
  // Generators
  {
    id: 'qr-code-generator',
    x: '90%',
    y: '38%',
    size: 32,
    rotation: -5,
    delay: 1.8,
    duration: 6.0,
    opacity: 0.13,
    deviceClass: 'float-all'
  }
];

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero-section">
        {/* Background artwork layer */}
        <div className="hero-background-art" aria-hidden="true" />

        {/* Floating SVG decoration layer */}
        <div className="hero-floating-icons" aria-hidden="true">
          {FLOATING_HERO_ICONS.map((icon) => (
            <span
              key={icon.id}
              className={`hero-floating-icon hero-floating-icon-${icon.id} ${icon.deviceClass}`}
              style={{
                '--float-x': icon.x,
                '--float-y': icon.y,
                '--float-size': `${icon.size}px`,
                '--float-rot': `${icon.rotation}deg`,
                '--float-delay': `${icon.delay}s`,
                '--float-duration': `${icon.duration}s`,
                '--float-opacity': icon.opacity
              }}
              aria-hidden="true"
            >
              <img
                src={TOOL_SVG_MAP[icon.id]}
                alt=""
                aria-hidden="true"
                focusable="false"
                width={icon.size}
                height={icon.size}
                loading="eager"
                decoding="async"
              />
            </span>
          ))}
        </div>

        <h1 className="hero-title">
          Simple tools for <span className="text-gradient">everyday files</span>.
        </h1>
        <p className="hero-description">
          A focused collection of browser-based tools for PDFs, images, generators, and media.
          Everything is processed directly on your device with complete privacy.
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
