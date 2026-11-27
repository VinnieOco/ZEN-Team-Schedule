export interface PageGuide {
  title: string;
  body: string;
}

const APP_MAP = `ZEN Team Schedule is the team's resource planning app for a landscape design department. People use it to see who is working on which project, move work through the pipeline, log hours, and keep client and project records.

The left sidebar is how you move around. What you see depends on your role:
- Admin: everything, including invites and roles in Settings → Team access.
- Manager: day-to-day work, including the schedule, projects, CRM, reports, and company settings. Managers cannot invite people or change app roles.
- Office Team: the team schedule (edit your own row), CRM, projects, and reports. You log only your own time. Settings is view-only.
- Crew Team: the team schedule (view only) and your own time. CRM, projects, reports, and Settings are hidden.

A chat button sits at the bottom right of the work area. Ask it how to do something, or ask about a process from the SOPs an admin uploaded in Settings. On any other question it reads the live records on every page this person can open.`;

const PAGES: { prefix: string; guide: PageGuide }[] = [
  {
    prefix: "/scheduling",
    guide: {
      title: "Team Scheduling",
      body: "Team Scheduling is the weekly board. Each person is a row. Each day shows the projects and hours they are assigned. To put someone on a project, add an allocation on their row for that day and enter the hours. Admins can edit anyone. Managers edit their department. Office Team can edit their own row. Crew Team can look, but not change the board. Capacity is the hours that person can take that day; the board warns when a day is over that. The week follows the company work week in Settings.",
    },
  },
  {
    prefix: "/time-tracking",
    guide: {
      title: "Time Tracking",
      body: "Time Tracking is where actual hours are logged, as opposed to the planned hours on the schedule. Log the date, project, category, and hours. Admins and managers can enter time for anyone. Office Team and Crew Team can enter only their own hours, and their login has to be linked to their row on the schedule team. Timesheets include Saturday and Sunday even when the schedule hides weekends.",
    },
  },
  {
    prefix: "/projects",
    guide: {
      title: "Projects",
      body: "Projects holds each job: client, status, phase, lead designer, estimator, dates, notes, contracts, change orders, and handoff checklists. Open a project to see its detail. Office Team can view and edit but cannot delete a project. Crew Team does not see Projects.",
    },
  },
  {
    prefix: "/gantt",
    guide: {
      title: "Schedules",
      body: "Schedules is the Gantt view of project timing. Use it when you want the span of a job rather than who is assigned each day. Day-by-day people assignments live on Team Scheduling.",
    },
  },
  {
    prefix: "/pipeline",
    guide: {
      title: "Pipeline",
      body: "Pipeline is the path from a lead to estimating, design, and construction. Move a lead or estimate through its stages there. The construction WIP schedule, with cost and billing figures, is for admins. Managers and Office Team do not see those figures.",
    },
  },
  {
    prefix: "/crm",
    guide: {
      title: "CRM",
      body: "CRM is the client and lead list. Open a client for contacts and notes. Leads can be added and followed up from here and from the pipeline. Crew Team does not see CRM.",
    },
  },
  {
    prefix: "/reports",
    guide: {
      title: "Reports",
      body: "Reports compare the plan with what happened: scheduled versus actual hours, project budgets, and the WIP schedule export. Admins and managers can export CSV. Office Team can view reports. Crew Team does not see Reports.",
    },
  },
  {
    prefix: "/todos",
    guide: {
      title: "To-dos",
      body: "To-dos are the short task list. Admins and managers see everyone's to-dos and can add or delete them. Office Team and Crew Team see and complete their own.",
    },
  },
  {
    prefix: "/dashboard",
    guide: {
      title: "Dashboard",
      body: "Dashboard is the home view of what needs attention. For the weekly people-and-project board, open Team Scheduling. For a single job, open Projects.",
    },
  },
  {
    prefix: "/settings",
    guide: {
      title: "Settings",
      body: "Settings holds company defaults (daily and weekly capacity, and whether the schedule includes weekends), schedule categories, pipeline stages, and the schedule team. Admins also get Team access: invites, app roles, and linking a login to a person on the schedule. Process documents for the chat are uploaded here by an admin, under Help documents. Managers can edit company defaults and the team list, but not invites or roles. Office Team can view company defaults. Crew Team does not see Settings.",
    },
  },
];

export function guideForPath(pathname: string): PageGuide | null {
  const path = pathname.split("?")[0] ?? pathname;
  return PAGES.find((page) => path === page.prefix || path.startsWith(`${page.prefix}/`))?.guide ?? null;
}

/** Notes the chat can use even when no SOP has been uploaded. */
export function appGuideNotes(pathname: string): string {
  const page = guideForPath(pathname);
  const here = page
    ? `The person is on ${page.title}. ${page.body}`
    : "The person is somewhere in the signed-in app.";
  return `${APP_MAP}\n\n${here}`;
}
