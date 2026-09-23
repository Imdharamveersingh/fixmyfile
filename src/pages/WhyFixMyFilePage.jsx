import React from 'react';
import { Link } from 'react-router-dom';

export default function WhyFixMyFilePage() {
  const featuredTools = [
    {
      name: 'Compress PDF',
      path: '/compress-pdf',
      category: 'PDF Optimization',
      desc: 'Compress documents right in memory without uploading files to remote servers.'
    },
    {
      name: 'Background Remover',
      path: '/background-remover',
      category: 'Image AI',
      desc: 'Local neural network segmentation running on your browser using WebAssembly.'
    },
    {
      name: 'Image to Text (OCR)',
      path: '/image-to-text',
      category: 'OCR & Text',
      desc: 'Extract text from photos, scans, and receipts using in-browser neural models.'
    },
    {
      name: 'Video Compressor',
      path: '/video-compressor',
      category: 'Media Tools',
      desc: 'Transcode and compress video containers client-side via FFmpeg WASM.'
    },
    {
      name: 'Image Cropper',
      path: '/image-cropper',
      category: 'Image Editing',
      desc: 'Precision HTML5 canvas cropping studio with instant aspect ratio locking.'
    },
    {
      name: 'QR Code Generator',
      path: '/qr-code-generator',
      category: 'Generators',
      desc: 'Generate customized vector QR codes instantly with SVG and PNG export.'
    }
  ];

  return (
    <div className="info-page why-page">
      <header className="info-hero">
        <span className="info-tag">Client-First Utility Philosophy</span>
        <h1 className="info-title">Why FixMyFile?</h1>
        <p className="info-lead">
          Everyday file utilities should be fast, accessible, and respect your privacy.
          FixMyFile was built on a simple conviction: you shouldn’t have to upload your private files
          to remote cloud servers just to perform routine conversions, edits, or extractions.
        </p>
      </header>

      <section className="info-section principles-section">
        <h2 className="section-title-large">Core Architectural Principles</h2>
        <div className="principles-grid">
          <div className="principle-card">
            <div className="principle-icon-wrapper" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3>1. In-Browser Local Processing</h3>
            <p>
              Whenever technically practical, FixMyFile processes documents directly on your device
              using WebAssembly, Canvas, and Web Workers. Your files are loaded into browser RAM
              and transformed locally, avoiding internet upload latency.
            </p>
          </div>

          <div className="principle-card">
            <div className="principle-icon-wrapper" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h3>2. Zero Cloud Retention</h3>
            <p>
              Because processing takes place client-side, we do not store, copy, or retain your
              files on our servers. When you close the browser tab or hit reset, your files
              are immediately discarded from your device’s memory.
            </p>
          </div>

          <div className="principle-card">
            <div className="principle-icon-wrapper" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <h3>3. Instant Execution & No Upload Delays</h3>
            <p>
              Traditional online converters force you to upload large 50 MB files over slow internet connections
              before processing can even begin. With FixMyFile, local processing begins the millisecond
              you drop your file.
            </p>
          </div>

          <div className="principle-card">
            <div className="principle-icon-wrapper" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            </div>
            <h3>4. No Accounts, Ads, or Subscriptions</h3>
            <p>
              No mandatory email registrations, no daily file limits, no paid paywalls, and no intrusive
              tracking scripts. FixMyFile is engineered as a clean, distraction-free utility platform.
            </p>
          </div>
        </div>
      </section>

      <section className="info-section comparison-section">
        <h2 className="section-title-large">How FixMyFile Compares</h2>
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th scope="col">Feature / Property</th>
                <th scope="col">Traditional Cloud Converters</th>
                <th scope="col">FixMyFile Architecture</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>File Location</strong></td>
                <td>Uploaded across the internet to third-party cloud servers</td>
                <td><span className="pill-badge pill-highlight">Processed locally in browser RAM</span></td>
              </tr>
              <tr>
                <td><strong>Data Retention</strong></td>
                <td>Stored on remote disks for hours or days</td>
                <td><span className="pill-badge pill-highlight">Zero server retention</span></td>
              </tr>
              <tr>
                <td><strong>Processing Speed</strong></td>
                <td>Limited by upload and download internet bandwidth</td>
                <td><span className="pill-badge pill-highlight">Instant local compute speeds</span></td>
              </tr>
              <tr>
                <td><strong>Account Requirement</strong></td>
                <td>Often requires signup, login, or email capture</td>
                <td><span className="pill-badge pill-highlight">No signups or registration</span></td>
              </tr>
              <tr>
                <td><strong>Tracking & Cookies</strong></td>
                <td>Aggressive tracking pixels and advertising cookies</td>
                <td><span className="pill-badge pill-highlight">Zero tracking or third-party ads</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="info-section tools-showcase-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-title-large">Experience the Architecture</h2>
            <p className="section-subtitle">
              Try some of our most popular client-side tools directly in your browser today.
            </p>
          </div>
          <Link to="/" className="info-link-btn">
            View All 49 Tools &rarr;
          </Link>
        </div>

        <div className="showcase-grid">
          {featuredTools.map((tool) => (
            <Link to={tool.path} key={tool.path} className="showcase-card">
              <span className="showcase-category">{tool.category}</span>
              <h3 className="showcase-name">{tool.name}</h3>
              <p className="showcase-desc">{tool.desc}</p>
              <span className="showcase-action">Launch Tool &rarr;</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
