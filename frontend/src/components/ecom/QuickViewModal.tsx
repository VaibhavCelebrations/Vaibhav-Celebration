"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/shop-types";
import { formatPaise, getStockStatus, productImageUrl } from "@/lib/shop-types";
import { useCart } from "@/context/cart-context";

interface QuickViewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  
  const stockStatus = getStockStatus(product);
  const hasPersonalization = product.personalizationEnabled && (product.personalizationFields?.length ?? 0) > 0;
  const fromPrice = hasPersonalization
    ? product.priceInPaise + product.personalizationCostInPaise
    : product.priceInPaise;

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddToCart = async () => {
    if (stockStatus === "out_of_stock") return;
    setIsAdding(true);
    try {
      await addItem(product.id, 1, []);
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
        onClose();
      }, 1500);
    } catch {
      // toast already handled
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      
      {/* Modal Content */}
      <div 
        className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-charcoal hover:bg-cream transition-colors shadow-soft"
        >
          <X size={20} />
        </button>

        {/* Image Section */}
        <div className="relative w-full md:w-1/2 aspect-square md:aspect-auto bg-cream-dark">
          <Image
            src={productImageUrl(product)}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        {/* Details Section */}
        <div className="flex-1 flex flex-col p-6 md:p-10 overflow-y-auto">
          <div className="mb-4">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-charcoal mb-2">
              {product.title}
            </h2>
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl text-mocha font-bold">
                {hasPersonalization ? `From ${formatPaise(fromPrice)}` : formatPaise(product.priceInPaise)}
              </span>
              {product.compareAtPriceInPaise && (
                <span className="text-text-light line-through font-medium">
                  {formatPaise(product.compareAtPriceInPaise)}
                </span>
              )}
            </div>
            {hasPersonalization && (
              <p className="text-xs text-sage-dark font-semibold mt-1 uppercase tracking-wider">
                ✨ Personalizable
              </p>
            )}
          </div>

          <div className="w-12 h-1 bg-sage/30 rounded-full mb-6"></div>

          <div className="prose prose-sm text-text-muted mb-8 line-clamp-6">
            {typeof product.description === "string" ? product.description : "No description available."}
          </div>

          <div className="mt-auto pt-6 border-t border-border-light/40 flex flex-col gap-3">
            {hasPersonalization ? (
              <Link
                href={`/gifts/${product.slug}`}
                className="btn-primary w-full py-4 text-center group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Customize & Add to Cart
                </span>
              </Link>
            ) : stockStatus === "out_of_stock" ? (
              <button
                disabled
                className="w-full py-4 bg-gray-200 text-gray-500 rounded-full font-bold uppercase tracking-wider cursor-not-allowed"
              >
                Out of Stock
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={isAdding || added}
                className={`btn-primary w-full py-4 flex items-center justify-center gap-2 transition-all ${
                  added ? "bg-sage text-white" : ""
                }`}
              >
                <ShoppingCart size={18} />
                {added ? "Added to Cart" : isAdding ? "Adding..." : "Add to Cart"}
              </button>
            )}

            <Link
              href={`/gifts/${product.slug}`}
              className="text-center text-sm font-semibold text-charcoal hover:text-mocha transition-colors py-2"
            >
              View Full Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
