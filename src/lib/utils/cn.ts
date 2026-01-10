import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging Tailwind CSS classes with proper conflict resolution.
 * Uses clsx for conditionals + tailwind-merge for deduplication.
 * 
 * @example
 * cn('p-4', 'mt-2')               // 'p-4 mt-2'
 * cn('p-4', 'p-8')                // 'p-8' (last wins)
 * cn('base', isActive && 'ring') // conditionals
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
