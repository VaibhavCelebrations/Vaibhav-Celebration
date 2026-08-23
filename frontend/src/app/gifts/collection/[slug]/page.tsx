import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ProductCard } from "@/components/ecom/ProductCard";
import * as shopApi from "@/lib/shop-api";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const collection = await shopApi.getProductCollectionBySlug(slug);
    return {
      title: `${collection.title} | Vaibhav Celebration`,
      description: collection.description || `Browse the ${collection.title} collection at Vaibhav Celebration.`,
    };
  } catch {
    return { title: "Collection Not Found" };
  }
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  let collection;
  try {
    collection = await shopApi.getProductCollectionBySlug(slug);
  } catch {
    notFound();
  }

  if (!collection.isActive) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col pt-20">
      <Navbar />

      <section className="relative w-full h-[40vh] md:h-[50vh] min-h-[300px] flex items-center justify-center bg-charcoal overflow-hidden">
        {collection.heroImage?.url ? (
          <Image
            src={collection.heroImage.url}
            alt={collection.title}
            fill
            className="object-cover opacity-50"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal to-mocha opacity-90" />
        )}

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="flex items-center justify-center gap-2 text-stone-300 text-sm mb-4 font-medium uppercase tracking-widest">
              <Link href="/gifts" className="hover:text-gold transition-colors">Gifts</Link>
              <ChevronRight size={14} />
              <span className="text-stone-100">{collection.title}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif text-stone-50 mb-4">{collection.title}</h1>
            {typeof collection.description === "string" && collection.description && (
              <p className="text-lg text-stone-200 max-w-2xl mx-auto font-light">
                {collection.description}
              </p>
            )}
          </ScrollReveal>
        </div>
      </section>

      <section className="flex-1 py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {collection.products.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-2xl font-serif text-charcoal mb-3">No products available</h3>
              <p className="text-text-muted mb-8">This collection doesn&apos;t have any products yet.</p>
              <Link href="/gifts" className="btn-primary">
                Browse All Gifts
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
              {collection.products.map((product, idx) => (
                <ScrollReveal key={product.id} delay={idx * 0.05}>
                  <ProductCard product={product} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <FooterClient />
      <WhatsAppFAB />
    </main>
  );
}
