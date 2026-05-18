import type { Project, ProjectFormValues } from "@/types";

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function optionalAmount(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value) || value < 0) return undefined;
  return value;
}

/** Normalize project form values before save (empty strings, invalid UUIDs, NaN hours). */
export function projectFromFormValues(
  values: ProjectFormValues,
  base: Pick<Project, "id" | "active"> & Partial<Project>,
): Project {
  const hours = values.budgeted_design_hours;
  const budgeted =
    typeof hours === "number" && Number.isFinite(hours) && hours >= 0 ? hours : 0;

  return {
    ...base,
    id: base.id,
    active: values.active ?? base.active,
    project_name: values.project_name.trim(),
    client_name: values.client_name.trim(),
    status: values.status,
    phase: values.phase,
    lead_employee_id: optionalText(values.lead_employee_id),
    budgeted_design_hours: budgeted,
    contract_date: optionalText(values.contract_date),
    target_completion_date: optionalText(values.target_completion_date),
    project_amount: optionalAmount(values.project_amount),
    estimated_construction_value: optionalAmount(values.project_amount),
    scope_of_work: optionalText(values.scope_of_work),
    address: optionalText(values.address),
    phone: optionalText(values.phone),
    email: optionalText(values.email),
  };
}
