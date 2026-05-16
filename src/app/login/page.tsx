import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-slate-600">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
