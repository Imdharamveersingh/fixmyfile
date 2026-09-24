import React from 'react';
import ToolCard from '../components/ToolCard';
import { HOMEPAGE_CATEGORIES, getHomepageCategoryTools } from '../data/homepageCategories';

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-badge-wrap">
          <span className="hero-eyebrow">FAST • FREE • PRIVATE</span>
        </div>
        <h1 className="hero-title">
          Simple tools for <span className="text-gradient">everyday files</span>.
        </h1>
        <p className="hero-description">
          A focused collection of browser-based tools for PDFs, images, generators, and media.
          Everything is processed directly on your device with complete privacy.
        </p>

        <div className="hero-actions">
          <a href="#pdf-tools" className="btn-hero-primary">
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
          <a href="#browse-categories" className="btn-hero-secondary">
            Browse Categories
          </a>
        </div>
      </section>

      <div id="browse-categories" className="category-anchor"></div>

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
