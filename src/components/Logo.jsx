import React from 'react';
import logo from '../assets/logo.png';

/**
 * Reusable FixMyFile Brand Logo Component
 * Displays the canonical visual lockup using the logo asset.
 */
export default function Logo({ showBadge = false, badgeText = '', isFooter = false }) {
  return (
    <div className={`brand-logo-container ${isFooter ? 'is-footer' : ''}`}>
      <img
        src={logo}
        alt="FixMyFile"
        className={isFooter ? 'footer-logo-img brand-logo-img' : 'brand-logo-img'}
        width="784"
        height="318"
      />
      {showBadge && Boolean(badgeText) && (
        <span className="brand-badge">{badgeText}</span>
      )}
    </div>
  );
}
