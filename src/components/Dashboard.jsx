import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardContent() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Card>
        <CardContent>
          <p>Welcome to the dashboard!</p>
          <Button className="mt-4">Click Me</Button>
        </CardContent>
      </Card>
    </div>
  );
}
