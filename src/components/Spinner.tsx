import React from 'react';

/**
 * Small CSS spinner built only from Tailwind utilities. Decorative: the surrounding element
 * carries the accessible text. The rotation stops under `prefers-reduced-motion`.
 */
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none ${className}`}
    />
  );
}
