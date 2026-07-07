"use client";

import { useScheduling } from "@/context/scheduling-context";
import { splitMentionSegments } from "@/lib/todos/mentions";
import { cn } from "@/lib/utils";

interface MentionTextProps {
  text: string;
  className?: string;
}

export function MentionText({ text, className }: MentionTextProps) {
  const { employees } = useScheduling();
  const segments = splitMentionSegments(text, employees);

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {segments.map((segment, index) =>
        segment.type === "mention" ? (
          <span
            key={`${index}-${segment.handle}`}
            className="rounded bg-emerald-50 px-0.5 font-medium text-emerald-800"
          >
            {segment.value}
          </span>
        ) : (
          <span key={`${index}-text`}>{segment.value}</span>
        ),
      )}
    </span>
  );
}
