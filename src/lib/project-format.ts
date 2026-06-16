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

/** Display hours with up to two decimal places when needed (e.g. 1.25, 1.5, 8). */
export function formatProjectHours(hours: number): string {
  if (!Number.isFinite(hours)) return "0";
  const rounded = Math.round(hours * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  const fixed = rounded.toFixed(2);
  return fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

type ProjectAmountFields = {
  design_amount?: number;
  /** @deprecated legacy local data */
  project_amount?: number;
  /** @deprecated legacy DB field name on in-memory projects */
  estimated_construction_value?: number;
};

export function getProjectDesignAmount(project: ProjectAmountFields): number | undefined {
  if (project.design_amount != null && Number.isFinite(project.design_amount)) {
    return project.design_amount;
  }
  if (project.project_amount != null && Number.isFinite(project.project_amount)) {
    return project.project_amount;
  }
  if (
    project.estimated_construction_value != null &&
    Number.isFinite(project.estimated_construction_value)
  ) {
    return project.estimated_construction_value;
  }
  return undefined;
}

export function getProjectEstimateValue(project: { estimate_value?: number }): number | undefined {
  if (project.estimate_value != null && Number.isFinite(project.estimate_value)) {
    return project.estimate_value;
  }
  return undefined;
}
