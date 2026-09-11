import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { readPublishedPosts } from "./blogData";
import { createPageUrl } from "@/utils";

export default function BlogDetail() {
  const { postId } = useParams();
  const { data: posts = [], isLoading, error, refetch } = useQuery({ queryKey: ["blogPosts", "public"], queryFn: readPublishedPosts });
  const post = posts.find((item) => String(item.id) === postId);
  if (isLoading) return <p role="status" className="px-4 py-24 text-center text-gray-600">Loading article…</p>;
  if (error) return <div role="alert" className="px-4 py-24 text-center"><p className="mb-5 text-gray-600">We couldn’t load this article.</p><button type="button" onClick={() => refetch()} className="rounded-md bg-[var(--primary)] px-6 py-3 font-semibold text-white">Try again</button></div>;
  if (!post) return <div className="px-4 py-24 text-center"><h1 className="mb-5 text-3xl font-bold text-[var(--primary)]">Article not found</h1><Link to={createPageUrl("Blog")} className="font-semibold text-[var(--primary)] underline">Back to the blog</Link></div>;
  return <article className="bg-white pb-20"><header className="bg-[var(--primary)] py-16 text-white"><div className="mx-auto max-w-4xl px-4 sm:px-6"><Link to={createPageUrl("Blog")} className="mb-6 inline-flex items-center gap-2 text-white/85 hover:text-white"><ArrowLeft size={18} />Back to Blog</Link><h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl">{post.title}</h1><div className="flex flex-wrap gap-5 text-sm text-gray-200"><span className="inline-flex items-center gap-2"><Calendar size={16} />{format(new Date(post.published_date || post.published_at), "MMMM d, yyyy")}</span>{post.author && <span className="inline-flex items-center gap-2"><User size={16} />{post.author}</span>}</div></div></header><div className="mx-auto max-w-4xl px-4 sm:px-6">{post.featured_image && <img src={post.featured_image} alt={post.title} className="my-10 aspect-[16/9] w-full rounded-2xl object-cover" />}{post.excerpt && <p className="my-8 text-xl leading-relaxed text-[var(--primary)]">{post.excerpt}</p>}<div className="space-y-6 text-lg leading-relaxed text-gray-700">{post.content ? String(post.content).split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>) : <p>More details will be added to this article soon. Contact our team to discuss these ideas for your own space.</p>}</div><Link to={createPageUrl("Contact")} className="mt-12 inline-flex rounded-md bg-[var(--primary)] px-6 py-3 font-semibold text-white hover:bg-[var(--primary-dark)]">Discuss Your Project</Link></div></article>;
}
