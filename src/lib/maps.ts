/** Google Maps search link for a free-form address, or undefined when blank. */
export function googleMapsUrl(address?: string): string | undefined {
  const query = address?.trim();
  if (!query) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
