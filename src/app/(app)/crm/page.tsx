import { AppPage } from "@/components/layout/app-page";
import { ClientsTable } from "@/components/crm/clients-table";

export default function CrmPage() {
  return (
    <AppPage>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clients and contact information linked to their projects.
        </p>
      </div>
      <ClientsTable />
    </AppPage>
  );
}
