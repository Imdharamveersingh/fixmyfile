import React from 'react';
import ToolCard from '../components/ToolCard';
import { PHASE_1_TOOLS } from '../tools/toolsRegistry';

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-badge">Phase 1 Rollout</div>
        <h1 className="hero-title">
          Fast, Reliable Online <span className="text-gradient">Utility Tools</span>
        </h1>
        <p className="hero-description">
          A clean, focused collection of high-demand digital utility tools.
          Currently rolling out Phase 1 featuring our core PDF processing suite.
        </p>

        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-number">6</span>
            <span className="stat-label">Phase 1 Tools</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">36</span>
            <span className="stat-label">Total Strategy Tools</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">100%</span>
            <span className="stat-label">Client-First Design</span>
          </div>
        </div>
      </section>

      <section className="tools-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Phase 1: PDF Tools</h2>
            <p className="section-subtitle">
              High-demand document utilities prepared for implementation.
            </p>
          </div>
          <span className="phase-indicator">6 routes active</span>
        </div>

        <div className="tools-grid">
          {PHASE_1_TOOLS.map((tool) => (
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
