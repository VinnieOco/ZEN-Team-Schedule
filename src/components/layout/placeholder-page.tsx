import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="p-4 md:p-8">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description ?? "Planned for a future release."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This section will be available in a future update.
        </CardContent>
      </Card>
    </div>
  );
}
