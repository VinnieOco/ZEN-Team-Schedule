import { redirect } from "next/navigation";

import { DEFAULT_APP_PATH } from "@/lib/routes";

export default function HomePage() {
  redirect(DEFAULT_APP_PATH);
}
