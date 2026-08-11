import React from "react";
import { blogPostsClient } from "@/api/blogPostsClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function Blog() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: () => blogPostsClient.list()
  });

  const categoryColors = {
    interior_design: "bg-blue-100 text-blue-800",
    kitchen_design: "bg-green-100 text-green-800",
    office_design: "bg-purple-100 text-purple-800",
    furniture: "bg-orange-100 text-orange-800",
    tips: "bg-pink-100 text-pink-800"
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80"
          alt="Blog"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/80 to-[var(--primary)]/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-white px-4"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4">D16 Interior Blog</h1>
            <p className="text-xl md:text-2xl text-gray-200">
              News, ideas, and inspiration for interior design in Bangladesh
            </p>
          </motion.div>
        </div>
      </div>

      {/* Blog Posts */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-lg text-gray-600 mb-12"
          >
            Make sure you bookmark this page to get updates on new D16 Interior blog posts as soon as they are published!
          </motion.p>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading blog posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No blog posts available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="group h-full overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                    {post.featured_image && (
                      <div className="relative h-56 overflow-hidden">
                        <img 
                          src={post.featured_image} 
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        {post.published_date && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar size={14} className="mr-1" />
                            {format(new Date(post.published_date), 'MMM d, yyyy')}
                          </div>
                        )}
                        {post.category && (
                          <Badge className={categoryColors[post.category] || "bg-gray-100 text-gray-800"}>
                            {post.category.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-[var(--primary)] mb-3 line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                        {post.title}
                      </h3>

                      {post.excerpt && (
                        <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                      )}

                      {post.author && (
                        <div className="flex items-center text-sm text-gray-500 mb-4">
                          <User size={14} className="mr-1" />
                          {post.author}
                        </div>
                      )}

                      <div className="flex items-center text-[var(--accent)] font-semibold group-hover:translate-x-2 transition-transform">
                        Read More <ArrowRight className="ml-2" size={18} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
