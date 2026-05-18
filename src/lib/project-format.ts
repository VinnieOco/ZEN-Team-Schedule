export function formatProjectAmount(amount?: number): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatProjectDepartment(department?: string): string {
  const trimmed = department?.trim();
  return trimmed || "—";
}
