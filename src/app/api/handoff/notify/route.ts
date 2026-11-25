import { NextResponse } from "next/server";
import { Resend } from "resend";

import { requireManagerOrAdmin } from "@/lib/auth/admin-api";
import { getSiteUrl } from "@/lib/auth/site-url";
import { completionSentence, completionSubject, isHandoffCompletion } from "@/lib/handoff/completion";

const PROJECT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LeadRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

function personName(row: Pick<LeadRow, "first_name" | "last_name">): string {
  return `${row.first_name} ${row.last_name}`.trim();
}

export async function POST(request: Request) {
  const auth = await requireManagerOrAdmin();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  let body: { projectId?: string; summary?: string };
  try {
    body = (await request.json()) as { projectId?: string; summary?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const projectId = body.projectId?.trim() ?? "";
  const summary = body.summary?.trim() ?? "";
  if (!PROJECT_ID.test(projectId) || !isHandoffCompletion(summary) || summary.length > 240) {
    return NextResponse.json({ error: "That handoff notice is not valid." }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, project_name, lead_employee_id, lead_estimator_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 });
  }
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const leadIds = [project.lead_employee_id, project.lead_estimator_id].filter(
    (id): id is string => Boolean(id),
  );
  const { data: leads, error: leadError } = leadIds.length
    ? await supabase
        .from("employees")
        .select("id, first_name, last_name, email")
        .in("id", leadIds)
    : { data: [] as LeadRow[], error: null };

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 });
  }

  const byId = new Map((leads ?? []).map((lead) => [lead.id, lead as LeadRow]));
  const designer = project.lead_employee_id ? byId.get(project.lead_employee_id) : undefined;
  const estimator = project.lead_estimator_id ? byId.get(project.lead_estimator_id) : undefined;
  const recipients = uniqueRecipients([designer, estimator]);

  if (recipients.length === 0) {
    return NextResponse.json({
      sent: false,
      message:
        "No email sent. Add an email for the lead designer and lead estimator on the team list.",
    });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return NextResponse.json({
      sent: false,
      message: `Email is not turned on yet. ${recipientNames(recipients)} would be notified once Resend is configured.`,
    });
  }

  const { data: actor } = await supabase
    .from("employees")
    .select("first_name, last_name")
    .eq("profile_id", user.id)
    .maybeSingle();
  const actorName = actor ? personName(actor) : user.email ?? "A teammate";
  const link = `${getSiteUrl(request)}/projects/${project.id}?tab=handoff`;
  const text = [
    completionSentence(project.project_name, summary),
    "",
    `${actorName} recorded: ${summary}`,
    "",
    `Open the handoff: ${link}`,
  ].join("\n");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: recipients.map((lead) => lead.email),
    subject: completionSubject(project.project_name, summary),
    text,
  });

  if (error) {
    return NextResponse.json(
      { sent: false, message: `The handoff was saved, but the email failed: ${error.message}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    sent: true,
    message: `Emailed ${recipientNames(recipients)}.`,
  });
}

function uniqueRecipients(leads: Array<LeadRow | undefined>): Array<LeadRow & { email: string }> {
  const seen = new Set<string>();
  const recipients: Array<LeadRow & { email: string }> = [];
  for (const lead of leads) {
    const email = lead?.email?.trim().toLowerCase();
    if (!lead || !email || seen.has(email)) continue;
    seen.add(email);
    recipients.push({ ...lead, email });
  }
  return recipients;
}

function recipientNames(leads: Array<Pick<LeadRow, "first_name" | "last_name">>): string {
  return leads.map(personName).join(" and ");
}
