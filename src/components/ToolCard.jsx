import React from 'react';
import { Link } from 'react-router-dom';
import ToolIcon from './ToolIcon';

export default function ToolCard({ tool }) {
  const { name, path, icon, id, description } = tool;

  return (
    <Link to={path} className="tool-card" aria-label={`Open ${name} tool`}>
      <div className="tool-card-icon-wrap">
        <ToolIcon icon={icon || id} />
      </div>
      <h3 className="tool-card-title">{name}</h3>
      <p className="tool-card-description">{description}</p>
    </Link>
  );
}
