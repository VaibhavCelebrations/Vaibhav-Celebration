"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingCart, Heart, Share2, Check, Loader2, Zap } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ProductCard } from "@/components/ecom/ProductCard";
import * as shopApi from "@/lib/shop-api";
import { formatPaise, getStockStatus, getMaxPurchasable, productImageUrl } from "@/lib/shop-types";
import type { Product } from "@/lib/shop-types";
import type { PersonalizationValue } from "@/lib/ecom-types";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import { useAuth } from "@/context/auth-context";
import { ApiClientError } from "@/lib/api-client";
import { CacheStore } from "@/lib/cache-store";
import { useRouter } from "next/navigation";

const DIRECT_CHECKOUT_KEY = "vc_direct_checkout";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { slug } = use(params);

  const [product, setProduct] = useState<(Product & { related: Product[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { addItem, getItemQuantity } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { isAuthenticated, openAuthModal } = useAuth();
  const router = useRouter();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [personalizeSelected, setPersonalizeSelected] = useState(false);
  const [personalization, setPersonalization] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addedToCart, setAddedToCart] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setNotFound(false);
      try {
        const data = await shopApi.getProductBySlug(slug);
        if (!cancelled) {
          setProduct(data);
          setSelectedImage(0);
          setQuantity(1);
          setPersonalizeSelected(false);
          setPersonalization({});
          setErrors({});
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiClientError && err.status === 404) setNotFound(true);
          setProduct(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="pt-36 pb-24 flex items-center justify-center min-h-screen">
          <Loader2 size={32} className="animate-spin text-mocha" />
        </main>
        <FooterClient />
      </>
    );
  }

  if (notFound || !product) {
    return (
      <>
        <Navbar />
        <main className="pt-36 pb-24 text-center min-h-screen">
          <h1 className="font-display text-3xl font-bold text-charcoal">Product Not Found</h1>
          <Link href="/gifts" className="btn-primary px-8 py-3 mt-8 inline-flex text-sm">
            Back to Gifts
          </Link>
        </main>
        <FooterClient />
      </>
    );
  }

  const stockStatus = getStockStatus(product);
  const maxPurchasable = getMaxPurchasable(product);
  const inCart = getItemQuantity(product.id);
  const wishlisted = isWishlisted(product.id);
  const relatedProducts = product.related;
  const personalizationCost = product.personalizationEnabled && personalizeSelected ? product.personalizationCostInPaise : 0;
  const unitTotal = product.priceInPaise + personalizationCost;

  const handleAddToCart = async () => {
    setErrors({});
    
    // Automatically fill all fields with a placeholder so the backend validation passes,
    // since the client brief dictates we collect these details *after* booking now.
    const pValues: PersonalizationValue[] = buildPersonalizationValues();

    setIsAdding(true);
    try {
      await addItem(product.id, quantity, pValues);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch {
      // toast already surfaced by cart context
    } finally {
      setIsAdding(false);
    }
  };

  const buildPersonalizationValues = (): PersonalizationValue[] =>
    personalizeSelected
      ? product.personalizationFields.map((f) => ({
          fieldId: f.id,
          label: f.label,
          value: "To be collected by team after booking",
        }))
      : [];

  const handleBuyNow = () => {
    const run = () => {
      CacheStore.setSessionItem(DIRECT_CHECKOUT_KEY, {
        productId: product.id,
        title: product.title,
        quantity,
        unitPriceInPaise: product.priceInPaise,
        personalizationSelected: personalizeSelected,
        personalizationCostInPaise: personalizationCost,
        personalizationValues: buildPersonalizationValues(),
      });
      router.push("/checkout");
    };
    if (!isAuthenticated) {
      openAuthModal(run);
      return;
    }
    setIsBuying(true);
    run();
    setIsBuying(false);
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
                    src={productImageUrl(product, selectedImage)}
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
                        Only {product.stock?.quantityAvailable ?? 0} left!
                      </span>
                    </div>
                  )}
                </div>
                {/* Thumbnails */}
                {product.images.length > 1 && (
                  <div className="flex gap-3">
                    {product.images.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImage(i)}
                        className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedImage === i
                            ? "border-mocha shadow-md scale-95"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <Image src={img.media.url} alt={`View ${i + 1}`} fill className="object-cover" sizes="80px" />
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
                  {product.themes.map((tag) => (
                    <span
                      key={tag.id}
                      className="text-[10px] font-bold uppercase tracking-wider text-mocha bg-mocha/10 px-3 py-1 rounded-full"
                    >
                      {tag.title.replace(/ Theme| Birthday| Celebration/gi, "")}
                    </span>
                  ))}
                  {product.categories.map((tag) => (
                    <span
                      key={tag.id}
                      className="text-[10px] font-bold uppercase tracking-wider text-charcoal bg-cream-dark px-3 py-1 rounded-full"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal leading-[1.15]">
                  {product.title}
                </h1>

                {/* Price */}
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl font-bold text-charcoal">{formatPaise(product.priceInPaise)}</span>
                  {product.compareAtPriceInPaise && (
                    <>
                      <span className="text-lg text-text-light line-through">{formatPaise(product.compareAtPriceInPaise)}</span>
                      <span className="bg-mocha text-white text-xs font-bold px-3 py-1 rounded-full">
                        {Math.round((1 - product.priceInPaise / product.compareAtPriceInPaise) * 100)}% OFF
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
                {product.personalizationEnabled && product.personalizationFields.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-display text-lg font-semibold text-charcoal flex items-center gap-2">
                      ✨ Personalize Your Gift
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setPersonalizeSelected(true)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition-all flex items-center gap-3 ${
                          personalizeSelected ? "border-mocha bg-mocha/10 text-charcoal" : "border-border-light bg-surface text-text-muted"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${personalizeSelected ? "border-mocha" : "border-text-light/50"}`}>
                          {personalizeSelected && <div className="w-2 h-2 rounded-full bg-mocha" />}
                        </div>
                        <div>
                          <span className="block font-semibold">Yes, I'd like personalization</span>
                          <span>{formatPaise(product.personalizationCostInPaise)} extra</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPersonalizeSelected(false);
                          setErrors({});
                        }}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition-all flex items-center gap-3 ${
                          !personalizeSelected ? "border-mocha bg-mocha/10 text-charcoal" : "border-border-light bg-surface text-text-muted"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${!personalizeSelected ? "border-mocha" : "border-text-light/50"}`}>
                          {!personalizeSelected && <div className="w-2 h-2 rounded-full bg-mocha" />}
                        </div>
                        <div>
                          <span className="block font-semibold">No, keep it standard</span>
                          <span>No additional cost</span>
                        </div>
                      </button>
                    </div>
                    {personalizeSelected && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200/50 p-4 text-sm text-amber-900">
                        <p className="font-medium">Our team will contact you after booking to collect names, messages, or customization details.</p>
                      </div>
                    )}
                    <div className="rounded-xl bg-surface border border-border-light p-4 text-sm">
                      <div className="flex justify-between text-text-muted">
                        <span>Base product</span>
                        <span>{formatPaise(product.priceInPaise)}</span>
                      </div>
                      {personalizeSelected && (
                        <div className="mt-1 flex justify-between text-text-muted">
                          <span>Personalization</span>
                          <span>{formatPaise(product.personalizationCostInPaise)}</span>
                        </div>
                      )}
                      <div className="mt-2 flex justify-between font-bold text-charcoal">
                        <span>Unit total</span>
                        <span>{formatPaise(unitTotal)}</span>
                      </div>
                    </div>
                    <hr className="border-border-light" />
                  </div>
                )}

                {/* Quantity + Add to Cart */}
                {stockStatus !== "out_of_stock" && (
                  <div className="flex flex-col gap-3">
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
                        disabled={addedToCart || isAdding}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all cursor-pointer ${
                          addedToCart
                            ? "bg-green-600 text-white"
                            : "btn-primary shadow-lg shadow-mocha/20 hover:shadow-xl hover:-translate-y-0.5"
                        }`}
                      >
                        {isAdding ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : addedToCart ? (
                          <><Check size={18} /> Added to Cart</>
                        ) : (
                          <><ShoppingCart size={18} /> Add to Cart — {formatPaise(unitTotal * quantity)}</>
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={isBuying}
                      className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-mocha bg-white py-4 text-sm font-bold uppercase tracking-wider text-mocha transition-all hover:bg-mocha hover:text-white cursor-pointer disabled:opacity-60"
                    >
                      {isBuying ? <Loader2 size={18} className="animate-spin" /> : <><Zap size={18} /> Buy Now — {formatPaise(unitTotal * quantity)}</>}
                    </button>
                    {errors.personalize && (
                      <p className="text-sm text-red-600 font-medium">{errors.personalize}</p>
                    )}
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
                  <button
                    onClick={() => void toggleWishlist(product.id)}
                    className={`flex items-center gap-2 text-sm transition-colors cursor-pointer ${wishlisted ? "text-red-500" : "text-text-muted hover:text-mocha"}`}
                  >
                    <Heart size={16} fill={wishlisted ? "currentColor" : "none"} /> {wishlisted ? "Saved" : "Save for Later"}
                  </button>
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined" && navigator.share) {
                        navigator.share({ title: product.title, url: window.location.href }).catch(() => undefined);
                      } else if (typeof window !== "undefined") {
                        navigator.clipboard?.writeText(window.location.href);
                      }
                    }}
                    className="flex items-center gap-2 text-text-muted hover:text-mocha text-sm transition-colors cursor-pointer"
                  >
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
      <FooterClient />
      <WhatsAppFAB />
    </>
  );
}
