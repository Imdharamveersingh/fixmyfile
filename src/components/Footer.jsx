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
            <span className="brand-title">FixMyFile</span>
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
          <h4 className="footer-heading">Phase 2: Image Tools</h4>
          <ul className="footer-links">
            <li><Link to="/background-remover">Background Remover</Link></li>
            <li><Link to="/image-compressor">Image Compressor</Link></li>
            <li><Link to="/image-resizer">Image Resizer</Link></li>
            <li><Link to="/image-converter">Image Converter</Link></li>
            <li><Link to="/jpg-to-png">JPG to PNG</Link></li>
            <li><Link to="/png-to-jpg">PNG to JPG</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Phase 3: Generators</h4>
          <ul className="footer-links">
            <li><Link to="/qr-code-generator">QR Code Generator</Link></li>
            <li><Link to="/barcode-generator">Barcode Generator</Link></li>
          </ul>
          <span className="footer-pill" style={{ marginTop: '12px', display: 'inline-block' }}>Phase 3 Active</span>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p>&copy; {currentYear} FixMyFile. All rights reserved.</p>
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
