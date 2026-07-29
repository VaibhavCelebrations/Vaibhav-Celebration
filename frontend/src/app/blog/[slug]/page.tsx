import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CTABand } from "@/components/home/CTABand";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getBlogPostBySlug } from "@/lib/cms/blog";
import { sanitizeBlogHtml } from "@/lib/cms/sanitize-html";
import { getPublicSettings, getWhatsAppNumber } from "@/lib/cms/settings";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getBlogPostBySlug(slug);
    return { title: `${post.title} | Vaibhav Celebrations`, description: post.shortDescription };
  } catch {
    return { title: "Post Not Found" };
  }
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;

  let post;
  try {
    post = await getBlogPostBySlug(slug);
  } catch {
    notFound();
  }

  const [settings, whatsappNumber] = await Promise.all([
    getPublicSettings().catch(() => null),
    getWhatsAppNumber().catch(() => ""),
  ]);

  const safeHtml = sanitizeBlogHtml(post.content);

  return (
    <>
      <Navbar />
      <main className="bg-[#FAFAFA] min-h-screen relative pt-32 pb-20">
        <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden opacity-[0.03] pointer-events-none">
          <Image src={post.coverImage} alt="Background texture" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FAFAFA]/50 to-[#FAFAFA]" />
        </div>

        <div className="max-w-4xl mx-auto px-5 md:px-10 relative z-10">
          <ScrollReveal>
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-mocha font-medium mb-12 transition-colors">
              <ArrowLeft size={16} /> Back to Blog
            </Link>
            <div className="mb-6">
              <span className="inline-block px-4 py-1.5 rounded-full bg-cream border border-border-light text-mocha text-xs font-bold uppercase tracking-wider">
                {post.category || "Articles"}
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] text-charcoal font-bold leading-[1.1] mb-8">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-text-muted font-medium pb-8 border-b border-border-light mb-8">
              <div className="flex items-center gap-2"><User size={16} /><span>{post.author}</span></div>
              <div className="flex items-center gap-2"><Calendar size={16} /><span>{post.date}</span></div>
              <div className="flex items-center gap-2"><Clock size={16} /><span>{post.readTime}</span></div>
            </div>
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-12">
                {post.tags.map((tag) => (
                  <span key={tag} className="px-4 py-1.5 rounded-full bg-cream border border-border-light text-mocha text-xs font-medium">{tag}</span>
                ))}
              </div>
            )}
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div
              className="max-w-3xl cms-html-content text-text-muted"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          </ScrollReveal>
        </div>
      </main>
      <CTABand settings={settings ?? undefined} whatsappNumber={whatsappNumber} />
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
