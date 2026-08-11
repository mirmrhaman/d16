const _sortData = (items, ordering) => {
  if (!ordering) return [...items]
  const descending = ordering.startsWith('-')
  const key = descending ? ordering.slice(1) : ordering
  return [...items].sort((a, b) => {
    const aVal = a?.[key]
    const bVal = b?.[key]
    if (aVal === bVal) return 0
    if (aVal === undefined) return 1
    if (bVal === undefined) return -1
    return aVal > bVal ? (descending ? -1 : 1) : descending ? 1 : -1
  })
}

const hasLocalStorage = typeof localStorage !== 'undefined';

// LocalStorage-based store for persistence
const createStore = (initial = [], storageKey) => {
  let memoryData = [...initial];

  // Load from localStorage or use initial data
  const loadData = () => {
    if (storageKey && hasLocalStorage) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Error parsing stored data:", e);
        }
      }
    }
    return [...memoryData];
  };

  let data = loadData();
  let nextId = data.reduce((max, item) => {
    const numericId = Number(item.id);
    return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
  }, 0) + 1;

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
        id: nextId++,
        created_date: payload?.created_date || new Date().toISOString(),
      };
      data = [record, ...data];
      saveData();
      return record;
    },
    async update(id, updates) {
      data = loadData();
      data = data.map((item) => (item.id === id ? { ...item, ...updates } : item));
      saveData();
      return data.find((item) => item.id === id);
    },
    async delete(id) {
      data = loadData();
      data = data.filter((item) => item.id !== id);
      saveData();
      return true;
    },
  };
};

const heroSlidesStore = createStore([
  {
    id: 1,
    title: 'Luxury Interior Design',
    subtitle: 'Transforming spaces into extraordinary experiences',
    image: 'https://images.unsplash.com/photo-1616594039964-769c4e75b63d?w=1600&q=80',
    order: 1,
    active: true,
  },
  {
    id: 2,
    title: 'Functional Elegance',
    subtitle: 'Smart, stylish interiors tailored to your lifestyle',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1600&q=80',
    order: 2,
    active: true,
  },
  {
    id: 3,
    title: 'Signature Projects',
    subtitle: 'Award-winning spaces that inspire and delight',
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1600&q=80',
    order: 3,
    active: true,
  },
])

const statsStore = createStore([
  { id: 1, label: 'Projects Completed', value: '120+', icon: 'Award', order: 1 },
  { id: 2, label: 'Happy Clients', value: '95%', icon: 'Users', order: 2 },
  { id: 3, label: 'Years Experience', value: '10+', icon: 'TrendingUp', order: 3 },
])

const servicesStore = createStore([
  {
    id: 1,
    title: 'Residential Interiors',
    description: 'Custom interior design for apartments, villas, and homes across Bangladesh.',
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80',
    features: ['Space planning', 'Material selection', 'Lighting design'],
    order: 1,
  },
  {
    id: 2,
    title: 'Commercial Spaces',
    description: 'Brand-forward office, retail, and hospitality interiors that elevate experiences.',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80',
    features: ['Brand alignment', 'Furniture planning', 'Acoustic solutions'],
    order: 2,
  },
  {
    id: 3,
    title: 'Renovations',
    description: 'Turn-key renovation services with meticulous project management.',
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80',
    features: ['Concept to completion', 'Material sourcing', 'On-site supervision'],
    order: 3,
  },
])

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
])

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
])

const consultationsStore = createStore([
  {
    id: 1,
    full_name: 'Aisha Rahman',
    email: 'aisha@example.com',
    phone: '+880 1711-000000',
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
    theme_color: '#1e3a5f',
  },
], 'd16_contact_info')

const accessControlStore = createStore([
  {
    id: 1,
    allowed_sections: ['HeroSlides', 'Stats', 'Services', 'Projects', 'Blog', 'Gallery'],
  },
])

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

const usersStore = createStore([
  { id: 1, email: 'admin@example.com', name: 'Primary Admin', role: 'admin', verified: true, password: 'admin123', phone: '+8801711000001', two_factor_enabled: true, two_factor_code: '123456' },
  { id: 2, email: 'super@example.com', name: 'Content Editor', role: 'super', verified: true, password: 'super123', phone: '+8801711000002', two_factor_enabled: false, two_factor_code: '123456' },
  { id: 3, email: 'user@example.com', name: 'Viewer', role: 'viewer', verified: false, password: 'changeme123', phone: '+8801711000003', two_factor_enabled: false, two_factor_code: '123456' },
])

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000))

export const base44 = {
  auth: {
    async login({ email, password, otp, otpMethod = 'sms' }) {
      const normalized = (email || '').trim().toLowerCase()
      const user = (await usersStore.list()).find((u) => u.email.toLowerCase() === normalized)
      if (!user) {
          throw new Error('User not found. Ask an admin to invite you.')
      }
      if (!user.verified) {
        throw new Error('Email not verified yet. Please verify before logging in.')
      }
      if (!password || password !== user.password) {
        throw new Error('Invalid email or password.')
      }
      if (user.two_factor_enabled) {
        if (!otp) {
          const code = generateOtp()
          await usersStore.update(user.id, { two_factor_code: code })
          if (otpMethod === 'email') {
            await base44.integrations.Core.SendEmail({
              to: user.email,
              subject: 'Your verification code',
              body: `Your verification code is ${code}`,
            })
            throw new Error('OTP sent to your email. Please enter the code to continue.')
          }
          await base44.integrations.Core.SendSms({
            to: user.phone,
            message: `Your verification code is ${code}`,
          })
          throw new Error('OTP sent to your phone. Please enter the code to continue.')
        }
        if (otp !== user.two_factor_code) {
          throw new Error('Invalid two-factor code.')
        }
      }
      return user
    },
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
      async SendSms({ to, message }) {
        console.log(`SMS to ${to}: ${message}`)
        return { sent: true }
      },
      async SendEmail({ to, subject, body }) {
        console.log(`Email to ${to}: ${subject}\n${body}`)
        return { sent: true }
      },
    },
  },
  entities: {
    HeroSlide: heroSlidesStore,
    Stats: statsStore,
    Service: servicesStore,
    Project: projectsStore,
    BlogPost: blogPostsStore,
    Consultation: consultationsStore,
    ContactInfo: contactInfoStore,
    AccessControl: accessControlStore,
    User: usersStore,
    GalleryVideo: galleryVideosStore,
    GalleryConcept: galleryConceptsStore,
  },
}
