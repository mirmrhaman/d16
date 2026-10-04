import React from 'react';
import { Globe, Link2 } from 'lucide-react';
import { resolveSocialBrand } from '../data/socialBrands.js';

// The parent supplies an accessible name. SVG paths are trusted bundled assets,
// never user-provided markup, scripts or remote images.
export default function SocialBrandIcon({ platform, size = 24, className = '' }) {
  const brand = resolveSocialBrand(platform);
  if (brand.paths) return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false" data-social-brand={brand.key} className={className}>{brand.paths.map((path, index) => <path key={index} d={path} />)}</svg>;
  const Icon = brand.key === 'website' ? Globe : Link2;
  return <Icon size={size} className={className} aria-hidden="true" data-social-brand={brand.key} />;
}
