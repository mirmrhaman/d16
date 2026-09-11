import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UserCheck, Wallet, Target, Clock, MessageSquare, FileText, Hammer,
  CheckCircle, Home, Building2, Coffee, Hotel, Award, Users, TrendingUp,
  Star, Briefcase, Lightbulb, Rocket, Sparkles, Heart, Image, BarChart3,
  FolderOpen, BookOpen, Phone, UserCog, ShieldCheck, Images, Palette,
  MapPin, Share2,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { safeAboutImage } from '@/data/aboutContent';
import { WEBSITE_ICONS_ID } from '@/data/siteAppearance';

const builtIns = {
  UserCheck, Wallet, Target, Clock, MessageSquare, FileText, Hammer,
  CheckCircle, Home, Building2, Coffee, Hotel, Award, Users, TrendingUp,
  Star, Briefcase, Lightbulb, Rocket, Sparkles, Heart, Image, BarChart3,
  FolderOpen, BookOpen, Phone, UserCog, ShieldCheck, Images, Palette,
  MapPin, Share2,
};

export function IconPreview({ iconName, iconUrl, fallback = 'Sparkles', size = 24, className = '' }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const image = safeAboutImage(iconUrl);
  const Icon = Object.hasOwn(builtIns, iconName) ? builtIns[iconName]
    : Object.hasOwn(builtIns, fallback) ? builtIns[fallback] : Sparkles;

  if (image && image !== failedUrl) return <img
    src={image}
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    style={{ width: size, height: size }}
    className={`inline-block shrink-0 object-contain ${className}`}
    onError={() => setFailedUrl(image)}
  />;
  return <Icon aria-hidden="true" focusable="false" className={className} size={size} />;
}

export default function SiteIcon({ iconKey, fallback = 'Sparkles', size = 24, className = '' }) {
  const { data } = useQuery({
    queryKey: ['websiteIcons'],
    queryFn: () => base44.entities.WebsiteIcons.list(),
    staleTime: 30000,
  });
  const records = Array.isArray(data) ? data : [];
  const record = records.find((entry) => entry.id === WEBSITE_ICONS_ID) || records[0];
  const override = record?.icons && Object.hasOwn(record.icons, iconKey) ? record.icons[iconKey] : undefined;
  return <IconPreview iconName={override?.icon_name} iconUrl={override?.icon_url} fallback={fallback} size={size} className={className} />;
}
