/**
 * Utility to extract workbook ID from the current URL path.
 * Supports /workbook/[id] and /dashboard/[id] patterns.
 */
export const getWorkbookIdFromUrl = (): string => {
  if (typeof window === 'undefined') return 'default';
  const path = window.location.pathname;
  const match = path.match(/\/(workbook|dashboard)\/([^/]+)/);
  return match ? match[2] : 'default';
};
