import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="info-page legal-page">
      <header className="info-hero">
        <span className="info-tag">Legal Terms</span>
        <h1 className="info-title">Terms & Conditions</h1>
        <p className="info-lead">
          Last Updated & Effective: September 2026.
          Please review these Terms & Conditions before utilizing the FixMyFile platform and its tools.
        </p>
      </header>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using FixMyFile (accessible at <code>https://fixmyfile.netlify.app</code>) and its suite of browser-based digital utilities,
            you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, please discontinue use of the platform.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Description of Service & Client-Side Execution</h2>
          <p>
            FixMyFile provides free, client-side digital utility tools for PDF manipulation, image editing, optical character recognition (OCR),
            media transcoding, code generation, and financial calculation.
            Our tools execute within your web browser using client-side technologies (including HTML5 APIs, Canvas, Web Workers, and WebAssembly).
            You acknowledge that processing speed and maximum file capability depend directly upon your device’s hardware, available memory (RAM), and web browser capabilities.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. User Responsibility & Content Ownership</h2>
          <ul>
            <li><strong>You Retain All Rights:</strong> You retain complete ownership, copyright, and intellectual property rights to all files, images, documents, and media that you process through FixMyFile.</li>
            <li><strong>Authorized Use:</strong> You affirm that you possess the necessary rights, licenses, or permissions to upload and modify the documents or media you process.</li>
            <li><strong>Prohibited Use:</strong> You agree not to use FixMyFile to process unlawful content, maliciously circumvent access restrictions on documents you do not own, or attempt to destabilize the platform.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Accuracy, Disclaimers & "As-Is" Provision</h2>
          <p>
            FixMyFile is provided on an <strong>"AS-IS"</strong> and <strong>"AS-AVAILABLE"</strong> basis without warranties of any kind, whether express or implied.
          </p>
          <p>
            While our tools are developed following strict quality and validation benchmarks:
          </p>
          <ul>
            <li>We do not guarantee that file conversions, OCR text extractions, or compression operations will be 100% error-free or preserve all proprietary document formatting in every circumstance.</li>
            <li>Financial calculations (such as Currency Conversion, EMI, or Percentage calculators) are provided for informational and estimation purposes only.</li>
            <li>You are strongly advised to verify converted files and maintain independent backups of all original documents prior to processing.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, FixMyFile and its creators shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including but not limited to loss of data, loss of business, or hardware malfunction arising out of
            or in connection with your use or inability to use the platform.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Intellectual Property of Platform</h2>
          <p>
            The FixMyFile brand name, logo, custom user interface design tokens, CSS styling, and proprietary tool orchestration code are the intellectual property of FixMyFile.
            You may not scrape, frame, clone, or redistribute the platform UI for commercial resale without prior authorization.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Modifications to Service & Terms</h2>
          <p>
            We reserve the right to modify, enhance, or discontinue any tool or feature at any time without prior notice.
            These Terms & Conditions may be updated periodically to reflect architectural or legal changes.
            Continued use of the website following any changes constitutes acceptance of the updated terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Questions & Contact</h2>
          <p>
            If you have questions regarding these Terms & Conditions, please consult our{' '}
            <Link to="/contact">Contact Page</Link> or open a discussion on our official GitHub repository.
          </p>
        </section>
      </div>
    </div>
  );
}
