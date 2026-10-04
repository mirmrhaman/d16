import React from 'react';
import { useLocation } from 'react-router-dom';
import { normalizeSocialMedia } from '../../server/src/socialMediaSchema.js';
import { resolveSocialBrand } from '../data/socialBrands.js';
import SocialBrandIcon from './SocialBrandIcon.jsx';

// Only ordinary links are rendered. No third-party chat scripts, tracking
// widgets or confidential contact data are fetched or injected here.
export default function FloatingSocialLinks({ contact }) {
  const { pathname } = useLocation();
  const { social_links, floating_social } = normalizeSocialMedia(contact);
  if (/^\/(?:Admin|login(?:\/|$))/i.test(pathname) || !floating_social.enabled || floating_social.platforms.length === 0) return null;
  const onLeft = floating_social.side === 'left';
  return <nav aria-label="Floating media links" className={`fixed z-40 flex max-h-[calc(100dvh-8rem)] flex-col gap-2 overflow-y-auto rounded-2xl p-2 ${onLeft ? 'left-2 sm:left-4' : 'right-2 sm:right-4'}`} style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
    {floating_social.platforms.map((platform) => {
      const url = social_links[platform];
      if (!url) return null;
      const { label, color } = resolveSocialBrand(platform);
      return <a key={platform} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} (new tab)`} title={`${label} — opens in a new tab`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:h-12 sm:w-12" style={{ backgroundColor: color }}><SocialBrandIcon platform={platform} size={26} /></a>;
    })}
  </nav>;
}
