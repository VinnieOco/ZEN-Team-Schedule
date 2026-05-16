import type { AppRole } from "@/lib/auth/roles";

export interface SetPasswordResponse {
  ok?: boolean;
  error?: string;
}

export async function setUserPassword(
  userId: string,
  password: string,
): Promise<SetPasswordResponse> {
  const res = await fetch("/api/admin/users/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password }),
  });
  const json = (await res.json()) as SetPasswordResponse;
  if (!res.ok) {
    return { error: json.error ?? "Could not update password" };
  }
  return json;
}

