import { getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import type { Project, ProjectFormValues } from "@/types";

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function optionalAmount(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value) || value < 0) return undefined;
  return value;
}

/** Build form values from an existing project for updateProject. */
export function projectToFormValues(project: Project): ProjectFormValues {
  return {
    project_name: project.project_name,
    client_name: project.client_name,
    department: project.department,
    phase: project.phase,
    lead_employee_id: project.lead_employee_id,
    lead_estimator_id: project.lead_estimator_id,
    budgeted_design_hours: project.budgeted_design_hours,
    contract_date: project.contract_date,
    target_completion_date: project.target_completion_date,
    estimating_completion_date: project.estimating_completion_date,
    design_amount: getProjectDesignAmount(project),
    estimate_value: getProjectEstimateValue(project),
    scope_of_work: project.scope_of_work,
    address: project.address,
    phone: project.phone,
    email: project.email,
    active: project.active,
    parent_project_id: project.parent_project_id,
    is_change_order: project.is_change_order,
  };
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
    department: optionalText(values.department),
    phase: values.phase,
    lead_employee_id: optionalText(values.lead_employee_id),
    lead_estimator_id: optionalText(values.lead_estimator_id),
    budgeted_design_hours: budgeted,
    contract_date: optionalText(values.contract_date),
    target_completion_date: optionalText(values.target_completion_date),
    estimating_completion_date: optionalText(values.estimating_completion_date),
    design_amount: optionalAmount(values.design_amount),
    estimate_value: optionalAmount(values.estimate_value),
    scope_of_work: optionalText(values.scope_of_work),
    address: optionalText(values.address),
    phone: optionalText(values.phone),
    email: optionalText(values.email),
    parent_project_id: optionalText(values.parent_project_id),
    is_change_order: values.is_change_order ?? base.is_change_order ?? false,
  };
}
