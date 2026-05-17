"use client";

interface MemberAccessBannerProps {
  linkedEmployeeId: string | null;
}

export function MemberAccessBanner({ linkedEmployeeId }: MemberAccessBannerProps) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p className="font-medium">Member access</p>
      <p className="mt-1 text-amber-800/90">
        You can view the full team schedule and reports, edit allocations on your own row, and view
        projects. Project edits, CSV exports, and team management require an admin or manager.
      </p>
      {!linkedEmployeeId && (
        <p className="mt-2 text-amber-900">
          Link your account below to edit your schedule row and log time. If your email is already on
          the schedule team, use &quot;Link my account&quot;; otherwise ask an admin to add your email
          or link you under Team access.
        </p>
      )}
    </div>
  );
}
