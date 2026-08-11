
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { servicesClient } from "@/api/servicesClient";
import { statsClient } from "@/api/statsClient";
import { projectsClient } from "@/api/projectsClient";
import { blogPostsClient } from "@/api/blogPostsClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Image, 
  BarChart3, 
  Briefcase, 
  FolderOpen, 
  BookOpen, 
  MessageSquare,
  ArrowRight,
  Phone,
  UserCog,
  ShieldCheck,
  Images,
  Palette
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    heroSlides: 0,
    stats: 0,
    services: 0,
    projects: 0,
    blogPosts: 0,
    consultations: 0,
    galleryVideos: 0,
    galleryConcepts: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [heroSlides, statsData, services, projects, blogPosts, consultations, galleryVideos, galleryConcepts] = await Promise.all([
          base44.entities.HeroSlide.list(),
          statsClient.list(),
          servicesClient.list(),
          projectsClient.list(),
          blogPostsClient.list(),
          base44.entities.Consultation.list(),
          base44.entities.GalleryVideo.list(),
          base44.entities.GalleryConcept.list()
        ]);

        setStats({
          heroSlides: heroSlides.length,
          stats: statsData.length,
          services: services.length,
          projects: projects.length,
          blogPosts: blogPosts.length,
          consultations: consultations.length,
          galleryVideos: galleryVideos.length,
          galleryConcepts: galleryConcepts.length
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    loadStats();
  }, []);

  const adminSections = [
    {
      title: "Hero Slides",
      description: "Manage homepage hero carousel images and content",
      icon: Image,
      count: stats.heroSlides,
      color: "bg-[var(--primary)]",
      link: createPageUrl("AdminHeroSlides")
    },
    {
      title: "Statistics",
      description: "Update company stats shown on homepage",
      icon: BarChart3,
      count: stats.stats,
      color: "bg-[var(--accent)]",
      link: createPageUrl("AdminStats")
    },
    {
      title: "Services",
      description: "Add and edit service offerings",
      icon: Briefcase,
      count: stats.services,
      color: "bg-[var(--primary-dark)]",
      link: createPageUrl("AdminServices")
    },
    {
      title: "Projects",
      description: "Manage portfolio projects and galleries",
      icon: FolderOpen,
      count: stats.projects,
      color: "bg-[var(--accent)]",
      link: createPageUrl("AdminProjects")
    },
    {
      title: "Gallery",
      description: "Manage gallery videos and design concepts",
      icon: Images,
      count: stats.galleryVideos + stats.galleryConcepts,
      color: "bg-[var(--accent)]",
      link: createPageUrl("AdminGallery")
    },
    {
      title: "Blog Posts",
      description: "Create and manage blog content",
      icon: BookOpen,
      count: stats.blogPosts,
      color: "bg-[var(--accent-dark)]",
      link: createPageUrl("AdminBlog")
    },
    {
      title: "Consultations",
      description: "View and manage consultation requests",
      icon: MessageSquare,
      count: stats.consultations,
      color: "bg-[var(--accent)]",
      link: createPageUrl("AdminConsultations")
    },
    {
      title: "Contact Info",
      description: "Update contact details and locations",
      icon: Phone,
      count: "-",
      color: "bg-[var(--primary-dark)]",
      link: createPageUrl("AdminContactInfo")
    },
    {
      title: "Logo Management",
      description: "Update website logo used across header and footer",
      icon: Image,
      count: "-",
      color: "bg-[var(--accent-dark)]",
      link: createPageUrl("AdminLogo")
    },
    {
      title: "Theme Color",
      description: "Change the site's base brand color",
      icon: Palette,
      count: "-",
      color: "bg-[var(--primary)]",
      link: createPageUrl("AdminTheme")
    },
    {
      title: "User Management",
      description: "Verify emails and assign Admin/Super roles",
      icon: UserCog,
      count: "",
      color: "bg-[var(--primary-dark)]",
      link: createPageUrl("AdminUsers")
    },
    {
      title: "Super User Access",
      description: "Choose which sections Super Users can edit",
      icon: ShieldCheck,
      count: "",
      color: "bg-[var(--primary)]",
      link: createPageUrl("AdminAccessControl")
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--primary)] mb-2 sm:mb-4">Admin Dashboard</h1>
          <p className="text-gray-600 text-base sm:text-lg">Manage your website content and settings</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {adminSections.map((section, index) => (
            <Link key={index} to={section.link}>
              <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 sm:p-3 rounded-lg ${section.color}`}>
                      <section.icon className="text-white" size={20} />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{section.count}</div>
                      <div className="text-xs sm:text-sm text-gray-500">items</div>
                    </div>
                  </div>
                  <CardTitle className="text-lg sm:text-xl mt-3 sm:mt-4">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 line-clamp-2">{section.description}</p>
                  <div className="flex items-center text-[var(--primary)] font-semibold text-sm sm:text-base">
                    Manage <ArrowRight className="ml-2" size={16} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
