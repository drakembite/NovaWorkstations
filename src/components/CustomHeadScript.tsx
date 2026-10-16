import React from 'react';

interface CustomHeadScriptProps {
  script: string | null | undefined;
}

/**
 * Safely parses and injects custom head scripts (external script tags, inline scripts, or raw JS)
 * into Next.js <head> so they execute correctly without hydration errors.
 */
export function CustomHeadScript({ script }: CustomHeadScriptProps) {
  if (!script || !script.trim()) {
    return null;
  }

  const trimmed = script.trim();

  // If the script string contains <script> tags, parse and render them individually
  if (/<script\b/i.test(trimmed)) {
    const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    const matches = [...trimmed.matchAll(scriptRegex)];

    if (matches.length > 0) {
      return (
        <>
          {matches.map((match, index) => {
            const rawAttrs = match[1] || '';
            const innerCode = match[2] || '';

            const srcMatch = rawAttrs.match(/src=["']([^"']+)["']/i);
            const typeMatch = rawAttrs.match(/type=["']([^"']+)["']/i);
            const idMatch = rawAttrs.match(/id=["']([^"']+)["']/i);
            const isAsync = /\basync\b/i.test(rawAttrs);
            const isDefer = /\bdefer\b/i.test(rawAttrs);

            return (
              <script
                key={idMatch ? idMatch[1] : `head-script-${index}`}
                id={idMatch ? idMatch[1] : undefined}
                src={srcMatch ? srcMatch[1] : undefined}
                type={typeMatch ? typeMatch[1] : undefined}
                async={isAsync ? true : undefined}
                defer={isDefer ? true : undefined}
                dangerouslySetInnerHTML={
                  innerCode.trim() ? { __html: innerCode } : undefined
                }
              />
            );
          })}
        </>
      );
    }
  }

  // Fallback for raw JavaScript without enclosing <script> tags
  return (
    <script
      id="custom-head-script"
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  );
}
