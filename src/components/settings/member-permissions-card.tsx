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
        <CardTitle>Member access</CardTitle>
        <CardDescription>
          What people with the Member app role can do. Admins have full access. Link a schedule team
          member to a login (email match or profile link) so members can log their own time.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Area</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Member</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSION_MATRIX.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-muted-foreground">{row.admin}</TableCell>
                <TableCell className="text-muted-foreground">{row.member}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
