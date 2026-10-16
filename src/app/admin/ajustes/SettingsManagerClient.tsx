'use client';

import React, { useState } from 'react';
import {
  Settings,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Code2,
  Radio,
  Clock,
  Sparkles,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { StoreSettings, WebhookEvent } from '@/types/database';

interface SettingsManagerClientProps {
  initialSettings: StoreSettings;
}

interface WebhookTestResult {
  success: boolean;
  statusCode: number;
  latencyMs: number;
  message?: string;
  error?: string;
}

export function SettingsManagerClient({ initialSettings }: SettingsManagerClientProps) {
  const [storeName, setStoreName] = useState(initialSettings.store_name || 'NovaWorkstations');
  const [customHeadScript, setCustomHeadScript] = useState(initialSettings.custom_head_script || '');
  const [webhookProductUpdated, setWebhookProductUpdated] = useState(
    initialSettings.webhook_url_product_updated || ''
  );
  const [webhookOrderPaid, setWebhookOrderPaid] = useState(
    initialSettings.webhook_url_order_paid || ''
  );
  const [webhookOrderRefunded, setWebhookOrderRefunded] = useState(
    initialSettings.webhook_url_order_refunded || ''
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Webhook testing state per event
  const [testingEvent, setTestingEvent] = useState<WebhookEvent | null>(null);
  const [testResults, setTestResults] = useState<Record<string, WebhookTestResult>>({});

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: storeName.trim(),
          custom_head_script: customHeadScript.trim() || null,
          webhook_url_product_updated: webhookProductUpdated.trim() || null,
          webhook_url_order_paid: webhookOrderPaid.trim() || null,
          webhook_url_order_refunded: webhookOrderRefunded.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }

      const updated: StoreSettings = await res.json();
      setStoreName(updated.store_name);
      setSaveStatus({
        type: 'success',
        message: 'Ajustes guardados exitosamente en la base de datos.',
      });
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'Error al guardar los ajustes.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhook = async (event: WebhookEvent, url: string) => {
    if (!url || !url.trim()) {
      setTestResults((prev) => ({
        ...prev,
        [event]: {
          success: false,
          statusCode: 0,
          latencyMs: 0,
          error: 'Ingrese una URL válida antes de probar el envío.',
        },
      }));
      return;
    }

    setTestingEvent(event);
    try {
      const res = await fetch('/api/admin/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, url: url.trim() }),
      });

      const result: WebhookTestResult = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [event]: result,
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [event]: {
          success: false,
          statusCode: 0,
          latencyMs: 0,
          error: err.message || 'Error de conexión',
        },
      }));
    } finally {
      setTestingEvent(null);
    }
  };

  const insertScriptSnippet = (snippet: string) => {
    setCustomHeadScript((prev) => (prev ? `${prev}\n${snippet}` : snippet));
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Ajustes de Plataforma & Webhooks
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Configuración global de la marca, inyección de scripts personalizados y endpoints para webhooks salientes.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Global Save Feedback */}
        {saveStatus && (
          <div
            className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold border backdrop-blur-sm animate-in fade-in ${
              saveStatus.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {saveStatus.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{saveStatus.message}</span>
          </div>
        )}

        {/* Section 1: Store General Settings */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <Settings className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Identidad de Tienda</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Nombre de la Tienda (store_name) *
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
              Se utiliza en metadatos globales, títulos de navegación y correos transaccionales.
            </p>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Section 2: Custom Head Script */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Code2 className="h-5 w-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">Script Personalizado en &lt;head&gt;</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              custom_head_script
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Inyecta etiquetas de análisis (Google Analytics, Pixel de Meta, Hotjar) o scripts de terceros en el encabezado HTML de todas las páginas de la tienda pública.
          </p>

          {/* Quick Syntax Helper Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400">Plantillas rápidas:</span>
            <button
              type="button"
              onClick={() =>
                insertScriptSnippet(
                  '<script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX" async></script>'
                )
              }
              className="rounded-lg border border-slate-800 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
            >
              + Google Analytics tag
            </button>
            <button
              type="button"
              onClick={() =>
                insertScriptSnippet(
                  '<script>\n  window.dataLayer = window.dataLayer || [];\n  console.log("Analytics init");\n</script>'
                )
              }
              className="rounded-lg border border-slate-800 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
            >
              + Inline Script tag
            </button>
          </div>

          <textarea
            rows={5}
            value={customHeadScript}
            onChange={(e) => setCustomHeadScript(e.target.value)}
            placeholder="<script src='https://...' async></script>"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed"
          />
        </div>

        {/* Section 3: Webhook Integrations */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm space-y-6">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <Radio className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">Configuración de Webhooks Salientes</h2>
              <p className="text-xs text-slate-400">
                Disparadores automáticos por eventos para ERP, almacenes y mensajería.
              </p>
            </div>
          </div>

          {/* Webhook 1: product.updated */}
          <div className="space-y-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="font-mono text-cyan-400">product.updated</span>
                <span className="text-slate-400 font-normal">• Cambio de precio o stock</span>
              </label>
              <span className="text-[10px] uppercase font-mono text-slate-500">
                webhook_url_product_updated
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={webhookProductUpdated}
                onChange={(e) => setWebhookProductUpdated(e.target.value)}
                placeholder="https://api.tuempresa.com/webhooks/products"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => handleTestWebhook('product.updated', webhookProductUpdated)}
                disabled={testingEvent === 'product.updated'}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/50 hover:text-white transition-all disabled:opacity-50 shrink-0"
              >
                <Send className="h-3.5 w-3.5 text-cyan-400" />
                <span>
                  {testingEvent === 'product.updated' ? 'Probando...' : 'Probar Envío'}
                </span>
              </button>
            </div>

            {/* Test result feedback */}
            {testResults['product.updated'] && (
              <div
                className={`mt-2 flex items-center justify-between rounded-lg p-2.5 text-xs border ${
                  testResults['product.updated'].success
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResults['product.updated'].success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {testResults['product.updated'].message || testResults['product.updated'].error}
                  </span>
                </div>
                <div className="font-mono text-[11px] opacity-80 shrink-0">
                  {testResults['product.updated'].latencyMs}ms
                </div>
              </div>
            )}
          </div>

          {/* Webhook 2: order.paid */}
          <div className="space-y-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="font-mono text-emerald-400">order.paid</span>
                <span className="text-slate-400 font-normal">• Nuevo pedido completado</span>
              </label>
              <span className="text-[10px] uppercase font-mono text-slate-500">
                webhook_url_order_paid
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={webhookOrderPaid}
                onChange={(e) => setWebhookOrderPaid(e.target.value)}
                placeholder="https://api.tuempresa.com/webhooks/orders"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => handleTestWebhook('order.paid', webhookOrderPaid)}
                disabled={testingEvent === 'order.paid'}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/50 hover:text-white transition-all disabled:opacity-50 shrink-0"
              >
                <Send className="h-3.5 w-3.5 text-emerald-400" />
                <span>{testingEvent === 'order.paid' ? 'Probando...' : 'Probar Envío'}</span>
              </button>
            </div>

            {testResults['order.paid'] && (
              <div
                className={`mt-2 flex items-center justify-between rounded-lg p-2.5 text-xs border ${
                  testResults['order.paid'].success
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResults['order.paid'].success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {testResults['order.paid'].message || testResults['order.paid'].error}
                  </span>
                </div>
                <div className="font-mono text-[11px] opacity-80 shrink-0">
                  {testResults['order.paid'].latencyMs}ms
                </div>
              </div>
            )}
          </div>

          {/* Webhook 3: order.refunded */}
          <div className="space-y-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="font-mono text-amber-400">order.refunded</span>
                <span className="text-slate-400 font-normal">• Reembolso total o parcial</span>
              </label>
              <span className="text-[10px] uppercase font-mono text-slate-500">
                webhook_url_order_refunded
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={webhookOrderRefunded}
                onChange={(e) => setWebhookOrderRefunded(e.target.value)}
                placeholder="https://api.tuempresa.com/webhooks/refunds"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => handleTestWebhook('order.refunded', webhookOrderRefunded)}
                disabled={testingEvent === 'order.refunded'}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/50 hover:text-white transition-all disabled:opacity-50 shrink-0"
              >
                <Send className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  {testingEvent === 'order.refunded' ? 'Probando...' : 'Probar Envío'}
                </span>
              </button>
            </div>

            {testResults['order.refunded'] && (
              <div
                className={`mt-2 flex items-center justify-between rounded-lg p-2.5 text-xs border ${
                  testResults['order.refunded'].success
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResults['order.refunded'].success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    {testResults['order.refunded'].message || testResults['order.refunded'].error}
                  </span>
                </div>
                <div className="font-mono text-[11px] opacity-80 shrink-0">
                  {testResults['order.refunded'].latencyMs}ms
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Guardando Ajustes...' : 'Guardar Ajustes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
