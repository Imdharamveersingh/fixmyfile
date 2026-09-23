import React from 'react';
import ToolCard from '../components/ToolCard';
import {
  ALL_TOOLS,
  PHASE_1_TOOLS,
  PHASE_2_TOOLS,
  PHASE_3_TOOLS,
  PHASE_4_TOOLS,
  PHASE_5_TOOLS,
  PHASE_6_TOOLS,
  PHASE_7_TOOLS,
  TOTAL_STRATEGY_TOOLS
} from '../tools/toolsRegistry';

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
          A clean, focused collection of 49 high-demand digital utility tools.
          PDF, image, generator, media, and OCR text extraction tools are verified and processed securely client-side.
        </p>

        <div className="hero-actions">
          <a href="#tools-phase1" className="btn-hero-primary">
            Explore All Tools
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
          <a href="#browse-categories" className="btn-hero-secondary">
            Browse Categories
          </a>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-number">{ALL_TOOLS.length}</span>
            <span className="stat-label">Active Tools</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{TOTAL_STRATEGY_TOOLS}</span>
            <span className="stat-label">Total Strategy Tools</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">100%</span>
            <span className="stat-label">Client-First Design</span>
          </div>
        </div>
      </section>

      <div id="browse-categories" className="category-anchor"></div>

      {/* PDF Tools */}
      <section id="tools-phase1" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">PDF Tools</h2>
            <p className="section-subtitle">
              Fully verified in-browser PDF conversion, merging, and compression suite.
            </p>
          </div>
        </div>

        <div className="tools-grid">
          {PHASE_1_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Image Tools */}
      <section id="tools-phase2" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Image Tools</h2>
            <p className="section-subtitle">
              High-demand image editing and conversion utilities with in-browser AI processing.
            </p>
          </div>
        </div>

        <div className="tools-grid">
          {PHASE_2_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Calculators & Generators */}
      <section id="tools-phase3" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Calculators & Generators</h2>
            <p className="section-subtitle">
              High-demand utility generators and calculators, built for instant client-side computation and privacy.
            </p>
          </div>
        </div>

        <div className="tools-grid phase3-grid">
          {PHASE_3_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Advanced PDF Tools */}
      <section id="tools-phase4" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Advanced PDF Tools</h2>
            <p className="section-subtitle">
              Complete in-browser PDF manipulation suite: split, convert to Excel and PowerPoint, rotate, protect, unlock, extract text, isolate pages, delete pages, and reorder.
            </p>
          </div>
        </div>

        <div className="tools-grid">
          {PHASE_4_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Advanced Image Tools */}
      <section id="tools-phase5" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Advanced Image Tools</h2>
            <p className="section-subtitle">
              Advanced in-browser image editing and format transformation suite with instant client-side privacy.
            </p>
          </div>
        </div>

        <div className="tools-grid">
          {PHASE_5_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Media Tools */}
      <section id="tools-phase6" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Media Tools</h2>
            <p className="section-subtitle">
              High-performance client-side audio and video processing suite powered by WebAssembly.
            </p>
          </div>
        </div>

        <div className="tools-grid">
          {PHASE_6_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* OCR & Text Tools */}
      <section id="tools-phase7" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">OCR & Text Tools</h2>
            <p className="section-subtitle">
              High-accuracy client-side optical character recognition, structural document text extraction, and browser-first image adjustment.
            </p>
          </div>
        </div>

        <div className="tools-grid">
          {PHASE_7_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      <section className="architecture-section">
        <div className="architecture-card">
          <div className="architecture-header">
            <span className="arch-icon">🏗️</span>
            <div>
              <h3 className="arch-title">Scalable Path-Based Architecture</h3>
              <p className="arch-desc">
                Clean separation of concerns with dedicated modular folders under <code>src/tools/</code>.
              </p>
            </div>
          </div>
          <div className="arch-features">
            <div className="arch-feature-item">
              <span className="feature-dot"></span>
              <span>Individual routing per tool for direct deep-linking and SEO</span>
            </div>
            <div className="arch-feature-item">
              <span className="feature-dot"></span>
              <span>Isolated tool logic engineered for modular reliability</span>
            </div>
            <div className="arch-feature-item">
              <span className="feature-dot"></span>
              <span>Zero external bloat or mock processing scripts</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
