import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = placeholderBlogs.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <>
      {/* We make the Navbar transparent at the top since we have a full-bleed hero image */}
      <Navbar />
      
      <main className="bg-surface min-h-screen">
        {/* Full-width Hero Image with smooth blend into content */}
        <section className="relative w-full h-[60vh] md:h-[70vh] min-h-[400px]">
          <Image 
            src={post.coverImage} 
            alt={post.title} 
            fill 
            className="object-cover" 
            priority
            sizes="100vw"
          />
          {/* Smooth blend gradient that fades into the surface color */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
          
          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="max-w-4xl mx-auto px-5 md:px-10 w-full pb-10 md:pb-16 text-center">
              <ScrollReveal>
                <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-mocha hover:text-mocha-dark font-medium mb-6 transition-colors">
                  <ArrowLeft size={16} /> Back to Blog
                </Link>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-bold leading-tight mb-6">
                  {post.title}
                </h1>
                <p className="text-sm font-medium text-mocha uppercase tracking-widest">
                  {post.date}
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="pb-20 md:pb-32 -mt-4 relative z-10">
          <div className="max-w-3xl mx-auto px-5 md:px-10">
            <ScrollReveal delay={100}>
              <div className="prose prose-lg md:prose-xl prose-p:text-text-muted prose-p:leading-relaxed prose-headings:font-display prose-headings:text-charcoal prose-headings:font-semibold max-w-none whitespace-pre-wrap">
                {post.content}
              </div>
            </ScrollReveal>
          </div>
        </section>

        <CTABand />
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
