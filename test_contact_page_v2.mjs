import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getPageSEO } from './src/config/seoConfig.js';

test('=== FIXMYFILE: CONTACT PAGE UI REFINEMENT V2 TEST SUITE ===', async (t) => {
  const contactPageSrc = fs.readFileSync('src/pages/ContactPage.jsx', 'utf-8');
  const appSrc = fs.readFileSync('src/App.jsx', 'utf-8');
  const appCssSrc = fs.readFileSync('src/App.css', 'utf-8');

  // Requirement 1: /contact route exists
  await t.test('1. /contact route is registered in App.jsx', () => {
    assert.match(
      appSrc,
      /<Route\s+path=["']contact["']\s+element=\{<ContactPage\s*\/>\}/,
      'App.jsx must register the /contact route with ContactPage'
    );
  });

  // Requirement 2: Correct heading hierarchy
  await t.test('2. Correct heading exists ("Contact FixMyFile" H1 and "Contact Us" H2)', () => {
    assert.ok(
      contactPageSrc.includes('<h1 className="info-title">Contact FixMyFile</h1>'),
      'ContactPage.jsx must have H1 "Contact FixMyFile"'
    );
    assert.ok(
      contactPageSrc.includes('<h2 className="contact-card-title">Contact Us</h2>'),
      'ContactPage.jsx must have H2 "Contact Us"'
    );
    assert.ok(
      !contactPageSrc.includes('Contact & Community Support'),
      'Old heading "Contact & Community Support" must be removed'
    );
  });

  // Requirement 3 & 4 & 5: Email address and mailto links
  await t.test('3, 4, 5. Exact email address and mailto links exist for direct email and CTA button', () => {
    const targetEmail = 'garammasala365@gmail.com';
    const targetMailto = `mailto:${targetEmail}`;

    assert.ok(
      contactPageSrc.includes(targetEmail),
      `ContactPage.jsx must display exact email ${targetEmail}`
    );
    assert.ok(
      contactPageSrc.includes(`href="${targetMailto}"`),
      `ContactPage.jsx must contain mailto link to ${targetMailto}`
    );
    assert.ok(
      contactPageSrc.includes('className="btn-email-primary"'),
      'ContactPage.jsx must include the "Email Us" primary CTA button'
    );
    assert.ok(
      />\s*Email Us\s*<\/a>/.test(contactPageSrc),
      'ContactPage.jsx must have CTA button with text "Email Us"'
    );

    // Verify clickable email link
    assert.ok(
      contactPageSrc.includes('className="contact-email-link"'),
      'ContactPage.jsx must render email address inside clickable .contact-email-link'
    );
  });

  // Requirement 6: Old GitHub-first contact sections are removed
  await t.test('6. Old GitHub-first contact, FAQ, and production inquiry sections are removed', () => {
    assert.ok(
      !contactPageSrc.includes('GitHub Issues & Discussions'),
      'Old "GitHub Issues & Discussions" section must be removed'
    );
    assert.ok(
      !contactPageSrc.includes('Frequently Asked Questions'),
      'Old "Frequently Asked Questions" section must be removed'
    );
    assert.ok(
      !contactPageSrc.includes('Production Inquiries'),
      'Old "Production Inquiries" section must be removed'
    );
    assert.ok(
      !contactPageSrc.includes('contact-faq-section'),
      'Old FAQ section styling must be removed'
    );
    assert.ok(
      !contactPageSrc.includes('contact-notice-box'),
      'Old notice box must be removed'
    );
  });

  // Requirement 7: No fake contact form exists
  await t.test('7. No fake contact form or input elements exist', () => {
    assert.ok(!contactPageSrc.includes('<form'), 'Must not contain <form> element');
    assert.ok(!contactPageSrc.includes('<input'), 'Must not contain <input> element');
    assert.ok(!contactPageSrc.includes('<textarea'), 'Must not contain <textarea> element');
    assert.ok(!contactPageSrc.includes('type="submit"'), 'Must not contain submit button');
  });

  // Requirement 8: SEO metadata
  await t.test('8. SEO metadata is correct for /contact', () => {
    const seo = getPageSEO('/contact');
    assert.strictEqual(seo.title, 'Contact FixMyFile — Get in Touch');
    assert.strictEqual(
      seo.description,
      'Contact FixMyFile for questions, feedback, bug reports, suggestions, and partnership inquiries.'
    );
    assert.strictEqual(seo.canonical, 'https://fixmyfile.netlify.app/contact');
    assert.strictEqual(seo.ogType, 'website');
    assert.strictEqual(seo.robots, 'index, follow');
  });

  // Requirement 9: Accessibility and landmark rules
  await t.test('9. Accessibility structure is valid (no inner <main>, aria-hidden icon)', () => {
    assert.ok(
      !/<main[\s>]/.test(contactPageSrc),
      'ContactPage.jsx must not contain inner <main> tag (Layout.jsx owns the landmark)'
    );
    assert.ok(
      contactPageSrc.includes('className="contact-mail-icon-wrap" aria-hidden="true"'),
      'Mail icon wrapper must specify aria-hidden="true"'
    );
    assert.ok(
      contactPageSrc.includes('aria-label="Send email to garammasala365@gmail.com"'),
      'Email link provides accessible aria-label'
    );
    assert.ok(
      appCssSrc.includes('@media (prefers-reduced-motion: reduce)'),
      'App.css must support prefers-reduced-motion for contact card'
    );
  });
});
