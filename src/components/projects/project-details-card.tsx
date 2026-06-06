"use client";

import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { Building2, Calendar, Mail, MapPin, Pencil, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Employee, Project } from "@/types";
import { formatProjectAmount, formatProjectDepartment, getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import { getEmployeeFullName } from "@/lib/week";

interface ProjectDetailsCardProps {
  project: Project;
  lead: Employee | null | undefined;
  canEdit: boolean;
  onEdit: () => void;
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
  canEdit,
  onEdit,
}: ProjectDetailsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b pb-4">
        <CardTitle className="text-base">Project details</CardTitle>
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-lg border border-border/80 bg-slate-50/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client
            </h3>
            <p className="text-lg font-semibold text-slate-900">
              {project.client_name?.trim() || "—"}
            </p>
            <div className="space-y-3 border-t border-border/60 pt-4">
              <ContactRow icon={MapPin}>
                {project.address?.trim() ? (
                  <span className="whitespace-pre-wrap">{project.address.trim()}</span>
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
                  <a href={`mailto:${project.email.trim()}`} className="hover:underline">
                    {project.email.trim()}
                  </a>
                ) : (
                  <span className="text-muted-foreground">No email on file</span>
                )}
              </ContactRow>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-border/80 bg-slate-50/60 p-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Project information
            </h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Lead designer">
                {lead ? getEmployeeFullName(lead) : "—"}
              </InfoField>
              <InfoField label="Department">
                {formatProjectDepartment(project.department)}
              </InfoField>
              <InfoField label="Design amount">
                {formatProjectAmount(getProjectDesignAmount(project))}
              </InfoField>
              <InfoField label="Estimate amount">
                {formatProjectAmount(getProjectEstimateValue(project))}
              </InfoField>
              <InfoField label="Contract date">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  {project.contract_date
                    ? format(parseISO(project.contract_date), "MMMM d, yyyy")
                    : "—"}
                </span>
              </InfoField>
              <InfoField label="Target completion">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  {project.target_completion_date
                    ? format(parseISO(project.target_completion_date), "MMMM d, yyyy")
                    : "—"}
                </span>
              </InfoField>
            </dl>
          </section>
        </div>

        <section className="rounded-lg border border-border/80 p-4">
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
