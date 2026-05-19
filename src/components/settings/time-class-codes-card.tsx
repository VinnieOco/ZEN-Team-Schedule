"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScheduling } from "@/context/scheduling-context";
import { appendClassCode, removeFromList, resolveClassCodes } from "@/lib/time-class-options";

interface TimeClassCodesCardProps {
  canEdit: boolean;
}

export function TimeClassCodesCard({ canEdit }: TimeClassCodesCardProps) {
  const { settings, updateSettings } = useScheduling();
  const [newCode, setNewCode] = useState("");

  const classCodes = resolveClassCodes(settings);

  const addCode = () => {
    const next = appendClassCode(settings, newCode);
    if (next) {
      updateSettings({ class_codes: next });
      setNewCode("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time tracking class codes</CardTitle>
        <CardDescription>
          Class codes appear on the log-time timesheet after Notes. Add the codes your team should
          choose when logging hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Label>Class codes</Label>
        {classCodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No class codes yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {classCodes.map((code) => (
              <li
                key={code}
                className="flex items-center gap-1 rounded-full border bg-slate-50 px-2.5 py-1 text-sm text-slate-800"
              >
                <span>{code}</span>
                {canEdit && (
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-slate-900"
                    onClick={() =>
                      updateSettings({ class_codes: removeFromList(classCodes, code) })
                    }
                    aria-label={`Remove ${code}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="e.g. BILL, OH, PTO"
              className="min-w-[180px] flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCode();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addCode} disabled={!newCode.trim()}>
              Add class code
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
