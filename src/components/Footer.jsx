import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-col brand-col">
          <div className="footer-brand">
            <span className="brand-icon">⚡</span>
            <span className="brand-title">ToolHub</span>
          </div>
          <p className="footer-desc">
            Fast, client-focused online utility tools. Built for simplicity, speed, and privacy.
          </p>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Phase 1: PDF Tools</h4>
          <ul className="footer-links">
            <li><Link to="/jpg-to-pdf">JPG to PDF</Link></li>
            <li><Link to="/pdf-to-word">PDF to Word</Link></li>
            <li><Link to="/pdf-to-jpg">PDF to JPG</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">PDF Utilities</h4>
          <ul className="footer-links">
            <li><Link to="/word-to-pdf">Word to PDF</Link></li>
            <li><Link to="/merge-pdf">Merge PDF</Link></li>
            <li><Link to="/compress-pdf">Compress PDF</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Architecture</h4>
          <p className="footer-subtext">
            Modular client-first utility suite. 36 tools planned across targeted demand tiers.
          </p>
          <span className="footer-pill">Phase 1 in progress</span>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p>&copy; {currentYear} ToolHub. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/">Home</Link>
            <span>•</span>
            <span className="footer-tag">Client-side Tools</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
