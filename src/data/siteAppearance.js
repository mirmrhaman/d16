// Explicit, pig-free built-in options. Custom files must be approved public artwork.
export const ICON_NAMES = [
  'UserCheck', 'Wallet', 'Target', 'Clock', 'MessageSquare', 'FileText', 'Hammer',
  'CheckCircle', 'Home', 'Building2', 'Coffee', 'Hotel', 'Award', 'Users',
  'TrendingUp', 'Star', 'Briefcase', 'Lightbulb', 'Rocket', 'Sparkles', 'Heart',
  'Image', 'BarChart3', 'FolderOpen', 'BookOpen', 'Phone', 'UserCog',
  'ShieldCheck', 'Images', 'Palette', 'MapPin', 'Share2',
];

export const DASHBOARD_LAYOUT_ID = '79310606-6485-4cc3-ab09-d99d08d67f5e';
export const WEBSITE_ICONS_ID = 'fb68d11f-55bc-4e6b-942f-f784dcb0c912';
export const DEFAULT_DASHBOARD_LAYOUT = { title: 'Admin dashboard layout', card_order: [] };
export const DEFAULT_WEBSITE_ICONS = { title: 'Website icons', icons: {} };

const group = (name, entries) => entries.map(([key, label, icon]) => ({ key, label, icon, group: name }));
export const STATIC_ICON_SLOTS = [
  ...group('Home — Why Choose Us', [
    ['values.personalized', 'Personalized Design Approach', 'UserCheck'],
    ['values.budget', 'Practical & Budget-Friendly Solutions', 'Wallet'],
    ['values.detail', 'Detail-Oriented & Style-Driven', 'Target'],
    ['values.delivery', 'On-Time Project Delivery', 'Clock'],
  ]),
  ...group('Home — Our Process', [
    ['process.consultation', 'Initial Consultation', 'MessageSquare'],
    ['process.design', 'Design Development', 'FileText'],
    ['process.execution', 'Project Execution', 'Hammer'],
    ['process.handover', 'Final Handover', 'CheckCircle'],
  ]),
  ...group('Home — Architectural Services', [
    ['services.residential', 'Residential Architecture', 'Home'],
    ['services.commercial', 'Commercial Architecture', 'Building2'],
    ['services.hospitality', 'Hospitality Design', 'Coffee'],
    ['services.mixed', 'Mixed-Use Developments', 'Hotel'],
  ]),
  ...group('About — Mission & Vision', [
    ['about.vision', 'Our Vision', 'Target'],
    ['about.mission', 'Our Mission', 'Heart'],
  ]),
  ...group('Admin Dashboard', [
    ['dashboard.AdminAbout', 'About Us & Team', 'BookOpen'],
    ['dashboard.AdminHistory', 'Change History', 'ShieldCheck'],
    ['dashboard.AdminHeroSlides', 'Hero Slides', 'Image'],
    ['dashboard.AdminStats', 'Statistics', 'BarChart3'],
    ['dashboard.AdminServices', 'Services', 'Briefcase'],
    ['dashboard.AdminProjects', 'Projects', 'FolderOpen'],
    ['dashboard.AdminGallery', 'Gallery', 'Images'],
    ['dashboard.AdminPicYourConcept', 'Pic Your Concept', 'Images'],
    ['dashboard.AdminBlog', 'Blog Posts', 'BookOpen'],
    ['dashboard.AdminConsultations', 'Consultations', 'MessageSquare'],
    ['dashboard.AdminContactInfo', 'Contact Info', 'Phone'],
    ['dashboard.AdminLogo', 'Logo Management', 'Image'],
    ['dashboard.AdminLocations', 'Locations', 'MapPin'],
    ['dashboard.AdminSocialMedia', 'Social Media Links', 'Share2'],
    ['dashboard.AdminTheme', 'Theme Color', 'Palette'],
    ['dashboard.AdminUsers', 'User Management', 'UserCog'],
    ['dashboard.AdminAccessControl', 'Super User Access', 'ShieldCheck'],
    ['dashboard.AdminIcons', 'Website Icons', 'Sparkles'],
    ['dashboard.AdminNavigation', 'Website Tabs', 'FolderOpen'],
  ]),
];
