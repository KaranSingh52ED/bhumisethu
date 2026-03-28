/** Display label for `landCategory` from API. */
export function landCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    residential: 'Residential',
    commercial: 'Commercial',
    industrial: 'Industrial',
    agricultural: 'Agricultural',
    mixed: 'Mixed use',
  };
  return map[category] ?? category;
}

export function listingStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Admin review';
    case 'reviewed':
      return 'KYL complete';
    default:
      return status;
  }
}

export function formatUpdatedShort(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 14) return `Updated ${days} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
