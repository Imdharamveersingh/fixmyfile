import React from 'react';
import { Link } from 'react-router-dom';

export default function ToolCard({ tool }) {
  const { name, path, category, description } = tool;

  return (
    <Link to={path} className="tool-card" aria-label={`Open ${name} tool`}>
      <div className="tool-card-header">
        <span className="tool-category-badge">{category}</span>
      </div>
      <h3 className="tool-card-title">{name}</h3>
      <p className="tool-card-description">{description}</p>
      <div className="tool-card-footer">
        <div className="tool-card-meta">
          <code className="tool-path-pill">{path}</code>
        </div>
        <span className="tool-card-arrow" aria-hidden="true">→</span>
      </div>
    </Link>
  );
}
