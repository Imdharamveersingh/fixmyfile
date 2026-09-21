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
          <div className="hero-badge">Phase 7 Complete</div>
        </div>
        <h1 className="hero-title">
          Simple tools for <span className="text-gradient">everyday files</span>.
        </h1>
        <p className="hero-description">
          A clean, focused collection of 50 high-demand digital utility tools.
          Phase 1–7 PDF, image, generator, media, and OCR text extraction tools are 100% complete and verified client-side.
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

      {/* Phase 1: PDF Tools */}
      <section id="tools-phase1" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Phase 1: PDF Tools</h2>
            <p className="section-subtitle">
              Fully verified in-browser PDF conversion, merging, and compression suite.
            </p>
          </div>
          <span className="phase-indicator">{PHASE_1_TOOLS.length} tools complete</span>
        </div>

        <div className="tools-grid">
          {PHASE_1_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Phase 2: Image Tools */}
      <section id="tools-phase2" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Phase 2: Image Tools</h2>
            <p className="section-subtitle">
              High-demand image editing and conversion utilities with in-browser AI processing.
            </p>
          </div>
          <span className="phase-indicator">{PHASE_2_TOOLS.length} tools complete</span>
        </div>

        <div className="tools-grid">
          {PHASE_2_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Phase 3: Calculators & Generators */}
      <section id="tools-phase3" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Phase 3: Calculators & Generators</h2>
            <p className="section-subtitle">
              High-demand utility generators and calculators, built for instant client-side computation and privacy.
            </p>
          </div>
          <span className="phase-indicator">{PHASE_3_TOOLS.length} tools complete</span>
        </div>

        <div className="tools-grid phase3-grid">
          {PHASE_3_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Phase 4: PDF Tools */}
      <section id="tools-phase4" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Phase 4: PDF Tools</h2>
            <p className="section-subtitle">
              Complete in-browser PDF manipulation suite: split, convert to Excel and PowerPoint, rotate, protect, unlock, extract text, isolate pages, delete pages, and reorder.
            </p>
          </div>
          <span className="phase-indicator">{PHASE_4_TOOLS.length} tools complete</span>
        </div>

        <div className="tools-grid">
          {PHASE_4_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Phase 5: Image Expansion */}
      <section id="tools-phase5" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Phase 5: Image Tools (Expansion)</h2>
            <p className="section-subtitle">
              Advanced in-browser image editing and format transformation suite with instant client-side privacy.
            </p>
          </div>
          <span className="phase-indicator">{PHASE_5_TOOLS.length} tools complete</span>
        </div>

        <div className="tools-grid">
          {PHASE_5_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Phase 6: Media Tools */}
      <section id="tools-phase6" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Phase 6: Media Tools</h2>
            <p className="section-subtitle">
              High-performance client-side audio and video processing suite powered by WebAssembly.
            </p>
          </div>
          <span className="phase-indicator">{PHASE_6_TOOLS.length} tools active</span>
        </div>

        <div className="tools-grid">
          {PHASE_6_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Phase 7: OCR / Text / Advanced File Tools */}
      <section id="tools-phase7" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Phase 7: OCR / Text / Advanced File Tools</h2>
            <p className="section-subtitle">
              High-accuracy client-side optical character recognition, structural document text extraction, and browser-first image adjustment.
            </p>
          </div>
          <span className="phase-indicator">{PHASE_7_TOOLS.length} tools complete</span>
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
              <span>Isolated tool logic ready for phase-by-phase implementation</span>
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
