export const SECTION_ACCESS = {
  HeroSlides: ['section.hero_slides.write', '/AdminHeroSlides'],
  Stats: ['section.stats.write', '/AdminStats'],
  Services: ['section.services.write', '/AdminServices'],
  Projects: ['section.projects.write', '/AdminProjects'],
  Blog: ['section.blog_posts.write', '/AdminBlog'],
  Gallery: ['section.gallery.write', '/AdminGallery'],
  PicYourConcept: ['section.pic_your_concept.write', '/AdminPicYourConcept'],
  About: ['section.about.write', '/AdminAbout'],
};
export function canEditSection(user, section, demo = false) {
  if (user?.role === 'admin') return true;
  return user?.role === 'super' && (demo || (user.permissions?.includes('content.write') && user.permissions.includes(SECTION_ACCESS[section]?.[0])));
}
export function adminLanding(user, demo = false) {
  if (user?.role === 'admin') return '/AdminDashboard';
  const allowed = Object.keys(SECTION_ACCESS).find((section) => canEditSection(user, section, demo));
  return allowed ? SECTION_ACCESS[allowed][1] : '/';
}
