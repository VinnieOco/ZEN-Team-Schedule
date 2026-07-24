import { redirect } from "next/navigation";

/** Design queue moved into Pipeline → Design (Kanban). Estimating follows in Phase 4. */
export default function QueuePage() {
  redirect("/pipeline?tab=design&view=kanban");
}
