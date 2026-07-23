import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CTABand } from "@/components/home/CTABand";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { placeholderBlogs } from "@/lib/placeholder-data";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = placeholderBlogs.find((p) => p.slug === slug);
  if (!post) return { title: "Post Not Found" };
  return { title: `${post.title} | Vaibhav Celebrations`, description: post.shortDescription };
}

// Simple text formatter to handle basic markdown-like blockquotes and headings
function formatContent(content: string) {
  return content.split('\n\n').map((paragraph, idx) => {
    if (paragraph.startsWith('>')) {
      return (
        <blockquote key={idx} className="border-l-[3px] border-mocha pl-6 py-2 my-8 text-xl md:text-2xl font-display italic text-charcoal bg-mocha/5 rounded-r-xl">
          {paragraph.replace(/^>\s*/, '')}
        </blockquote>
      );
    }
    if (paragraph.startsWith('###')) {
      return (
        <h3 key={idx} className="font-display text-2xl md:text-3xl font-bold text-charcoal mt-10 mb-4">
          {paragraph.replace(/^###\s*/, '')}
        </h3>
      );
    }
    if (paragraph.startsWith('##')) {
      return (
        <h2 key={idx} className="font-display text-3xl md:text-4xl font-bold text-charcoal mt-12 mb-6">
          {paragraph.replace(/^##\s*/, '')}
        </h2>
      );
    }
    if (paragraph.match(/^\d+\./)) {
      return (
        <p key={idx} className="mb-4 text-text-muted leading-relaxed text-lg md:text-xl pl-4 relative">
          <span className="absolute left-0 top-1 text-mocha font-bold text-sm">•</span>
          {paragraph.replace(/^\d+\.\s*/, '')}
        </p>
      );
    }
    return (
      <p key={idx} className="mb-6 text-text-muted leading-relaxed text-lg md:text-xl">
        {paragraph}
      </p>
    );
  });
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = placeholderBlogs.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <>
      <Navbar />
      
      <main className="bg-[#FAFAFA] min-h-screen relative pt-32 pb-20">
        {/* Subtle Faded Background Image */}
        <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden opacity-[0.03] pointer-events-none">
          <Image 
            src={post.coverImage} 
            alt="Background texture" 
            fill 
            className="object-cover" 
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FAFAFA]/50 to-[#FAFAFA]" />
        </div>

        <div className="max-w-4xl mx-auto px-5 md:px-10 relative z-10">
          
          <ScrollReveal>
            {/* Breadcrumb */}
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-mocha font-medium mb-12 transition-colors">
              <ArrowLeft size={16} /> Back to Blog
            </Link>

            {/* Category Pill */}
            <div className="mb-6">
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider">
                {post.category || "Cost Guides"}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] text-charcoal font-bold leading-[1.1] mb-8">
              {post.title}
            </h1>

            {/* Meta Info Row */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-text-muted font-medium pb-8 border-b border-border-light mb-8">
              <div className="flex items-center gap-2">
                <User size={16} />
                <span>{post.author || "Affor Technologies"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{post.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{post.readTime || "16 min read"}</span>
              </div>
            </div>

            {/* Tags Row */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-12">
                {post.tags.map((tag) => (
                  <span key={tag} className="px-4 py-1.5 rounded-full bg-blue-50/50 border border-blue-100 text-blue-500 text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </ScrollReveal>

          {/* Content Section */}
          <ScrollReveal delay={100}>
            <div className="max-w-3xl">
              {formatContent(post.content)}
            </div>
          </ScrollReveal>

        </div>
      </main>

      <CTABand />
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
