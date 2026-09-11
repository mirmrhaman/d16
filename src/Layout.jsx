
import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Briefcase, FolderOpen, Mail, Menu, X, Phone, MapPin, Settings, Users, Images, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contactInfoClient } from "@/api/contactInfoClient";
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Import useQuery
import { useAuth } from "@/context/AuthContext";
import { adminLanding } from '@/api/permissions';
import { IS_DEMO } from '@/api/transport';

const DEFAULT_THEME_COLOR = "#112037";
const DEFAULT_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690395669c778d5c32d51682/5ac5acb53_image.png";

const normalizeHex = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed)) return "";
  const full = trimmed.length === 3 ? trimmed.split("").map((c) => c + c).join("") : trimmed;
  return `#${full.toLowerCase()}`;
};

const hexToRgb = (hex) => {
  const safeHex = normalizeHex(hex).slice(1);
  return {
    r: parseInt(safeHex.slice(0, 2), 16),
    g: parseInt(safeHex.slice(2, 4), 16),
    b: parseInt(safeHex.slice(4, 6), 16),
  };
};

const rgbToHex = (r, g, b) => {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mixHex = (hexA, hexB, ratio = 0.5) => {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    a.r + (b.r - a.r) * clampedRatio,
    a.g + (b.g - a.g) * clampedRatio,
    a.b + (b.b - a.b) * clampedRatio
  );
};

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [brandingNonce, setBrandingNonce] = useState(Date.now());
  const location = useLocation();
  const { user, logout, authError } = useAuth();
  const queryClient = useQueryClient();

  // Fetch contact info
  const { data: contactInfo = [] } = useQuery({
    queryKey: ['contactInfo'],
    queryFn: () => contactInfoClient.list()
  });

  const contact = useMemo(() => contactInfo[0] || {}, [contactInfo]);

  const logoSrc = contact.logo_url || DEFAULT_LOGO_URL;
  const baseThemeColor = normalizeHex(contact.theme_color) || DEFAULT_THEME_COLOR;
  const primaryDark = mixHex(baseThemeColor, "#000000", 0.25);
  const accentColor = mixHex(baseThemeColor, "#ffffff", 0.35);
  const accentDark = mixHex(baseThemeColor, "#000000", 0.12);
  const accentLight = mixHex(baseThemeColor, "#ffffff", 0.88);
  const shadowRgb = hexToRgb(baseThemeColor);
  const phone = contact.phone || '+880 1711 288948';
  const email = contact.email || 'info@d16interior.com';
  const locations = Array.isArray(contact.locations) && contact.locations.length > 0
    ? contact.locations
    : ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi'];
  // An intentionally empty social profile must stay empty after saving.
  const socialLinks = Object.fromEntries(Object.entries(contact.social_links || {}).filter(([, url]) => typeof url === 'string' && /^https?:\/\//i.test(url)));

  useEffect(() => {
    // In this mock setup, admin and super roles both count for admin menu visibility
    setIsAdmin(user?.role === 'admin' || user?.role === 'super');
  }, [user]);

  // Missing branding uses presentation defaults only; browsing never writes data.

  useEffect(() => {
    const refreshBranding = () => {
      setBrandingNonce(Date.now());
      queryClient.invalidateQueries({ queryKey: ['contactInfo'] });
    };

    const handleStorageRefresh = (event) => {
      if (event.key === 'd16_branding_refresh') {
        refreshBranding();
      }
    };

    const handleInTabRefresh = () => {
      refreshBranding();
    };

    window.addEventListener('storage', handleStorageRefresh);
    window.addEventListener('d16-branding-refresh', handleInTabRefresh);

    return () => {
      window.removeEventListener('storage', handleStorageRefresh);
      window.removeEventListener('d16-branding-refresh', handleInTabRefresh);
    };
  }, [queryClient]);

  useEffect(() => {
    // Keep the browser tab/history icon in sync with the logo stored in the database.
    const faviconHref = `${import.meta.env.BASE_URL}d16-favicon.svg?v=1`;

    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "icon");
      document.head.appendChild(link);
    }
    link.setAttribute("href", faviconHref);
    document.title = 'D16';
  }, [brandingNonce]);

  const navigationItems = [
    { title: "Home", url: createPageUrl("Home"), icon: Home },
    { title: "About", url: createPageUrl("About"), icon: Users },
    { title: "Services", url: createPageUrl("Services"), icon: Briefcase },
    { title: "Portfolio", url: createPageUrl("Portfolio"), icon: FolderOpen },
    { title: "Pic Your Concept", url: createPageUrl("PicYourConcept"), icon: Images },
    { title: "Gallery", url: createPageUrl("Gallery"), icon: Images },
    { title: "Blog", url: createPageUrl("Blog"), icon: BookOpen },
    { title: "Contact", url: createPageUrl("Contact"), icon: Mail },
  ];

  const isActive = (url) => location.pathname === url;

  return (
    <div className="min-h-screen bg-white">
      {authError && user && <p role="alert" className="bg-red-50 text-red-800 p-3 text-center">{authError}</p>}
      <style>{`
        :root {
          --primary: ${baseThemeColor};
          --primary-dark: ${primaryDark};
          --accent: ${accentColor};
          --accent-dark: ${accentDark};
          --accent-light: ${accentLight};
          --text: #2c3e50;
          --text-light: #6c757d;
        }
        
        .gradient-text {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .luxury-shadow {
          box-shadow: 0 20px 60px rgba(${shadowRgb.r}, ${shadowRgb.g}, ${shadowRgb.b}, 0.15);
        }
        
        .hover-lift {
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .hover-lift:hover {
          transform: translateY(-8px);
        }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center space-x-3 group">
              <img 
                src={logoSrc}
                alt="D16 Interior"
                className="h-16 w-auto"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center space-x-5">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`text-sm font-medium tracking-wide transition-colors duration-300 ${
                    isActive(item.url)
                      ? 'text-[var(--accent)]'
                      : 'text-gray-200 hover:text-white'
                  }`}
                >
                  {item.title}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to={adminLanding(user, IS_DEMO)}
                  className={`text-sm font-medium tracking-wide transition-colors duration-300 flex items-center gap-2 ${
                    isActive(adminLanding(user, IS_DEMO))
                      ? 'text-[var(--accent)]'
                      : 'text-gray-200 hover:text-white'
                  }`}
                >
                  <Settings size={16} />
                  Admin
                </Link>
              )}
              {user ? (
                <Button variant="outline" onClick={logout}>
                  Logout ({user.role})
                </Button>
              ) : (
                <Link to="/login">
                  <Button variant="outline">Login</Button>
                </Link>
              )}
              <Link to={createPageUrl("Contact")}>
                <Button 
                  className="bg-[var(--accent)] hover:bg-[var(--primary)] text-white hover:shadow-lg transition-all duration-300"
                >
                  Book Consultation
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-[var(--primary-dark)] border-t border-white/10">
            <nav className="px-4 py-4 space-y-3">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.url)
                      ? 'bg-white/10 text-[var(--accent)]'
                      : 'text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.title}</span>
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to={adminLanding(user, IS_DEMO)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(adminLanding(user, IS_DEMO))
                      ? 'bg-white/10 text-[var(--accent)]'
                      : 'text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Settings size={20} />
                  <span className="font-medium">Admin</span>
                </Link>
              )}
              <Button
                onClick={() => {
                  if (user) {
                    logout();
                    setMobileMenuOpen(false);
                  } else {
                    setMobileMenuOpen(false);
                    // navigation handled by anchor
                  }
                }}
                variant="outline"
                className="w-full"
                asChild={!user}
              >
                {user ? 'Logout' : <Link to="/login">Login</Link>}
              </Button>
              <Link to={createPageUrl("Contact")} onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-[var(--accent)] hover:bg-[var(--primary)] text-white">
                  Book Consultation
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <img 
                src={logoSrc}
                alt="D16 Interior"
                className="h-16 w-auto mb-6"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
              />
              <p className="text-gray-300 mb-6 leading-relaxed">
                Leading architectural and interior design firm creating innovative, functional spaces across Bangladesh. 
                We transform visions into architectural masterpieces.
              </p>
              <div className="space-y-2">
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center space-x-2 text-[var(--accent-light)] hover:text-[var(--accent)] transition-colors">
                  <Phone size={18} />
                  <span>{phone}</span>
                </a>
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center space-x-2 text-[var(--accent-light)] hover:text-[var(--accent)] transition-colors">
                    <Mail size={18} />
                    <span>{email}</span>
                  </a>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                {Object.entries(socialLinks).map(([name, url]) => url && (
                  <a key={name} href={url} target="_blank" rel="noreferrer" className="text-[var(--accent-light)] hover:text-white transition-colors">
                    {name[0].toUpperCase() + name.slice(1)}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-6 text-[var(--accent-light)]">Quick Links</h4>
              <ul className="space-y-3">
                {navigationItems.map((item) => (
                  <li key={item.title}>
                    <Link
                      to={item.url}
                      className="text-gray-300 hover:text-white transition-colors duration-300"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Locations */}
            <div>
              <h4 className="text-lg font-semibold mb-6 text-[var(--accent-light)]">Our Locations</h4>
              <ul className="space-y-2 text-gray-300">
                {locations.length > 0 ? (
                  locations.map((location, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <MapPin size={16} className="mt-1 flex-shrink-0" />
                      <span>{location}</span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="flex items-start space-x-2">
                      <MapPin size={16} className="mt-1 flex-shrink-0" />
                      <span>Dhaka</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <MapPin size={16} className="mt-1 flex-shrink-0" />
                      <span>Chittagong</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-12 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} D16 Interior. All rights reserved. Excellence in Architecture & Design.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
