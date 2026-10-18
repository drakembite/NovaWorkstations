// Tiny HTML reader for the tests (not a test itself). It answers one question: what would a
// crawler that runs no JavaScript see in the normal document flow? Text inside <script>, <style>,
// <template>, <head>, or inside any element with the `hidden` attribute (or an inline
// display:none) is NOT visible. The input is the output of React's renderToStaticMarkup /
// renderToString, which is well formed, so a small tokenizer that tracks open elements is enough.
// No dependency: package.json carries no HTML parser.

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);
const HIDDEN_TAGS = new Set(['script', 'style', 'template', 'head', 'title']);
const RAW_TEXT_TAGS = new Set(['script', 'style']);

export interface VisibleAnchor {
  href: string;
  text: string;
  attrs: Record<string, string>;
}

export interface VisibleDocument {
  /** Visible text, whitespace collapsed. */
  text: string;
  /** Anchors that sit outside any hidden element. */
  anchors: VisibleAnchor[];
  /** Count of elements carrying the `hidden` attribute (any depth). */
  hiddenElements: number;
  /** Count of <template> elements. */
  templates: number;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=\/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

export function extractVisible(html: string): VisibleDocument {
  const text: string[] = [];
  const anchors: VisibleAnchor[] = [];
  // Each open element records whether it makes its subtree hidden.
  const stack: Array<{ tag: string; hidden: boolean; anchor?: VisibleAnchor }> = [];
  let hiddenDepth = 0;
  let hiddenElements = 0;
  let templates = 0;
  let i = 0;

  const flushText = (raw: string) => {
    if (hiddenDepth > 0 || !raw) return;
    const t = decodeEntities(raw);
    text.push(t);
    for (const open of stack) if (open.anchor) open.anchor.text += t;
  };

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      flushText(html.slice(i));
      break;
    }
    flushText(html.slice(i, lt));

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html[lt + 1] === '!' || html[lt + 1] === '?') {
      const end = html.indexOf('>', lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    if (html[lt + 1] === '/') {
      const end = html.indexOf('>', lt);
      const tag = html.slice(lt + 2, end === -1 ? html.length : end).trim().toLowerCase();
      // Pop up to the matching open element (tolerates unclosed optional tags).
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].tag === tag) {
          while (stack.length > s) {
            const popped = stack.pop()!;
            if (popped.hidden) hiddenDepth--;
          }
          break;
        }
      }
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    // Opening tag: find its end, skipping quoted attribute values (they may contain '>').
    let j = lt + 1;
    let quote: string | null = null;
    while (j < html.length) {
      const c = html[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        break;
      }
      j++;
    }
    const inner = html.slice(lt + 1, j);
    const nameMatch = /^[a-zA-Z][^\s\/>]*/.exec(inner);
    if (!nameMatch) {
      flushText('<');
      i = lt + 1;
      continue;
    }
    const tag = nameMatch[0].toLowerCase();
    const attrs = parseAttrs(inner.slice(nameMatch[0].length));
    const selfClosing = inner.endsWith('/') || VOID_TAGS.has(tag);
    const style = (attrs.style ?? '').replace(/\s+/g, '').toLowerCase();
    const hasHidden = 'hidden' in attrs;
    const hides = HIDDEN_TAGS.has(tag) || hasHidden || style.includes('display:none');
    if (hasHidden) hiddenElements++;
    if (tag === 'template') templates++;

    let anchor: VisibleAnchor | undefined;
    if (tag === 'a' && hiddenDepth === 0 && !hides) {
      anchor = { href: attrs.href ?? '', text: '', attrs };
      anchors.push(anchor);
    }

    if (!selfClosing) {
      stack.push({ tag, hidden: hides, anchor });
      if (hides) hiddenDepth++;
    }
    i = j + 1;

    if (RAW_TEXT_TAGS.has(tag) && !selfClosing) {
      const close = html.toLowerCase().indexOf(`</${tag}`, i);
      i = close === -1 ? html.length : close; // raw text is skipped; the closing tag pops the stack
    }
  }

  for (const a of anchors) a.text = a.text.replace(/\s+/g, ' ').trim();
  return {
    text: text.join(' ').replace(/\s+/g, ' ').trim(),
    anchors,
    hiddenElements,
    templates,
  };
}
