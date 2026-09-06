import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Clock, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { BlogCard } from "@/lib/cms/types";

interface FeaturedBlogSectionProps {
  post: BlogCard | null;
}

export function FeaturedBlogSection({ post }: FeaturedBlogSectionProps) {
  if (!post) return null;

  return (
    <section className="py-14 md:py-20 bg-surface border-b border-border-light/60">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-mocha" />
                <p className="text-xs font-bold text-mocha uppercase tracking-[0.2em]">
                  Celebration Journal
                </p>
              </div>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-charcoal font-bold leading-tight">
                Party Planning & Ideas
              </h2>
              <p className="text-text-muted text-sm md:text-base mt-2 max-w-xl">
                Practical guides on kids birthdays, themes, and celebration planning — written for parents who want the best.
              </p>
            </div>

            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-mocha hover:text-mocha-dark bg-white border border-mocha/30 hover:border-mocha px-6 py-3 rounded-full shadow-sm hover:shadow transition-all duration-300 uppercase tracking-wider group shrink-0 w-fit"
            >
              Visit Our Blog
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <Link
            href={`/blog/${post.slug}`}
            className="group flex flex-col md:flex-row bg-white rounded-3xl overflow-hidden border border-border-light shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
          >
            {/* Media side */}
            <div className="w-full md:w-[52%] lg:w-[55%] relative aspect-[16/10] md:aspect-auto min-h-[280px] md:min-h-[380px] overflow-hidden bg-cream-dark">
              {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 55vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-cream-dark text-mocha/40">
                  <BookOpen size={48} />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Floating Top Badge */}
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <span className="bg-charcoal/85 backdrop-blur-md text-white text-xs font-semibold px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                  {post.category || "Celebration Guide"}
                </span>
              </div>
            </div>

            {/* Content side */}
            <div className="w-full md:w-[48%] lg:w-[45%] p-7 md:p-9 lg:p-11 flex flex-col justify-between bg-white">
              <div>
                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-text-muted mb-4">
                  {post.category && (
                    <span className="text-mocha uppercase tracking-wider bg-cream px-3 py-1 rounded-full font-bold">
                      {post.category}
                    </span>
                  )}
                  {post.date && <span>{post.date}</span>}
                  {post.readTime && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-text-muted/30" />
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} className="text-mocha" />
                        {post.readTime}
                      </span>
                    </>
                  )}
                </div>

                <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-charcoal leading-[1.2] mb-4 group-hover:text-mocha transition-colors">
                  {post.title}
                </h3>

                <p className="text-text-muted text-sm md:text-base leading-relaxed line-clamp-3 md:line-clamp-4 mb-6">
                  {post.shortDescription}
                </p>
              </div>

              {/* Action link */}
              <div className="pt-4 border-t border-border-light flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-mocha font-bold text-sm md:text-base group-hover:text-mocha-dark transition-colors">
                  Read Full Article
                  <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1.5" />
                </span>
                <span className="text-xs text-text-light font-medium group-hover:text-charcoal transition-colors">
                  VC Journal &rarr;
                </span>
              </div>
            </div>
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
