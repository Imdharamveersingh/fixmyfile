import React from 'react';
import logo2 from '../assets/logo 2.png';

/**
 * Reusable FixMyFile Brand Logo Component
 * Displays the canonical visual lockup using the logo 2 asset.
 */
export default function Logo({ showBadge = false, badgeText = '', isFooter = false }) {
  return (
    <div className={`brand-logo-container ${isFooter ? 'is-footer' : ''}`}>
      <img
        src={logo2}
        alt="FixMyFile"
        className={isFooter ? 'footer-logo-img brand-logo-img' : 'brand-logo-img'}
        width="140"
        height="57"
      />
      {showBadge && Boolean(badgeText) && (
        <span className="brand-badge">{badgeText}</span>
      )}
    </div>
  );
}
