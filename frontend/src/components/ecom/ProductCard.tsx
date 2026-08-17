"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart } from "lucide-react";
import type { Product } from "@/lib/shop-types";
import { formatPaise, getStockStatus, productImageUrl } from "@/lib/shop-types";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";

interface ProductCardProps {
  product: Product;
  /** If true, shows a compact version without description */
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { addItem, getItemQuantity } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const stockStatus = getStockStatus(product);
  const inCart = getItemQuantity(product.id);
  const hasPersonalization = (product.personalizationFields?.length ?? 0) > 0;
  const wishlisted = isWishlisted(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (stockStatus === "out_of_stock") return;
    if (hasPersonalization) return;
    void addItem(product.id, 1);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void toggleWishlist(product.id);
  };

  return (
    <Link
      href={`/gifts/${product.slug}`}
      className="group block relative"
    >
      <div className="relative overflow-hidden rounded-[2rem] bg-white p-3 sm:p-4 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border border-border-light/40">
        
        {/* Image Container */}
        <div className="relative aspect-[4/3] w-full rounded-[1.5rem] overflow-hidden bg-cream-dark">
          <Image
            src={productImageUrl(product)}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            {stockStatus === "low_stock" && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm w-fit uppercase tracking-wider">
                Only {product.stock?.quantityAvailable ?? 0} left
              </span>
            )}
          </div>

          {/* Discount Badge */}
          {product.compareAtPriceInPaise && (
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-mocha text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm tracking-wide">
                {Math.round((1 - product.priceInPaise / product.compareAtPriceInPaise) * 100)}% Off
              </span>
            </div>
          )}

          {/* Stock Badge Overlay */}
          {stockStatus === "out_of_stock" && (
            <div className="absolute inset-0 bg-charcoal/40 flex items-center justify-center z-20">
              <span className="bg-charcoal/90 text-white text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider">
                Out of Stock
              </span>
            </div>
          )}

          {/* Quick View Glass Overlay (Hover) */}
          <div className="absolute inset-0 bg-mocha/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 flex items-center justify-center pointer-events-none">
            <span className="bg-white/95 text-mocha text-xs font-bold px-5 py-2.5 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 uppercase tracking-widest pointer-events-auto">
              Quick View
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="pt-4 pb-2 px-1 relative">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-[1.1rem] sm:text-xl font-bold text-charcoal leading-snug group-hover:text-mocha transition-colors line-clamp-2">
              {product.title}
            </h3>
            
            {/* Heart Button */}
            <button 
              className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center shadow-soft border border-border-light/60 hover:scale-110 hover:bg-cream transition-all cursor-pointer ${wishlisted ? "border-red-200" : ""}`}
              onClick={handleToggleWishlist}
              aria-label={wishlisted ? "Remove from saved products" : "Add to saved products"}
            >
              <Heart size={18} className="text-red-500" fill={wishlisted ? "currentColor" : "none"} />
            </button>
          </div>

          {!compact && (
            <p className="text-text-muted text-xs sm:text-sm mt-2 line-clamp-2 leading-relaxed pr-10">
              {product.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-4">
            <span className="font-display text-lg sm:text-xl font-bold text-charcoal">
              {formatPaise(product.priceInPaise)}
            </span>
            {product.compareAtPriceInPaise && (
              <span className="text-sm text-text-light line-through font-medium">
                {formatPaise(product.compareAtPriceInPaise)}
              </span>
            )}
          </div>

          {/* Personalization hint */}
          {hasPersonalization && (
            <p className="text-[10px] text-mocha font-semibold mt-2 uppercase tracking-wider">
              ✨ Personalizable
            </p>
          )}
        </div>
      </div>

      {/* The Cutout Cart Button overlay */}
      {stockStatus !== "out_of_stock" && !hasPersonalization && (
        <button
          onClick={handleQuickAdd}
          className="absolute -bottom-2 -right-2 w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-tl-[1.5rem] rounded-br-[2.2rem] rounded-tr-lg rounded-bl-lg bg-white border-[8px] border-cream shadow-[-4px_-4px_15px_rgba(0,0,0,0.04)] flex items-center justify-center text-mocha hover:bg-mocha hover:text-white transition-all duration-300 z-30 cursor-pointer group-hover:scale-105"
          aria-label="Add to cart"
        >
          <ShoppingCart size={22} className="relative z-10" />
          {inCart > 0 && (
            <span className="absolute top-2 right-2 w-3 h-3 bg-mocha rounded-full border-2 border-white z-20"></span>
          )}
        </button>
      )}
    </Link>
  );
}
