"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import {
  fetchSuppliers,
  fetchWarehouses,
  createPurchaseOrder,
  type Supplier,
  type Warehouse,
} from "@/lib/data/inventory";
import { productsRepo } from "@/lib/data/products";
import type { Product } from "@/types/cms";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  
  const [items, setItems] = useState<{ productId: string; quantity: number; unitPriceInPaise: number }[]>([
    { productId: "", quantity: 1, unitPriceInPaise: 0 }
  ]);

  useEffect(() => {
    Promise.all([
      fetchSuppliers({ pageSize: 100 }),
      fetchWarehouses(),
      productsRepo.list({ page: 1, pageSize: 100 }) // Fetching all products for simplicity in dropdown
    ]).then(([sRes, wRes, pRes]) => {
      setSuppliers(sRes.items);
      setWarehouses(wRes);
      setProducts(pRes.items);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError("Failed to load form data");
      setLoading(false);
    });
  }, []);

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitPriceInPaise: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as Record<string, unknown>)[field] = value;
    
    // Auto-fill unit price when product is selected
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product && product.priceInPaise) {
        newItems[index].unitPriceInPaise = product.priceInPaise;
      }
    }
    
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!supplierId) {
      setError("Please select a supplier");
      return;
    }
    
    const validItems = items.filter(item => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      setError("Please add at least one valid item");
      return;
    }

    setSubmitting(true);
    try {
      await createPurchaseOrder({
        supplierId,
        warehouseId: warehouseId || undefined,
        notes: notes || undefined,
        expectedAt: expectedAt ? new Date(expectedAt).toISOString() : undefined,
        items: validItems,
      });
      router.push("/dashboard/inventory/purchases");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create purchase order");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center" style={{ color: "var(--color-text-muted)" }}>Loading form...</div>;
  }

  const totalPaise = items.reduce((sum, item) => sum + (item.quantity * item.unitPriceInPaise), 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventory/purchases" className="btn btn-ghost p-2 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", color: "var(--color-white)" }}>New Purchase Order</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Create a draft purchase order for a supplier</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-4 bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-medium" style={{ color: "var(--color-charcoal)" }}>Order Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>Supplier *</label>
              <select 
                className="input" 
                value={supplierId} 
                onChange={e => setSupplierId(e.target.value)}
                required
              >
                <option value="">Select a supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.contactPerson ? `(${s.contactPerson})` : ''}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>Destination Warehouse</label>
              <select 
                className="input" 
                value={warehouseId} 
                onChange={e => setWarehouseId(e.target.value)}
              >
                <option value="">Select a warehouse (optional)...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>Expected Delivery Date</label>
              <input 
                type="date" 
                className="input" 
                value={expectedAt}
                onChange={e => setExpectedAt(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>Notes</label>
            <textarea 
              className="input min-h-20" 
              placeholder="Internal notes for this order..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium" style={{ color: "var(--color-charcoal)" }}>Line Items</h2>
            <button 
              type="button" 
              className="btn btn-outline btn-sm flex items-center gap-1.5"
              onClick={handleAddItem}
            >
              <Plus size={14} /> Add Item
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                  <th className="py-2 font-medium">Product *</th>
                  <th className="py-2 font-medium w-32">Quantity *</th>
                  <th className="py-2 font-medium w-40">Unit Price (₹) *</th>
                  <th className="py-2 font-medium w-32 text-right">Total</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 pr-2">
                      <select 
                        className="input" 
                        value={item.productId}
                        onChange={e => handleItemChange(index, 'productId', e.target.value)}
                        required
                      >
                        <option value="">Select product...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <input 
                        type="number" 
                        className="input" 
                        min="1" 
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        required
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input 
                        type="number" 
                        className="input" 
                        min="0" 
                        step="0.01"
                        value={item.unitPriceInPaise / 100}
                        onChange={e => handleItemChange(index, 'unitPriceInPaise', Math.round(parseFloat(e.target.value) * 100) || 0)}
                        required
                      />
                    </td>
                    <td className="py-3 px-2 text-right font-medium" style={{ color: "var(--color-charcoal)" }}>
                      ₹{((item.quantity * item.unitPriceInPaise) / 100).toFixed(2)}
                    </td>
                    <td className="py-3 pl-2 text-right">
                      {items.length > 1 && (
                        <button 
                          type="button" 
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t" style={{ borderColor: "var(--color-border)" }}>
                  <td colSpan={3} className="py-4 text-right font-medium" style={{ color: "var(--color-charcoal)" }}>
                    Estimated Total:
                  </td>
                  <td className="py-4 px-2 text-right font-bold" style={{ color: "var(--color-charcoal)" }}>
                    ₹{(totalPaise / 100).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/inventory/purchases" className="btn btn-outline">
            Cancel
          </Link>
          <button 
            type="submit" 
            className="btn btn-primary flex items-center gap-2"
            disabled={submitting}
          >
            {submitting ? "Saving..." : (
              <>
                <Save size={16} /> Save as Draft
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
