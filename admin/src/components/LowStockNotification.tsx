"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { productsRepo } from "@/lib/data/products";

export function LowStockNotification() {
  const [lowStockProducts, setLowStockProducts] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Basic polling or one-time fetch
    const fetchStock = () => {
      productsRepo.list({ page: 1, pageSize: 200 })
        .then(res => {
          const currentLow = res.items
            .filter(p => (p.stock?.quantityAvailable ?? 0) <= (p.stock?.lowStockThreshold ?? 10))
            .map(p => p.id);
            
          setLowStockProducts(currentLow);
          
          // Check against acknowledged
          const ackJson = localStorage.getItem("acknowledgedLowStock") || "[]";
          const ackList = JSON.parse(ackJson) as string[];
          
          // Any current low stock product that is NOT in the acknowledged list is unread
          const unread = currentLow.filter(id => !ackList.includes(id));
          setUnreadCount(unread.length);
          
          // Clean up acknowledged list (remove products that are no longer low stock)
          const newAckList = ackList.filter(id => currentLow.includes(id));
          if (newAckList.length !== ackList.length) {
            localStorage.setItem("acknowledgedLowStock", JSON.stringify(newAckList));
          }
        })
        .catch(() => {});
    };

    fetchStock();
    // Poll every 30 seconds
    const interval = setInterval(fetchStock, 30000);
    
    // Listen for manual updates
    window.addEventListener("inventory-updated", fetchStock);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("inventory-updated", fetchStock);
    };
  }, []);

  const handleMarkAsRead = () => {
    const ackJson = localStorage.getItem("acknowledgedLowStock") || "[]";
    const ackList = JSON.parse(ackJson) as string[];
    const newAckList = Array.from(new Set([...ackList, ...lowStockProducts]));
    
    localStorage.setItem("acknowledgedLowStock", JSON.stringify(newAckList));
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-(--color-charcoal) transition-colors hover:bg-gray-100"
      >
        <Bell size={20} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--color-error) opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-(--color-error)"></span>
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 bottom-full mb-2 w-80 z-50 rounded-lg border border-(--color-border-soft) bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-serif text-sm font-semibold text-(--color-charcoal)">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAsRead}
                  className="text-xs font-medium text-(--color-mocha) hover:underline"
                >
                  Mark as read
                </button>
              )}
            </div>
            {lowStockProducts.length > 0 ? (
              <div className={`rounded-md p-3 text-sm text-(--color-charcoal) ${unreadCount > 0 ? 'bg-(--color-error-bg)' : 'bg-gray-50'}`}>
                <p className={`font-medium ${unreadCount > 0 ? 'text-(--color-error)' : 'text-(--color-charcoal)'}`}>
                  Low Stock Alert
                </p>
                <p className="mt-1 text-xs">
                  {lowStockProducts.length} product{lowStockProducts.length === 1 ? '' : 's'} {lowStockProducts.length === 1 ? 'is' : 'are'} currently below the minimum stock threshold.
                </p>
                <Link 
                  href="/dashboard/inventory/stock" 
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-block font-medium text-(--color-mocha) hover:underline text-xs"
                >
                  Manage inventory →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-(--color-text-muted)">You have no new notifications.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
