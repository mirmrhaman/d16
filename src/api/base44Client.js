import { IS_DEMO, createApiEntity, requestJson } from './transport.js';
import { LIVE_SERVICES, LIVE_CONCEPTS } from '../data/liveContent.js';
import { ABOUT_PAGE_ID, DEFAULT_ABOUT } from '../data/aboutContent.js';
import { DASHBOARD_LAYOUT_ID, WEBSITE_ICONS_ID, DEFAULT_DASHBOARD_LAYOUT, DEFAULT_WEBSITE_ICONS } from '../data/siteAppearance.js';
import { NAVIGATION_MENU_ID, DEFAULT_NAVIGATION_MENU, isCustomPageDestination, validateNavigationItems, validateNavigationSettings } from '../data/navigation.js';
import { validateCustomPage, isPublishedCustomPage } from '../../server/src/customPageSchema.js';
import { validateSocialLinks, validateFloatingSocial, normalizeSocialMedia } from '../../server/src/socialMediaSchema.js';

const hasLocalStorage = typeof localStorage !== 'undefined';

// LocalStorage-based store for persistence
const createStore = (initial = [], storageKey, migrateStoredData) => {
  // Separate demo data from legacy browser edits; never replace those old keys.
  storageKey = storageKey ? `${storageKey}_demo_v2` : undefined;
  let memoryData = [...initial];

  // Load from localStorage or use initial data
  const loadData = () => {
    if (storageKey && hasLocalStorage) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!Array.isArray(parsed)) return [...initial];
          return migrateStoredData ? migrateStoredData(parsed, initial) : parsed;
        } catch (e) {
          console.error("Error parsing stored data:", e);
        }
      }
    }
    return [...memoryData];
  };

  let data = loadData();
  const saveData = () => {
    if (storageKey && hasLocalStorage) {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } else {
      memoryData = [...data];
    }
  };

  return {
    async list(ordering) {
      data = loadData(); // Reload from localStorage
      if (!ordering) return [...data];
      const descending = ordering.startsWith('-');
      const key = descending ? ordering.slice(1) : ordering;
      return [...data].sort((a, b) => {
        const aVal = a?.[key];
        const bVal = b?.[key];
        if (aVal === bVal) return 0;
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;
        return aVal > bVal ? (descending ? -1 : 1) : descending ? 1 : -1;
      });
    },
    async create(payload) {
      data = loadData();
      const record = {
        ...payload,
        id: crypto.randomUUID(),
        created_date: payload?.created_date || new Date().toISOString(),
      };
      data = [record, ...data];
      saveData();
      return record;
    },
    async update(id, updates) {
      data = loadData();
      if (!data.some((item) => String(item.id) === String(id))) throw new Error('Record not found.');
      data = data.map((item) => (String(item.id) === String(id) ? { ...item, ...updates, id: item.id, updated_at: new Date().toISOString() } : item));
      saveData();
      return data.find((item) => String(item.id) === String(id));
    },
    async delete(id) {
      data = loadData();
      data = data.filter((item) => String(item.id) !== String(id));
      saveData();
      return true;
    },
  };
};

const heroSlidesStore = createStore([
  {
    id: 1,
    title: 'Residence Interior Design',
    subtitle: 'Crafting warm, stylish homes that reflect who you are',
    image: 'https://images.unsplash.com/photo-1616594039964-769c4e75b63d?w=1600&q=80',
    order: 1,
    active: true,
  },
  {
    id: 2,
    title: 'Commercial Space Interior Design',
    subtitle: 'Where brand identity meets modern interior excellence',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1600&q=80',
    order: 2,
    active: true,
  },
  {
    id: 3,
    title: 'Curated Furniture & Decor',
    subtitle: 'Furniture & Decor that Speaks Your Style',
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1600&q=80',
    order: 3,
    active: true,
  },
], 'd16_hero_slides')

const statsStore = createStore([
  { id: 1, label: 'Projects Completed', value: '120+', icon: 'Award', order: 1 },
  { id: 2, label: 'Happy Clients', value: '95%', icon: 'Users', order: 2 },
  { id: 3, label: 'Years Experience', value: '10+', icon: 'TrendingUp', order: 3 },
], 'd16_stats')

const projectsStore = createStore([
  {
    id: 1,
    title: 'Gulshan Residence',
    category: 'residential',
    project_type: 'Apartment',
    style: 'Modern Luxe',
    area: '2,500 sq ft',
    location: 'Dhaka, Bangladesh',
    description: 'A calm, layered home with warm lighting and bespoke millwork.',
    featured_image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80',
  },
  {
    id: 2,
    title: 'Corporate HQ',
    category: 'commercial',
    project_type: 'Office',
    style: 'Contemporary',
    area: '8,000 sq ft',
    location: 'Dhaka, Bangladesh',
    description: 'A collaborative office with flexible zones and acoustic focus rooms.',
    featured_image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80',
  },
  {
    id: 3,
    title: 'Cafe Botanica',
    category: 'restaurant_cafe',
    project_type: 'Cafe',
    style: 'Biophilic',
    area: '1,200 sq ft',
    location: 'Chittagong, Bangladesh',
    description: 'Green-filled café with natural textures and layered lighting.',
    featured_image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80',
  },
], 'd16_projects')

const blogPostsStore = createStore([
  {
    id: 1,
    title: 'Interior Design Trends for 2025',
    excerpt: 'Soft minimalism, eco-conscious materials, and warm metallics are defining this year’s interiors.',
    category: 'interior_design',
    featured_image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80',
    author: 'D16 Studio',
    published_date: '2024-12-15T00:00:00Z',
  },
  {
    id: 2,
    title: 'Designing Efficient Workspaces',
    excerpt: 'How to balance collaboration and focus zones in modern offices.',
    category: 'office_design',
    featured_image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80',
    author: 'D16 Studio',
    published_date: '2024-11-20T00:00:00Z',
  },
], 'd16_blog_posts')

const consultationsStore = createStore([
  {
    id: 1,
    full_name: 'Sample Client (Demo)',
    email: 'sample-client@example.invalid',
    phone: '0000000000',
    project_type: 'Residential',
    location: 'Dhaka',
    budget: '$30,000 - $50,000',
    message: 'Looking to redesign our living room and kitchen.',
    status: 'pending',
    created_date: '2024-12-20T00:00:00Z',
  },
])

const contactInfoStore = createStore([
  {
    id: 1,
    phone: '+880 1711 288948',
    email: 'info@d16interior.com',
    address: 'Dhaka, Bangladesh',
    working_hours: 'Mon - Sat: 9:00 AM - 6:00 PM',
    locations: ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi'],
    logo_url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690395669c778d5c32d51682/5ac5acb53_image.png',
    theme_color: '#112037',
  },
], 'd16_contact_info')

const contactVersion = (record) => Number.isSafeInteger(record.version) && record.version > 0 ? record.version : 1;
const normalizedContact = (record) => ({ ...record, ...normalizeSocialMedia(record), version: contactVersion(record) });
const contactInfoDemo = {
  async list(ordering) { return (await contactInfoStore.list(ordering)).map(normalizedContact); },
  async create(payload) {
    const social_links = validateSocialLinks(payload.social_links);
    const floating_social = validateFloatingSocial(payload.floating_social, social_links);
    return normalizedContact(await contactInfoStore.create({ ...payload, social_links, floating_social, version: 1 }));
  },
  async update(id, payload) {
    const saved = (await contactInfoStore.list()).find((record) => String(record.id) === String(id));
    if (!saved) throw Object.assign(new Error('Contact profile not found.'), { status: 404 });
    const socialWrite = Object.hasOwn(payload, 'social_links') || Object.hasOwn(payload, 'floating_social');
    const version = contactVersion(saved);
    if (socialWrite && (!Number.isSafeInteger(payload.version) || payload.version < 1)) throw Object.assign(new Error('Reload the saved social media settings before saving.'), { status: 400 });
    if (payload.version != null && Number(payload.version) !== version) throw Object.assign(new Error('Contact info changed in another preview tab. Reload before saving.'), { status: 409 });
    const updates = { ...payload, version: version + 1 };
    if (socialWrite) {
      const merged = { ...normalizedContact(saved), ...payload };
      updates.social_links = validateSocialLinks(merged.social_links);
      updates.floating_social = validateFloatingSocial(merged.floating_social, updates.social_links);
    }
    return normalizedContact(await contactInfoStore.update(id, updates));
  },
  async delete() { throw Object.assign(new Error('Contact profile deletion is not supported.'), { status: 405 }); },
};

const accessControlStore = createStore([
  {
    id: 1,
    allowed_sections: ['HeroSlides', 'Stats', 'Services', 'Projects', 'Blog', 'Gallery', 'PicYourConcept', 'About'],
  },
])

// Furniture concepts shown on the dedicated "Pic Your Concept" section.
// They use the same local persistence model as the rest of the content so an
// admin can safely add, edit, or remove items without needing a remote API.
// Gallery Videos Store
const galleryVideosStore = createStore([
  {
    id: 1,
    title: "Luxury Apartment Tour",
    thumbnail: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80",
    video_url: "",
    duration: "4:32",
    category: "Residential"
  },
  {
    id: 2,
    title: "Modern Office Space",
    thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
    video_url: "",
    duration: "3:45",
    category: "Commercial"
  },
  {
    id: 3,
    title: "Rooftop Restaurant Design",
    thumbnail: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80",
    video_url: "",
    duration: "5:18",
    category: "Restaurant"
  },
  {
    id: 4,
    title: "Villa Interior Walkthrough",
    thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
    video_url: "",
    duration: "6:02",
    category: "Residential"
  }
], 'd16_gallery_videos')

// Gallery Concepts Store
const galleryConceptsStore = createStore([
  {
    id: "modern",
    title: "Modern Minimalist",
    description: "Clean lines, neutral colors, and functional spaces",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80",
    features: ["Clean aesthetics", "Neutral palette", "Open spaces", "Functional furniture"],
    order: 1
  },
  {
    id: "classic",
    title: "Classic Elegant",
    description: "Timeless sophistication with rich textures",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80",
    features: ["Rich colors", "Traditional elements", "Quality materials", "Ornate details"],
    order: 2
  },
  {
    id: "scandinavian",
    title: "Scandinavian",
    description: "Hygge-inspired cozy and natural design",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80",
    features: ["Natural light", "Wood elements", "Cozy textures", "Simple functionality"],
    order: 3
  },
  {
    id: "industrial",
    title: "Industrial Chic",
    description: "Urban edge with raw materials",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
    features: ["Exposed elements", "Metal accents", "Open brick", "Vintage touches"],
    order: 4
  },
  {
    id: "contemporary",
    title: "Contemporary",
    description: "Current trends with bold statements",
    image: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=600&q=80",
    features: ["Bold colors", "Unique shapes", "Artistic elements", "Dynamic spaces"],
    order: 5
  },
  {
    id: "traditional",
    title: "Traditional",
    description: "Cultural heritage with warm aesthetics",
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&q=80",
    features: ["Cultural elements", "Warm colors", "Classic furniture", "Decorative accents"],
    order: 6
  }
], 'd16_gallery_concepts')

const servicesStore = createStore(LIVE_SERVICES, 'd16_services');
const aboutPageStore = createStore([{ ...DEFAULT_ABOUT, id: ABOUT_PAGE_ID }], 'd16_about_page');
const dashboardLayoutStore = createStore([{ ...DEFAULT_DASHBOARD_LAYOUT, id: DASHBOARD_LAYOUT_ID }], 'd16_dashboard_layout');
const websiteIconsStore = createStore([{ ...DEFAULT_WEBSITE_ICONS, id: WEBSITE_ICONS_ID }], 'd16_website_icons');
const customPagesStore = createStore([], 'd16_custom_pages');
const customPagesClient = {
  async list({ admin = false } = {}) {
    const pages = await customPagesStore.list();
    return admin ? pages : pages.filter(isPublishedCustomPage);
  },
  async create(payload) {
    return customPagesStore.create({ ...validateCustomPage(payload, { allowDataImages: true }), version: 1 });
  },
  async update(id, payload) {
    const saved = (await customPagesStore.list()).find((page) => page.id === id);
    if (!saved) throw Object.assign(new Error('Page not found. Reload the page list.'), { status: 404 });
    if (!Number.isSafeInteger(payload.version) || payload.version < 1) throw Object.assign(new Error('A saved page version is required.'), { status: 400 });
    if (payload.version !== saved.version) throw Object.assign(new Error('This page changed in another tab. Reload before saving.'), { status: 409 });
    return customPagesStore.update(id, { ...validateCustomPage({ ...saved, ...payload }, { allowDataImages: true }), version: saved.version + 1 });
  },
  async delete() { throw Object.assign(new Error('Unpublish this page instead. Its content is kept for future editing.'), { status: 405 }); },
};
const navigationMenuStore = createStore([{ ...DEFAULT_NAVIGATION_MENU, id: NAVIGATION_MENU_ID, version: 1 }], 'd16_navigation_menu');
const validatedMenuItems = async (items) => {
  const normalized = validateNavigationItems(items);
  const pages = await customPagesStore.list();
  if (normalized.some((item) => isCustomPageDestination(item.page) && !pages.some((page) => page.id === item.page.slice(7)))) {
    throw Object.assign(new Error('A custom page in this menu no longer exists. Remove its tab or reload the page list.'), { status: 400 });
  }
  return normalized;
};
const navigationMenuClient = {
  async list() {
    return (await navigationMenuStore.list()).map((record) => ({ ...record, ...validateNavigationSettings(record), items: validateNavigationItems(record.items), version: Number.isSafeInteger(record.version) && record.version > 0 ? record.version : 1 }));
  },
  async create(payload) {
    // Seeded demo configuration is always a singleton, including after all links
    // have intentionally been removed. Never create a second menu record.
    const [saved] = await navigationMenuStore.list();
    if (saved) throw new Error('Website tabs already exist. Reload the saved version before editing.');
    return navigationMenuStore.create({ title: DEFAULT_NAVIGATION_MENU.title, ...validateNavigationSettings(payload), items: await validatedMenuItems(payload.items), version: 1 });
  },
  async update(id, payload) {
    const saved = (await navigationMenuClient.list()).find((record) => record.id === id);
    if (!saved) throw new Error('Website tabs were not found. Reload the saved version.');
    if (!Number.isSafeInteger(payload.version) || payload.version < 1) throw Object.assign(new Error('Reload the saved website tabs before saving.'), { status: 400 });
    if (payload.version !== saved.version) throw Object.assign(new Error('Website tabs changed in another preview tab. Reload before saving.'), { status: 409 });
    const merged = { ...saved, ...payload };
    return navigationMenuStore.update(id, { title: DEFAULT_NAVIGATION_MENU.title, ...validateNavigationSettings(merged), items: await validatedMenuItems(merged.items), version: saved.version + 1 });
  },
  async delete() { throw new Error('Remove individual tabs or reset the menu instead.'); },
};
const picYourConceptStore = createStore(LIVE_CONCEPTS, 'd16_pic_your_concept');
const usersStore = createStore([], 'd16_demo_users');
const demoUser = { id: 'demo-preview', name: 'Local preview', role: 'admin', permissions: [] };

const demoClient = {
  auth: {
    async login() { sessionStorage.setItem('d16_demo_session', 'preview'); return demoUser; },
    async me() { return sessionStorage.getItem('d16_demo_session') ? demoUser : null; },
    async logout() { sessionStorage.removeItem('d16_demo_session'); },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (!file) {
          return { file_url: '' }
        }

        // In local mock mode, return actual file content so uploaded images render correctly.
        if (typeof FileReader !== 'undefined') {
          const fileUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(new Error('Failed to read selected file'))
            reader.readAsDataURL(file)
          })

          return { file_url: typeof fileUrl === 'string' ? fileUrl : '' }
        }

        const fileLabel = file?.name ? encodeURIComponent(file.name) : 'uploaded-file'
        return { file_url: `https://via.placeholder.com/1200x800?text=${fileLabel}` }
      },
      async SendSms() {
        throw new Error('SMS delivery is not configured. No message was sent.');
      },
      async SendEmail() {
        throw new Error('Email delivery is not configured. No message was sent.');
      },
    },
  },
  entities: {
    CustomPage: customPagesClient,
    NavigationMenu: navigationMenuClient,
    DashboardLayout: dashboardLayoutStore,
    WebsiteIcons: websiteIconsStore,
    AboutPage: aboutPageStore,
    HeroSlide: heroSlidesStore,
    Stats: statsStore,
    Service: servicesStore,
    Project: projectsStore,
    BlogPost: blogPostsStore,
    Consultation: consultationsStore,
    ContactInfo: contactInfoDemo,
    AccessControl: accessControlStore,
    User: usersStore,
    GalleryVideo: galleryVideosStore,
    GalleryConcept: galleryConceptsStore,
    PicYourConcept: picYourConceptStore,
  },
}

const endpoints = { NavigationMenu: 'navigation-menu', DashboardLayout: 'dashboard-layout', WebsiteIcons: 'website-icons', AboutPage: 'about-page', HeroSlide: 'hero-slides', Stats: 'stats', Service: 'services', Project: 'projects', BlogPost: 'blog-posts', Consultation: 'consultations', ContactInfo: 'contact-info', User: 'users', GalleryVideo: 'gallery-videos', GalleryConcept: 'gallery-concepts', PicYourConcept: 'pic-your-concept', AuditLog: 'audit-logs' };
const realClient = {
  entities: { ...Object.fromEntries(Object.entries(endpoints).map(([name, path]) => [name, createApiEntity(path)])), AccessControl: createApiEntity('access-control'), CustomPage: {
    ...createApiEntity('custom-pages'),
    async list({ admin = false } = {}) {
      const response = await requestJson(`/custom-pages${admin ? '?admin=1' : ''}`);
      const pages = response?.data ?? response;
      if (!Array.isArray(pages)) throw new Error('The database service returned an invalid page list.');
      return pages;
    },
  } },
  auth: {
    async login(credentials) { const data = await requestJson('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }); return data.user ?? data.data ?? data; },
    async me() { try { const data = await requestJson('/auth/me'); return data.user ?? data.data ?? data; } catch (error) { if (error.status === 401) return null; throw error; } },
    async logout() { await requestJson('/auth/logout', { method: 'POST', body: '{}' }); },
  },
  integrations: { Core: {
    ...demoClient.integrations.Core,
    async UploadFile({ file }) {
      if (!file || file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
      const buffer = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (const byte of buffer) binary += String.fromCharCode(byte);
      return requestJson('/uploads', { method: 'POST', body: JSON.stringify({ filename: file.name, content_type: file.type, data_base64: btoa(binary) }) });
    },
  } },
};

// Personal information and credentials must never be persisted to browser storage.
demoClient.entities.Consultation = {
  async list() { return consultationsStore.list(); },
  async create() { throw new Error('This is a local preview. Connect the QA API before sending personal information; nothing was submitted.'); },
  async update() { throw new Error('Consultation updates require the QA API.'); },
};
demoClient.entities.User = { async list() { return []; }, async create() { throw new Error('Account management requires the QA API.'); }, async update() { throw new Error('Account management requires the QA API.'); } };
demoClient.entities.AuditLog = { async list() { return []; } };
export const base44 = IS_DEMO ? demoClient : realClient;
