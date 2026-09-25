import React from 'react';
import ToolCard from '../components/ToolCard';
import ToolIcon from '../components/ToolIcon';
import { HOMEPAGE_CATEGORIES, getHomepageCategoryTools } from '../data/homepageCategories';

const CATEGORY_CARDS = [
  {
    id: 'pdf-tools',
    title: 'PDF Tools',
    icon: 'merge-pdf',
    accentName: 'pdf',
    shortDesc: 'Convert, merge, split, compress, protect, and extract.'
  },
  {
    id: 'image-tools',
    title: 'Image Tools',
    icon: 'image-converter',
    accentName: 'image',
    shortDesc: 'Convert, compress, resize, crop, and enhance images.'
  },
  {
    id: 'media-tools',
    title: 'Media Tools',
    icon: 'video-compressor',
    accentName: 'media',
    shortDesc: 'Convert and optimize audio, video, and animated GIFs.'
  },
  {
    id: 'generators',
    title: 'Generators',
    icon: 'qr-code-generator',
    accentName: 'generators',
    shortDesc: 'Create QR codes, barcodes, passwords, and utilities.'
  }
];

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero-section">
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
            return (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className={`category-discovery-card category-card-${cat.accentName}`}
                aria-label={`${cat.title}, ${count} tools: ${cat.shortDesc}`}
              >
                <div className="category-card-top">
                  <div className="category-card-icon-wrap">
                    <ToolIcon icon={cat.icon} size={38} className="category-card-icon" />
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
        return (
          <section key={category.id} id={category.id} className="tools-section">
            <div className="section-header">
              <div>
                <h2 className="section-title">{category.title}</h2>
                <p className="section-subtitle">{category.subtitle}</p>
              </div>
            </div>

            <div className={`tools-grid ${isGenerators ? 'phase3-grid generators-grid' : ''}`}>
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
