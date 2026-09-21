import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-col brand-col">
          <div className="footer-brand">
            <img
              src="/logo.png"
              alt="FixMyFile Logo"
              className="footer-logo-img"
              width="32"
              height="32"
            />
            <span className="brand-title">FixMyFile</span>
          </div>
          <p className="footer-desc">
            Fast, client-focused online utility tools. Built for simplicity, speed, and privacy.
          </p>
          <div className="footer-trust-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>100% Private & Browser-Based</span>
          </div>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Phase 1: PDF Tools</h4>
          <ul className="footer-links">
            <li><Link to="/jpg-to-pdf">JPG to PDF</Link></li>
            <li><Link to="/pdf-to-word">PDF to Word</Link></li>
            <li><Link to="/pdf-to-jpg">PDF to JPG</Link></li>
            <li><Link to="/word-to-pdf">Word to PDF</Link></li>
            <li><Link to="/merge-pdf">Merge PDF</Link></li>
            <li><Link to="/compress-pdf">Compress PDF</Link></li>
            <li><Link to="/split-pdf">Split PDF</Link></li>
            <li><Link to="/pdf-to-excel">PDF to Excel</Link></li>
            <li><Link to="/pdf-to-powerpoint">PDF to PowerPoint</Link></li>
            <li><Link to="/rotate-pdf">Rotate PDF</Link></li>
            <li><Link to="/protect-pdf">Protect PDF</Link></li>
            <li><Link to="/unlock-pdf">Unlock PDF</Link></li>
            <li><Link to="/pdf-to-text">PDF to Text</Link></li>
            <li><Link to="/extract-pdf-pages">Extract PDF Pages</Link></li>
            <li><Link to="/delete-pdf-pages">Delete PDF Pages</Link></li>
            <li><Link to="/reorder-pdf-pages">Reorder PDF Pages</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Phase 2: Image Tools</h4>
          <ul className="footer-links">
            <li><Link to="/background-remover">Background Remover</Link></li>
            <li><Link to="/image-compressor">Image Compressor</Link></li>
            <li><Link to="/image-resizer">Image Resizer</Link></li>
            <li><Link to="/image-converter">Image Converter</Link></li>
            <li><Link to="/image-cropper">Image Cropper</Link></li>
            <li><Link to="/heic-to-jpg">HEIC to JPG</Link></li>
            <li><Link to="/webp-to-jpg">WebP to JPG</Link></li>
            <li><Link to="/jpg-to-webp">JPG to WebP</Link></li>
            <li><Link to="/webp-to-png">WebP to PNG</Link></li>
            <li><Link to="/image-rotate-flip">Image Rotate / Flip</Link></li>
            <li><Link to="/jpg-to-png">JPG to PNG</Link></li>
            <li><Link to="/png-to-jpg">PNG to JPG</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Phase 3: Calculators & Generators</h4>
          <ul className="footer-links">
            <li><Link to="/qr-code-generator">QR Code Generator</Link></li>
            <li><Link to="/barcode-generator">Barcode Generator</Link></li>
            <li><Link to="/currency-converter">Currency Converter</Link></li>
            <li><Link to="/percentage-calculator">Percentage Calculator</Link></li>
            <li><Link to="/password-generator">Password Generator</Link></li>
            <li><Link to="/word-counter">Word Counter</Link></li>
            <li><Link to="/emi-calculator">EMI Calculator</Link></li>
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
