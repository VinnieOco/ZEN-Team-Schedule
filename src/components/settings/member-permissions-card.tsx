"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PERMISSION_MATRIX } from "@/lib/auth/permissions";

export function MemberPermissionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>App roles</CardTitle>
        <CardDescription>
          What each app role can do. Link schedule team members to logins so members can log their own
          time.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Area</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Member</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSION_MATRIX.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-muted-foreground">{row.admin}</TableCell>
                <TableCell className="text-muted-foreground">{row.manager}</TableCell>
                <TableCell className="text-muted-foreground">{row.member}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
