import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="not-found-view">
      <div className="not-found-code">404</div>
      <h1 className="not-found-title">Page Not Found</h1>
      <p className="not-found-message">
        The requested URL does not match any active tool route in this utility suite.
      </p>
      <Link to="/" className="btn-primary">
        Return to Tool Directory
      </Link>
    </div>
  );
}
