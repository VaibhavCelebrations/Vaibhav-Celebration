"use client";

import { useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingCart, Heart, Share2, Check } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ProductCard } from "@/components/ecom/ProductCard";
import { getProductBySlug, placeholderProducts } from "@/lib/ecom-placeholder-data";
import { getStockStatus, getMaxPurchasable } from "@/lib/ecom-types";
import type { PersonalizationValue } from "@/lib/ecom-types";
import { useCart } from "@/context/cart-context";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { slug } = use(params);
  const product = getProductBySlug(slug);

  const { addItem, openCart, getItemQuantity } = useCart();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [personalization, setPersonalization] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addedToCart, setAddedToCart] = useState(false);

  if (!product) {
    return (
      <>
        <Navbar />
        <main className="pt-36 pb-24 text-center min-h-screen">
          <h1 className="font-display text-3xl font-bold text-charcoal">Product Not Found</h1>
          <Link href="/gifts" className="btn-primary px-8 py-3 mt-8 inline-flex text-sm">
            Back to Gifts
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const stockStatus = getStockStatus(product);
  const maxPurchasable = getMaxPurchasable(product);
  const inCart = getItemQuantity(product.id);
  const relatedProducts = placeholderProducts
    .filter((p) => p.id !== product.id && p.isActive && p.themeTags.some((t) => product.themeTags.includes(t)))
    .slice(0, 4);

  const handleAddToCart = () => {
    // Validate personalization fields
    const newErrors: Record<string, string> = {};
    product.personalizationFields.forEach((field) => {
      if (field.required && !personalization[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`;
      }
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const pValues: PersonalizationValue[] = product.personalizationFields
      .filter((f) => personalization[f.id]?.trim())
      .map((f) => ({
        fieldId: f.id,
        label: f.label,
        value: personalization[f.id],
      }));

    addItem(product, quantity, pValues);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
    openCart();
  };

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          {/* Breadcrumb */}
          <Link
            href="/gifts"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-mocha font-semibold tracking-wide uppercase transition-colors group mb-8"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Gifts
          </Link>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* LEFT: Image Gallery */}
            <ScrollReveal>
              <div className="space-y-4">
                {/* Main Image */}
                <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-surface shadow-card">
                  <Image
                    src={product.images[selectedImage]}
                    alt={product.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  {stockStatus === "out_of_stock" && (
                    <div className="absolute inset-0 bg-charcoal/40 flex items-center justify-center">
                      <span className="bg-charcoal/90 text-white text-sm font-bold px-6 py-3 rounded-full uppercase tracking-wider">
                        Out of Stock
                      </span>
                    </div>
                  )}
                  {stockStatus === "low_stock" && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                        Only {product.stock} left!
                      </span>
                    </div>
                  )}
                </div>
                {/* Thumbnails */}
                {product.images.length > 1 && (
                  <div className="flex gap-3">
                    {product.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedImage === i
                            ? "border-mocha shadow-md scale-95"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <Image src={img} alt={`View ${i + 1}`} fill className="object-cover" sizes="80px" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* RIGHT: Product Details */}
            <ScrollReveal delay={100}>
              <div className="space-y-6">
                {/* Theme tags */}
                <div className="flex flex-wrap gap-2">
                  {product.themeTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-bold uppercase tracking-wider text-mocha bg-mocha/10 px-3 py-1 rounded-full"
                    >
                      {tag.replace("-theme", "").replace(/-/g, " ")}
                    </span>
                  ))}
                  {product.categoryTags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-bold uppercase tracking-wider text-charcoal bg-cream-dark px-3 py-1 rounded-full"
                    >
                      {tag.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>

                <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal leading-[1.15]">
                  {product.title}
                </h1>

                {/* Price */}
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl font-bold text-charcoal">₹{product.price}</span>
                  {product.compareAtPrice && (
                    <>
                      <span className="text-lg text-text-light line-through">₹{product.compareAtPrice}</span>
                      <span className="bg-mocha text-white text-xs font-bold px-3 py-1 rounded-full">
                        {Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF
                      </span>
                    </>
                  )}
                </div>

                <p className="text-text-muted leading-relaxed">{product.description}</p>

                {/* SKU */}
                <p className="text-xs text-text-light">
                  SKU: <span className="font-mono">{product.sku}</span>
                </p>

                <hr className="border-border-light" />

                {/* Personalization Fields */}
                {product.personalizationFields.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-display text-lg font-semibold text-charcoal flex items-center gap-2">
                      ✨ Personalize Your Gift
                    </h3>
                    {product.personalizationFields.map((field) => (
                      <div key={field.id}>
                        <label className="text-sm font-semibold text-charcoal mb-1 block">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          placeholder={field.placeholder}
                          maxLength={field.maxLength}
                          value={personalization[field.id] || ""}
                          onChange={(e) => {
                            setPersonalization({ ...personalization, [field.id]: e.target.value });
                            if (errors[field.id]) {
                              setErrors({ ...errors, [field.id]: "" });
                            }
                          }}
                          className="w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all"
                        />
                        {errors[field.id] && (
                          <p className="text-red-500 text-xs mt-1">{errors[field.id]}</p>
                        )}
                      </div>
                    ))}
                    <hr className="border-border-light" />
                  </div>
                )}

                {/* Quantity + Add to Cart */}
                {stockStatus !== "out_of_stock" && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    {/* Quantity */}
                    <div className="flex items-center border border-border-light rounded-xl bg-surface">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-12 h-12 flex items-center justify-center text-charcoal hover:text-mocha transition-colors cursor-pointer"
                        disabled={quantity <= 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center font-bold text-charcoal">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(maxPurchasable, quantity + 1))}
                        className="w-12 h-12 flex items-center justify-center text-charcoal hover:text-mocha transition-colors cursor-pointer"
                        disabled={quantity >= maxPurchasable}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={handleAddToCart}
                      disabled={addedToCart}
                      className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all cursor-pointer ${
                        addedToCart
                          ? "bg-green-600 text-white"
                          : "btn-primary shadow-lg shadow-mocha/20 hover:shadow-xl hover:-translate-y-0.5"
                      }`}
                    >
                      {addedToCart ? (
                        <><Check size={18} /> Added to Cart</>
                      ) : (
                        <><ShoppingCart size={18} /> Add to Cart — ₹{product.price * quantity}</>
                      )}
                    </button>
                  </div>
                )}

                {inCart > 0 && !addedToCart && (
                  <p className="text-sm text-mocha font-semibold">
                    ✓ {inCart} already in your cart
                  </p>
                )}

                {stockStatus === "out_of_stock" && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-700 font-semibold text-sm">
                      This product is currently out of stock. Check back soon!
                    </p>
                  </div>
                )}

                {/* Share/Wishlist */}
                <div className="flex items-center gap-4 pt-2">
                  <button className="flex items-center gap-2 text-text-muted hover:text-mocha text-sm transition-colors cursor-pointer">
                    <Heart size={16} /> Save for Later
                  </button>
                  <button className="flex items-center gap-2 text-text-muted hover:text-mocha text-sm transition-colors cursor-pointer">
                    <Share2 size={16} /> Share
                  </button>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mt-20 md:mt-28">
              <ScrollReveal>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-charcoal mb-8">
                  You Might Also Like
                </h2>
              </ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map((p, i) => (
                  <ScrollReveal key={p.id} delay={i * 80}>
                    <ProductCard product={p} compact />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
