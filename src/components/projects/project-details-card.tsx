"use client";

import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { Building2, Calendar, GitMerge, Mail, MapPin, Pencil, Phone, Trash2 } from "lucide-react";

import { ClientCrmLink } from "@/components/crm/client-crm-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Employee, Project } from "@/types";
import type { ProjectBudgetRollup } from "@/lib/change-orders";
import { googleMapsUrl } from "@/lib/maps";
import { formatProjectAmount, formatProjectDepartment, getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import { getEmployeeFullName } from "@/lib/week";

interface ProjectDetailsCardProps {
  project: Project;
  lead: Employee | null | undefined;
  leadEstimator?: Employee | null | undefined;
  budgetRollup?: ProjectBudgetRollup;
  canEdit: boolean;
  onEdit: () => void;
  onMerge?: () => void;
  onDelete?: () => void;
}

function ContactRow({
  icon: Icon,
  children,
}: {
  icon: typeof MapPin;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 font-medium leading-snug">{children}</div>
    </div>
  );
}

function InfoField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{children}</p>
    </div>
  );
}

export function ProjectDetailsCard({
  project,
  lead,
  leadEstimator,
  budgetRollup,
  canEdit,
  onEdit,
  onMerge,
  onDelete,
}: ProjectDetailsCardProps) {
  const designAmount = budgetRollup?.totalDesignAmount ?? getProjectDesignAmount(project);
  const estimateAmount = budgetRollup?.totalEstimateAmount ?? getProjectEstimateValue(project);
  const showDesignRollup = Boolean(
    budgetRollup && budgetRollup.changeOrderCount > 0 && budgetRollup.changeOrderDesignAmount > 0,
  );
  const showEstimateParts = Boolean(
    budgetRollup &&
      (budgetRollup.contractCount > 0 || budgetRollup.changeOrderEstimateAmount > 0),
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">Project details</CardTitle>
        {canEdit && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onEdit}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            {onMerge ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={onMerge}
              >
                <GitMerge className="mr-2 h-4 w-4" />
                Merge
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="col-span-2 w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 sm:col-auto sm:w-auto"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : null}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-4 sm:space-y-6 sm:pt-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-lg border border-border/80 bg-slate-50/60 p-3 sm:p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client
            </h3>
            <ClientCrmLink
              clientName={project.client_name}
              className="text-base font-semibold text-slate-900 hover:text-emerald-900 sm:text-lg"
            />
            <div className="space-y-3 border-t border-border/60 pt-4">
              <ContactRow icon={MapPin}>
                {project.address?.trim() ? (
                  <a
                    href={googleMapsUrl(project.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="break-words whitespace-pre-wrap hover:underline"
                  >
                    {project.address.trim()}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No address on file</span>
                )}
              </ContactRow>
              <ContactRow icon={Phone}>
                {project.phone?.trim() ? (
                  <a href={`tel:${project.phone.trim()}`} className="hover:underline">
                    {project.phone.trim()}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No phone on file</span>
                )}
              </ContactRow>
              <ContactRow icon={Mail}>
                {project.email?.trim() ? (
                  <a
                    href={`mailto:${project.email.trim()}`}
                    className="break-all hover:underline"
                  >
                    {project.email.trim()}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No email on file</span>
                )}
              </ContactRow>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-border/80 bg-slate-50/60 p-3 sm:p-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Project information
            </h3>
            <dl className="grid grid-cols-2 gap-3 sm:gap-4">
              <InfoField label="Lead designer">
                {lead ? getEmployeeFullName(lead) : "—"}
              </InfoField>
              <InfoField label="Lead estimator">
                {leadEstimator ? getEmployeeFullName(leadEstimator) : "—"}
              </InfoField>
              <InfoField label="Department">
                {formatProjectDepartment(project.department)}
              </InfoField>
              <InfoField label="Design amount">
                {formatProjectAmount(designAmount)}
                {showDesignRollup && budgetRollup && (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    incl. {formatProjectAmount(budgetRollup.changeOrderDesignAmount)} from COs
                  </span>
                )}
              </InfoField>
              <InfoField label="Estimate amount">
                {formatProjectAmount(estimateAmount)}
                {showEstimateParts && budgetRollup && (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {[
                      budgetRollup.contractCount > 0
                        ? `${formatProjectAmount(budgetRollup.contractEstimateAmount)} contracts`
                        : null,
                      budgetRollup.changeOrderEstimateAmount > 0
                        ? `${formatProjectAmount(budgetRollup.changeOrderEstimateAmount)} COs`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </InfoField>
              <InfoField label="Design completion">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="sm:hidden">
                    {project.target_completion_date
                      ? format(parseISO(project.target_completion_date), "MMM d, yyyy")
                      : "—"}
                  </span>
                  <span className="hidden sm:inline">
                    {project.target_completion_date
                      ? format(parseISO(project.target_completion_date), "MMMM d, yyyy")
                      : "—"}
                  </span>
                </span>
              </InfoField>
              <InfoField label="Estimating completion">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="sm:hidden">
                    {project.estimating_completion_date
                      ? format(parseISO(project.estimating_completion_date), "MMM d, yyyy")
                      : "—"}
                  </span>
                  <span className="hidden sm:inline">
                    {project.estimating_completion_date
                      ? format(parseISO(project.estimating_completion_date), "MMMM d, yyyy")
                      : "—"}
                  </span>
                </span>
              </InfoField>
              <InfoField label="Contract date">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="sm:hidden">
                    {project.contract_date
                      ? format(parseISO(project.contract_date), "MMM d, yyyy")
                      : "—"}
                  </span>
                  <span className="hidden sm:inline">
                    {project.contract_date
                      ? format(parseISO(project.contract_date), "MMMM d, yyyy")
                      : "—"}
                  </span>
                </span>
              </InfoField>
            </dl>
          </section>
        </div>

        <section className="rounded-lg border border-border/80 p-3 sm:p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Scope of work
          </h3>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
            {project.scope_of_work?.trim() || (
              <span className="text-muted-foreground">No scope of work provided.</span>
            )}
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
