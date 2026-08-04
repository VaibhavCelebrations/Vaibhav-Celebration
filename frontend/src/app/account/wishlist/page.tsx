"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2, ShoppingCart, Loader2 } from "lucide-react";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/cart-context";
import { formatPaise } from "@/lib/shop-types";

export default function WishlistPage() {
  const { items, isLoading, removeFromWishlist } = useWishlist();
  const { addItem } = useCart();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal">Saved Products</h1>
        <p className="text-text-muted text-sm mt-1">Products you&apos;ve saved for later.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-mocha" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border-light">
          <Heart size={40} className="mx-auto text-text-light mb-4" />
          <h3 className="font-display text-xl font-semibold text-charcoal mb-2">No saved products yet</h3>
          <p className="text-text-muted text-sm mb-6">Tap the heart icon on any product to save it here.</p>
          <Link href="/gifts" className="btn-primary px-8 py-3 text-sm">Browse Gifts</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-surface rounded-2xl border border-border-light p-4 shadow-soft flex gap-4">
              <Link href={`/gifts/${item.slug}`} className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-cream">
                <Image src={item.image?.url ?? "/placeholder-product.svg"} alt={item.title} fill className="object-cover" sizes="80px" />
              </Link>
              <div className="flex-1 min-w-0 flex flex-col">
                <Link href={`/gifts/${item.slug}`} className="font-semibold text-charcoal hover:text-mocha text-sm line-clamp-2">{item.title}</Link>
                <p className="font-bold text-charcoal text-sm mt-1">{formatPaise(item.priceInPaise)}</p>
                {item.stockStatus === "OUT_OF_STOCK" && <p className="text-[10px] text-red-500 font-semibold mt-0.5">Out of stock</p>}
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <button
                    onClick={() => void addItem(item.productId, 1)}
                    disabled={item.stockStatus === "OUT_OF_STOCK" || !item.isActive}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-mocha text-white text-xs font-bold uppercase tracking-wider py-2 rounded-lg hover:bg-mocha-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ShoppingCart size={12} /> Add
                  </button>
                  <button
                    onClick={() => void removeFromWishlist(item.productId)}
                    className="w-8 h-8 flex items-center justify-center text-text-light hover:text-red-500 transition-colors cursor-pointer"
                    aria-label="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
