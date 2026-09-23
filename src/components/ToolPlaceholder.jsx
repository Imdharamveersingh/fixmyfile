import React from 'react';
import { Link } from 'react-router-dom';

export default function ToolPlaceholder({ tool }) {
  const { name, path, category, description, phase, id } = tool;

  return (
    <div className="tool-placeholder-view">
      <div className="tool-header-section">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{name}</span>
        </nav>

        <div className="tool-title-row">
          <h1 className="tool-title">{name}</h1>
          <span className="tool-category-pill">{category}</span>
        </div>

        <p className="tool-subtitle">{description}</p>
        
        <div className="tool-meta-bar">
          <div className="tool-meta-item">
            <span className="meta-label">Route Path:</span>
            <code className="meta-code">{path}</code>
          </div>
          <div className="tool-meta-item">
            <span className="meta-label">Module Source:</span>
            <code className="meta-code">src/tools/{id}/index.jsx</code>
          </div>
        </div>
      </div>

      <div className="placeholder-state-card">
        <div className="placeholder-icon-wrapper">
          <span className="placeholder-icon">⏳</span>
        </div>
        <div className="placeholder-status-badge">Planned Tool</div>
        <h2 className="placeholder-heading">Tool implementation coming next</h2>
        <p className="placeholder-message">
          The route for <strong>{name}</strong> is now configured and active at <code>{path}</code>.
          The functional PDF processing engine will be implemented in the next step.
        </p>

        <div className="placeholder-callout">
          <span className="callout-icon">ℹ️</span>
          <div className="callout-content">
            <strong>Placeholder State:</strong> No simulated or mock conversion is performed.
            The dedicated module structure is established under <code>src/tools/{id}/</code> for seamless implementation.
          </div>
        </div>

        <div className="placeholder-actions">
          <Link to="/" className="btn-secondary">
            ← Back to All Tools
          </Link>
        </div>
      </div>
    </div>
  );
}
