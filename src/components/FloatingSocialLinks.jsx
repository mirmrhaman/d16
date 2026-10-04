import React from 'react';
import { useLocation } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Linkedin, Twitter, MessageCircle, Send, Globe, Link2 } from 'lucide-react';
import { normalizeSocialMedia } from '../../server/src/socialMediaSchema.js';

const PLATFORMS = {
  facebook: { label: 'Facebook', Icon: Facebook, color: '#1877f2' },
  instagram: { label: 'Instagram', Icon: Instagram, color: '#c13584' },
  youtube: { label: 'YouTube', Icon: Youtube, color: '#dc2626' },
  linkedin: { label: 'LinkedIn', Icon: Linkedin, color: '#0a66c2' },
  twitter: { label: 'Twitter', Icon: Twitter, color: '#111827' },
  x: { label: 'X', Icon: Twitter, color: '#111827' },
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle, color: '#128c4a' },
  messenger: { label: 'Messenger', Icon: MessageCircle, color: '#2563eb' },
  telegram: { label: 'Telegram', Icon: Send, color: '#087eaf' },
  website: { label: 'Website', Icon: Globe, color: '#112037' },
};

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
      const { label, Icon, color } = PLATFORMS[platform] || { label: platform.replaceAll('_', ' '), Icon: Link2, color: '#112037' };
      return <a key={platform} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} (new tab)`} title={`${label} — opens in a new tab`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:h-12 sm:w-12" style={{ backgroundColor: color }}><Icon size={23} aria-hidden="true" /></a>;
    })}
  </nav>;
}
