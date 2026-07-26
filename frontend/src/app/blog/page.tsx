import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { placeholderBlogs } from "@/lib/placeholder-data";

export const metadata: Metadata = {
  title: "Celebration Ideas & Tips",
  description: "Read our latest articles on kids birthday party planning, celebration themes, and creative return gift ideas.",
};

const CATEGORIES = ["All topics", "Theme Ideas", "Planning Guide", "Return Gifts", "Activities"];

export default function BlogPage() {
  const featuredPost = placeholderBlogs[0];
  const regularPosts = placeholderBlogs.slice(1);

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-[#FAFAFA] min-h-screen">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          
          {/* Header Section */}
          <ScrollReveal>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10 mb-20">
              <div className="lg:max-w-2xl">
                <p className="text-xs font-bold text-mocha uppercase tracking-widest mb-4 flex items-center gap-2">
                  VC Journal <span className="w-1.5 h-1.5 rounded-full bg-mocha" />
                </p>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-bold leading-[1.1] mb-6">
                  Insights, planning guides, and magical thinking
                </h1>
                <p className="text-text-muted text-lg leading-relaxed max-w-xl">
                  Practical guides on kids birthdays, magical themes, and celebration planning — written for parents who want the best.
                </p>
              </div>

              <div className="w-full lg:max-w-md">
                {/* Search Bar */}
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-text-muted/60" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search articles, tags, topics..."
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-border-light rounded-xl text-sm focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-all shadow-sm"
                  />
                </div>
                {/* Category Pills */}
                <div className="flex flex-wrap gap-2.5">
                  {CATEGORIES.map((cat, i) => (
                    <button
                      key={cat}
                      className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                        i === 0 
                        ? "bg-mocha text-white border-mocha" 
                        : "bg-white text-text-muted border-border-light hover:border-mocha/50 hover:text-charcoal"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Featured Article */}
          <ScrollReveal delay={100}>
            <div className="mb-20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl text-charcoal font-bold">Featured</h2>
                <span className="text-sm text-text-muted">Newest insight</span>
              </div>
              
              <Link href={`/blog/${featuredPost.slug}`} className="group flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden border border-border-light shadow-sm hover:shadow-hover transition-all duration-300">
                <div className="w-full md:w-[55%] relative aspect-[4/3] md:aspect-auto">
                  <Image 
                    src={featuredPost.coverImage} 
                    alt={featuredPost.title} 
                    fill 
                    className="object-cover" 
                    sizes="(max-width: 768px) 100vw, 55vw"
                    priority
                  />
                </div>
                <div className="w-full md:w-[45%] p-8 lg:p-12 flex flex-col justify-center">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-text-muted mb-4">
                    <span className="text-mocha uppercase tracking-wider bg-cream px-3 py-1 rounded-full font-bold">{featuredPost.category}</span>
                    <span>{featuredPost.date}</span>
                    <span className="w-1 h-1 rounded-full bg-text-muted/30" />
                    <span>{featuredPost.readTime}</span>
                  </div>
                  <h3 className="font-display text-3xl lg:text-4xl font-bold text-charcoal leading-[1.2] mb-4 group-hover:text-mocha transition-colors">
                    {featuredPost.title}
                  </h3>
                  <p className="text-text-muted text-base leading-relaxed mb-8 line-clamp-3">
                    {featuredPost.shortDescription}
                  </p>
                  <div className="inline-flex items-center gap-2 text-mocha font-semibold text-sm hover:text-mocha-dark transition-colors mt-auto">
                    Read the featured article <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            </div>
          </ScrollReveal>

          {/* Latest Articles Grid */}
          <ScrollReveal delay={200}>
            <div className="mb-8">
              <h2 className="font-display text-2xl text-charcoal font-bold mb-6">Latest articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {regularPosts.map((post) => (
                  <Link href={`/blog/${post.slug}`} key={post.id} className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-border-light shadow-sm hover:shadow-hover transition-all duration-300 hover:-translate-y-1 h-full">
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      <Image 
                        src={post.coverImage} 
                        alt={post.title} 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover:scale-105" 
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-6 md:p-8 flex flex-col flex-grow">
                      <div className="flex items-center gap-3 text-xs font-medium text-text-muted mb-3">
                        <span className="text-mocha uppercase tracking-wider font-bold bg-cream px-2 py-0.5 rounded-full">{post.category}</span>
                        <span className="w-1 h-1 rounded-full bg-text-muted/30" />
                        <span>{post.date}</span>
                      </div>
                      <h3 className="font-display text-xl font-bold text-charcoal leading-snug mb-3 group-hover:text-mocha transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-text-muted text-sm leading-relaxed line-clamp-2 mb-8">
                        {post.shortDescription}
                      </p>
                      
                      {/* Footer of card */}
                      <div className="mt-auto pt-4 border-t border-border-light/50 flex items-center justify-between text-xs font-medium text-text-muted">
                        <span>{post.readTime}</span>
                        <span className="inline-flex items-center gap-1 group-hover:text-mocha transition-colors text-charcoal font-semibold">
                          Read <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </ScrollReveal>

        </div>
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
