// Shared helpers for the SEO assertions in the SSR test scripts (not a test itself).
import React from 'react';

export const STORE_NAME = 'NovaWorkstations';
export const FALLBACK_SITE_URL = 'https://novaworkstations.com';

/** Mimics how Next resolves a page title against the root layout title object. */
export function resolveTitle(rootTitle: unknown, pageTitle: unknown): string {
  const root = rootTitle as { default?: string; template?: string } | string | undefined;
  if (pageTitle && typeof pageTitle === 'object') {
    const t = pageTitle as { absolute?: string; default?: string; template?: string };
    if (typeof t.absolute === 'string') return t.absolute;
    if (typeof t.default === 'string') return t.default;
  }
  if (typeof pageTitle === 'string') {
    if (root && typeof root === 'object' && typeof root.template === 'string') {
      return root.template.replace('%s', pageTitle);
    }
    return pageTitle;
  }
  return typeof root === 'string' ? root : root?.default ?? '';
}

export function countOccurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

/** Depth-first walk over a React element tree (host elements only are expanded). */
export function findElements(
  node: unknown,
  predicate: (el: React.ReactElement<any>) => boolean,
  found: React.ReactElement<any>[] = []
): React.ReactElement<any>[] {
  if (Array.isArray(node)) {
    node.forEach((child) => findElements(child, predicate, found));
  } else if (React.isValidElement(node)) {
    const el = node as React.ReactElement<any>;
    if (predicate(el)) found.push(el);
    findElements(el.props?.children, predicate, found);
  }
  return found;
}

/** Concatenated text leaves of a subtree, in order. */
export function textLeaves(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach((child) => textLeaves(child, out));
  } else if (typeof node === 'string' || typeof node === 'number') {
    const s = String(node).trim();
    if (s) out.push(s);
  } else if (React.isValidElement(node)) {
    textLeaves((node as React.ReactElement<any>).props?.children, out);
  }
  return out;
}

/** Parsed contents of every <script type="application/ld+json"> in the tree. */
export function getJsonLdBlocks(tree: unknown): any[] {
  return findElements(
    tree,
    (el) => el.type === 'script' && el.props?.type === 'application/ld+json'
  ).map((el) => JSON.parse(el.props.dangerouslySetInnerHTML.__html));
}

/** Runs `fn` with NEXT_PUBLIC_SITE_URL set (or deleted when undefined), then restores it. */
export async function withSiteUrl<T>(value: string | undefined, fn: () => Promise<T>): Promise<T> {
  const env = process.env as Record<string, string | undefined>;
  const previous = env.NEXT_PUBLIC_SITE_URL;
  if (value === undefined) delete env.NEXT_PUBLIC_SITE_URL;
  else env.NEXT_PUBLIC_SITE_URL = value;
  try {
    return await fn();
  } finally {
    if (previous === undefined) delete env.NEXT_PUBLIC_SITE_URL;
    else env.NEXT_PUBLIC_SITE_URL = previous;
  }
}
