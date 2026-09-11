// Preserve the existing public page as the starting point for the About editor.
// Team profiles are sample content; replace them with approved public profiles.
export const ABOUT_PAGE_ID = '8c3de170-4be7-4e45-9f3d-618d0b20c613';

export const DEFAULT_ABOUT = {
  title: 'About Us',
  subtitle: 'Space meets Style',
  hero_image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80',
  philosophy_title: 'Our Philosophy',
  philosophy_text: 'D16 Interior is an architect-led, design-driven studio focused on personality, comfort, functionality, and timeless aesthetics. At D16 Interior, your space and style come together effortlessly, forming a truly unique environment.',
  philosophy_detail: 'From concept to completion, we deliver end-to-end interior design services with modern, functional, and breathtaking solutions that keep every corner practical, comfortable, and beautiful.',
  mission_summary: 'We turn every space into a statement of elegance, functionality, and your unique taste.',
  philosophy_image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',
  approach_title: 'Our Approach',
  approach_subtitle: 'A proven process that delivers exceptional results',
  approach_steps: [
    { id: 'discovery', icon: 'Lightbulb', title: 'Discovery & Planning', description: 'We start by exploring your goals, style, and lifestyle—shaping a clear direction for a design that fits you perfectly.' },
    { id: 'design', icon: 'Rocket', title: 'Design Development', description: 'Our architects and designers craft detailed concepts, select materials, refine layouts, and create realistic 3D visuals to bring your ideas to life.' },
    { id: 'execution', icon: 'Award', title: 'Execution & Coordination', description: 'From material sourcing to site supervision, we handle every stage of implementation to ensure a smooth, timely, and quality-driven execution.' },
    { id: 'handover', icon: 'Sparkles', title: 'Finishing & Handover', description: 'We refine the final details, style the space, and deliver a complete, polished interior that matches your vision and expectations.' },
  ],
  principles_title: 'Our Vision & Mission',
  principles_subtitle: 'Guiding principles that drive everything we do',
  vision_title: 'Our Vision',
  vision_text: "Creating Spaces That Inspire - At D16 Interior, we envision a world where every space is more than just walls and furniture—it's an experience. We design interiors that seamlessly blend style, functionality, and personality, transforming how people live, work, and feel within their environments.",
  mission_title: 'Our Mission',
  mission_text: 'Transforming Dreams into Reality - Our mission is to bring every idea to life through innovative, sustainable, and personalized design solutions. We are committed to exceptional craftsmanship, attention to detail, and seamless project execution, ensuring every space we create reflects the unique style and lifestyle of our clients.',
  team_title: 'Meet Our Skilled Team',
  team_subtitle: 'The talented professionals behind your dream spaces',
  team_members: [
    { id: 'ahmed-khan', name: 'Ahmed Khan', role: 'Lead Interior Designer', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80' },
    { id: 'sarah-rahman', name: 'Sarah Rahman', role: 'Senior Architect', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80' },
    { id: 'michael-chen', name: 'Michael Chen', role: 'Project Manager', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80' },
    { id: 'fatima-islam', name: 'Fatima Islam', role: 'Design Consultant', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80' },
  ],
};

// An empty saved list is intentional: do not restore deleted profiles or steps.
export function resolveAboutContent(record) {
  const content = { ...DEFAULT_ABOUT, ...(record || {}) };
  for (const [key, fallback] of Object.entries(DEFAULT_ABOUT)) {
    if (typeof fallback === 'string' && typeof content[key] !== 'string') content[key] = fallback;
  }
  content.approach_steps = Array.isArray(record?.approach_steps)
    ? record.approach_steps.filter((step) => step && typeof step.title === 'string' && typeof step.description === 'string')
    : DEFAULT_ABOUT.approach_steps;
  content.team_members = Array.isArray(record?.team_members)
    ? record.team_members.filter((member) => member && typeof member.name === 'string' && typeof member.role === 'string')
    : DEFAULT_ABOUT.team_members;
  return content;
}

export function safeAboutImage(value) {
  if (typeof value !== 'string' || !value) return undefined;
  // Demo uploads are locally generated raster data URLs, never executable SVG.
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/]+=*$/i.test(value)) return value;
  if (value.length > 2048 || value.includes('\\') || [...value].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) return undefined;
  if (/^\/uploads\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp)$/i.test(value)) return value;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
