'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Product } from '@/types/database';
import { validateBuyUrl, validateBuyStore, validateBuyNote, BUY_NOTE_MAX_LENGTH } from '@/lib/buy-url';

interface ProductTableClientProps {
  initialProducts: Product[];
}

interface RowState {
  price: string;
  compare_at_price: string;
  stock_quantity: string;
  category: string;
  short_description: string;
  buy_url: string;
  buy_store: string;
  buy_note: string;
  isModified: boolean;
  isSaving: boolean;
  saveFeedback: { type: 'success' | 'error'; message: string; time: string } | null;
}

export function ProductTableClient({ initialProducts }: ProductTableClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');

  // Initialize draft states for all products
  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() => {
    const states: Record<string, RowState> = {};
    for (const p of initialProducts) {
      states[p.id] = {
        price: p.price.toString(),
        compare_at_price: p.compare_at_price != null ? p.compare_at_price.toString() : '',
        stock_quantity: p.stock_quantity.toString(),
        category: p.category,
        short_description: p.short_description,
        buy_url: p.buy_url ?? '',
        buy_store: p.buy_store ?? '',
        buy_note: p.buy_note ?? '',
        isModified: false,
        isSaving: false,
        saveFeedback: null,
      };
    }
    return states;
  });

  // Extract unique categories for filter
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    for (const p of products) {
      if (p.category) cats.add(p.category);
    }
    return Array.from(cats);
  }, [products]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'todas' || p.category.toLowerCase() === selectedCategory.toLowerCase();

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        p.title.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleInputChange = (
    id: string,
    field: keyof Omit<RowState, 'isModified' | 'isSaving' | 'saveFeedback'>,
    value: string
  ) => {
    setRowStates((prev) => {
      const current = prev[id];
      if (!current) return prev;

      const updated = {
        ...current,
        [field]: value,
        isModified: true,
      };
      return {
        ...prev,
        [id]: updated,
      };
    });
  };

  const handleSaveProduct = async (id: string) => {
    const row = rowStates[id];
    if (!row) return;

    const priceNum = parseFloat(row.price);
    if (isNaN(priceNum) || priceNum < 0) {
      setRowStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          saveFeedback: {
            type: 'error',
            message: 'Precio inválido',
            time: new Date().toLocaleTimeString(),
          },
        },
      }));
      return;
    }

    const stockNum = parseInt(row.stock_quantity, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setRowStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          saveFeedback: {
            type: 'error',
            message: 'Stock inválido',
            time: new Date().toLocaleTimeString(),
          },
        },
      }));
      return;
    }

    const comparePrice =
      row.compare_at_price.trim() === '' ? null : parseFloat(row.compare_at_price);

    // Same rules as the admin API: absolute https URL only, and a store name when a URL is set.
    const buyUrlResult = validateBuyUrl(row.buy_url);
    const buyStoreResult = validateBuyStore(row.buy_store);
    const buyNoteResult = validateBuyNote(row.buy_note);
    const buyError = !buyUrlResult.ok
      ? 'Enlace de compra inválido (debe ser https://)'
      : !buyStoreResult.ok
        ? 'Nombre de tienda inválido'
        : !buyNoteResult.ok
          ? 'Nota de compra inválida (texto simple, máx. 300 caracteres)'
          : buyUrlResult.value && !buyStoreResult.value
          ? 'Indica la tienda del enlace'
          : null;
    if (buyError || !buyUrlResult.ok || !buyStoreResult.ok || !buyNoteResult.ok) {
      setRowStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          saveFeedback: {
            type: 'error',
            message: buyError || 'Enlace de compra inválido',
            time: new Date().toLocaleTimeString(),
          },
        },
      }));
      return;
    }

    // Set saving spinner
    setRowStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], isSaving: true },
    }));

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: priceNum,
          compare_at_price: comparePrice,
          stock_quantity: stockNum,
          category: row.category.trim(),
          short_description: row.short_description.trim(),
          buy_url: buyUrlResult.value,
          buy_store: buyStoreResult.value,
          buy_note: buyNoteResult.value,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error HTTP ${response.status}`);
      }

      const updatedProduct: Product = await response.json();

      // Update state with newly returned product
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updatedProduct } : p))
      );

      const nowTime = new Date().toLocaleTimeString();
      setRowStates((prev) => ({
        ...prev,
        [id]: {
          price: updatedProduct.price.toString(),
          compare_at_price:
            updatedProduct.compare_at_price != null ? updatedProduct.compare_at_price.toString() : '',
          stock_quantity: updatedProduct.stock_quantity.toString(),
          category: updatedProduct.category,
          short_description: updatedProduct.short_description,
          buy_url: updatedProduct.buy_url ?? '',
          buy_store: updatedProduct.buy_store ?? '',
          buy_note: updatedProduct.buy_note ?? '',
          isModified: false,
          isSaving: false,
          saveFeedback: {
            type: 'success',
            message: 'Guardado y webhook disparado',
            time: nowTime,
          },
        },
      }));
    } catch (err: any) {
      setRowStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          isSaving: false,
          saveFeedback: {
            type: 'error',
            message: err.message || 'Error al guardar',
            time: new Date().toLocaleTimeString(),
          },
        },
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search/Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Catálogo de Productos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Edición rápida en línea con actualización automática de timestamp y webhooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 border border-slate-700">
            {filteredProducts.length} de {products.length} productos
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between backdrop-blur-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, SKU o categoría..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filtrar por categoría"
            className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="todas">Todas las categorías</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inline Editing Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg backdrop-blur-sm">
        <table className="w-full min-w-[1200px] text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3.5 pl-4 pr-3 font-semibold w-72">Producto / SKU</th>
              <th className="py-3.5 px-2 font-semibold w-28">Precio ($)</th>
              <th className="py-3.5 px-2 font-semibold w-28">Antes ($)</th>
              <th className="py-3.5 px-2 font-semibold w-24">Stock</th>
              <th className="py-3.5 px-2 font-semibold w-40">Categoría</th>
              <th className="py-3.5 px-2 font-semibold">Descripción Corta</th>
              <th className="py-3.5 px-2 font-semibold w-64">Enlace de compra</th>
              <th className="py-3.5 pr-4 pl-2 font-semibold text-right w-44">Acción / Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                  No se encontraron productos que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const state = rowStates[p.id] || {
                  price: p.price.toString(),
                  compare_at_price: p.compare_at_price != null ? p.compare_at_price.toString() : '',
                  stock_quantity: p.stock_quantity.toString(),
                  category: p.category,
                  short_description: p.short_description,
                  buy_url: p.buy_url ?? '',
                  buy_store: p.buy_store ?? '',
                  buy_note: p.buy_note ?? '',
                  isModified: false,
                  isSaving: false,
                  saveFeedback: null,
                };

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      state.isModified ? 'bg-cyan-950/20' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Col 1: Title, SKU, Thumbnail */}
                    <td className="py-3 pl-4 pr-3 align-top">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-800 border border-slate-700/60">
                          <img
                            src={p.image_url}
                            alt={p.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/productos/${p.slug}`}
                            target="_blank"
                            className="font-semibold text-slate-100 hover:text-cyan-400 line-clamp-1 flex items-center gap-1 group"
                          >
                            <span>{p.title}</span>
                            <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                          </Link>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-mono text-cyan-400">{p.sku}</span>
                            <span>•</span>
                            <span>{p.brand}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>
                              Act: {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Col 2: Price (Editable) */}
                    <td className="py-3 px-2 align-top">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={state.price}
                          onChange={(e) => handleInputChange(p.id, 'price', e.target.value)}
                          className="w-full rounded-lg border border-slate-700/80 bg-slate-950 pl-6 pr-2 py-1.5 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </td>

                    {/* Col 3: Compare at Price (Editable) */}
                    <td className="py-3 px-2 align-top">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="-"
                          value={state.compare_at_price}
                          onChange={(e) => handleInputChange(p.id, 'compare_at_price', e.target.value)}
                          className="w-full rounded-lg border border-slate-700/80 bg-slate-950 pl-6 pr-2 py-1.5 font-mono text-xs text-slate-300 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </td>

                    {/* Col 4: Stock Quantity (Editable) */}
                    <td className="py-3 px-2 align-top">
                      <input
                        type="number"
                        min="0"
                        value={state.stock_quantity}
                        onChange={(e) => handleInputChange(p.id, 'stock_quantity', e.target.value)}
                        className={`w-full rounded-lg border py-1.5 px-2 font-mono text-xs text-center focus:outline-none focus:ring-1 ${
                          parseInt(state.stock_quantity, 10) <= 5
                            ? 'border-amber-500/50 bg-amber-950/20 text-amber-300 focus:border-amber-500 focus:ring-amber-500'
                            : 'border-slate-700/80 bg-slate-950 text-white focus:border-cyan-500 focus:ring-cyan-500'
                        }`}
                      />
                    </td>

                    {/* Col 5: Category (Editable) */}
                    <td className="py-3 px-2 align-top">
                      <select
                        value={state.category}
                        onChange={(e) => handleInputChange(p.id, 'category', e.target.value)}
                        className="w-full rounded-lg border border-slate-700/80 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="estaciones-de-trabajo">Estaciones de Trabajo</option>
                        <option value="monitores">Monitores</option>
                        <option value="accesorios">Accesorios</option>
                        <option value="componentes">Componentes</option>
                        <option value="ofertas">Ofertas</option>
                        <option value="liquidacion">Liquidación</option>
                      </select>
                    </td>

                    {/* Col 6: Short Description (Editable) */}
                    <td className="py-3 px-2 align-top">
                      <textarea
                        rows={2}
                        value={state.short_description}
                        onChange={(e) => handleInputChange(p.id, 'short_description', e.target.value)}
                        className="w-full rounded-lg border border-slate-700/80 bg-slate-950 p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none leading-relaxed"
                      />
                    </td>

                    {/* Col 7: Outbound buy link (https URL) and store name */}
                    <td className="py-3 px-2 align-top">
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="url"
                          inputMode="url"
                          maxLength={2000}
                          placeholder="https://tienda.com/producto"
                          aria-label={`Enlace de compra de ${p.sku}`}
                          value={state.buy_url}
                          onChange={(e) => handleInputChange(p.id, 'buy_url', e.target.value)}
                          className="w-full rounded-lg border border-slate-700/80 bg-slate-950 px-2 py-1.5 font-mono text-[11px] text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        <input
                          type="text"
                          maxLength={120}
                          placeholder="Tienda (ej. Amazon)"
                          aria-label={`Tienda de ${p.sku}`}
                          value={state.buy_store}
                          onChange={(e) => handleInputChange(p.id, 'buy_store', e.target.value)}
                          className="w-full rounded-lg border border-slate-700/80 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        <textarea
                          rows={2}
                          maxLength={BUY_NOTE_MAX_LENGTH}
                          placeholder="Nota junto al botón (opcional, texto simple)"
                          aria-label={`Nota de compra de ${p.sku}`}
                          value={state.buy_note}
                          onChange={(e) => handleInputChange(p.id, 'buy_note', e.target.value)}
                          className="w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950 px-2 py-1.5 text-xs leading-relaxed text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </td>

                    {/* Col 8: Guardar Button & Feedback */}
                    <td className="py-3 pr-4 pl-2 align-top text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSaveProduct(p.id)}
                          disabled={state.isSaving}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all ${
                            state.isModified
                              ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold shadow-cyan-500/20'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                          } disabled:opacity-50`}
                        >
                          {state.isSaving ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>Guardando...</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-3.5 w-3.5" />
                              <span>Guardar</span>
                            </>
                          )}
                        </button>

                        {/* Status feedback badge */}
                        {state.saveFeedback && (
                          <div
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border ${
                              state.saveFeedback.type === 'success'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {state.saveFeedback.type === 'success' ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                            ) : (
                              <AlertCircle className="h-3 w-3 shrink-0" />
                            )}
                            <span className="truncate max-w-[140px]" title={state.saveFeedback.message}>
                              {state.saveFeedback.message}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
