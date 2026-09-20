import React from 'react';
import ToolCard from '../components/ToolCard';
import { ALL_TOOLS, PHASE_1_TOOLS, PHASE_2_TOOLS, PHASE_3_TOOLS, PHASE_4_TOOLS, TOTAL_STRATEGY_TOOLS } from '../tools/toolsRegistry';

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-badge-wrap">
          <span className="hero-eyebrow">FAST • FREE • PRIVATE</span>
          <div className="hero-badge">Phase 3 Active</div>
        </div>
        <h1 className="hero-title">
          Simple tools for <span className="text-gradient">everyday files</span>.
        </h1>
        <p className="hero-description">
          A clean, focused collection of high-demand digital utility tools.
          Phase 1 PDF tools and Phase 2 image tools are complete, with Phase 3 generators now rolling out.
        </p>

        <div className="hero-actions">
          <a href="#tools-phase3" className="btn-hero-primary">
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

      {/* Phase 3: Calculators & Generators */}
      <section id="tools-phase3" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Phase 3: Calculators & Generators</h2>
            <p className="section-subtitle">
              High-demand utility generators and calculators, built for instant client-side computation and privacy.
            </p>
          </div>
          <span className="phase-indicator">7 tools complete</span>
        </div>

        <div className="tools-grid phase3-grid">
          {PHASE_3_TOOLS.map((tool) => (
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
          <span className="phase-indicator">6 tools complete</span>
        </div>

        <div className="tools-grid">
          {PHASE_2_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>

      {/* Phase 1: PDF Tools */}
      <section id="tools-phase1" className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Phase 1: PDF Tools</h2>
            <p className="section-subtitle">
              Fully verified in-browser PDF conversion, merging, and compression suite.
            </p>
          </div>
          <span className="phase-indicator">6 tools complete</span>
        </div>

        <div className="tools-grid">
          {PHASE_1_TOOLS.map((tool) => (
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
              Advanced in-browser PDF manipulation: split, convert to Excel and PowerPoint, rotate, protect, unlock, extract text, and isolate pages.
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
