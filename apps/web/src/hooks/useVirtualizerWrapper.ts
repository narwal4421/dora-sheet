'use no memo';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * A wrapper for useVirtualizer that is opted-out of the React Compiler.
 * We use the (0, useVirtualizer) pattern to bypass static analysis warnings.
 */
export function useVirtualizerWrapper<TScrollElement extends Element, TItemElement extends Element>(
  options: Parameters<typeof useVirtualizer<TScrollElement, TItemElement>>[0]
) {
  // @ts-expect-error - Bypassing compiler static analysis for incompatible library
  return (0, useVirtualizer)(options);
}
