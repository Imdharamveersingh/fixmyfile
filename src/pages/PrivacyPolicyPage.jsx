import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="info-page legal-page">
      <header className="info-hero">
        <span className="info-tag">Legal & Privacy</span>
        <h1 className="info-title">Privacy Policy</h1>
        <p className="info-lead">
          Last Updated & Effective: September 2026.
          At FixMyFile, privacy is not an afterthought or marketing slogan—it is the foundational engineering principle of our platform.
        </p>
      </header>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Executive Summary: Privacy by Design</h2>
          <p>
            Unlike traditional file conversion services that require you to upload your sensitive documents to remote servers,
            FixMyFile executes file manipulation, document conversions, image processing, and media tasks
            <strong> locally within your web browser</strong> whenever technically practical.
          </p>
          <p>
            We do not store, copy, analyze, or retain the contents of the files you process.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. How File Processing Operates</h2>
          <p>
            When you select a file (PDF, image, audio, video, or text) on any of our tool routes:
          </p>
          <ul>
            <li><strong>Browser Memory Execution:</strong> The file is read directly into your device’s volatile memory (RAM) via standard HTML5 File and FileReader APIs.</li>
            <li><strong>Client-Side Engines:</strong> The processing algorithms (powered by WebAssembly, Web Workers, and 2D Canvas) execute on your computer’s processor.</li>
            <li><strong>Zero Server Transmission:</strong> The raw binary contents of your files are never transmitted across the network to our hosting servers.</li>
            <li><strong>Instant Ephemeral Deletion:</strong> Once processing concludes and you download the converted output, or when you navigate away, reload, or close the browser tab, all allocated memory buffers are immediately reclaimed.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Cookies, Analytics & Tracking</h2>
          <ul>
            <li><strong>No Tracking Cookies:</strong> We do not set persistent advertising cookies, tracking pixels, or cross-site fingerprinting identifiers.</li>
            <li><strong>No Third-Party Advertising:</strong> FixMyFile does not run programmatic advertising networks, third-party remarketing scripts, or data brokers.</li>
            <li><strong>No Third-Party Analytics:</strong> We do not load intrusive behavioral trackers.</li>
            <li><strong>Local Storage:</strong> We may use temporary browser <code>localStorage</code> or <code>sessionStorage</code> strictly to preserve lightweight user UI preferences (such as dark/light theme choices or recent tool filter states). No personal file data is ever stored in persistent storage.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. WebAssembly & Vendor Assets</h2>
          <p>
            To deliver desktop-class performance in tools like Background Remover, OCR, and Video Compression,
            our application loads pre-compiled WebAssembly binaries and model weights (such as ONNX, Tesseract.js, and FFmpeg).
            These assets are self-hosted directly within our production application bundle (e.g. <code>/vendor/</code> and static chunk directories).
            They execute strictly within your browser’s standard sandboxed environment.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Server Logs & Network Requests</h2>
          <p>
            When you load pages on FixMyFile, our static hosting infrastructure (Netlify) automatically receives standard HTTP request headers
            necessary for web communication (such as your IP address, browser user-agent, and requested asset path).
            These standard web server logs are handled in accordance with modern hosting security practices, solely for DDoS mitigation,
            caching, and platform availability. They are never correlated with your file contents.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Third-Party Links</h2>
          <p>
            FixMyFile contains links to our official GitHub open-source repository and community discussion boards.
            If you click an external link to GitHub or other external platforms, their respective privacy policies govern your interactions on their websites.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Policy Updates & Inquiries</h2>
          <p>
            We may periodically update this Privacy Policy to reflect platform enhancements or new tool additions.
            Any updates will be posted directly on this page with a revised effective date.
            For questions about this policy or our privacy architecture, please review our{' '}
            <Link to="/why-fixmyfile">Why FixMyFile architectural overview</Link> or contact us via our{' '}
            <Link to="/contact">Contact Page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
