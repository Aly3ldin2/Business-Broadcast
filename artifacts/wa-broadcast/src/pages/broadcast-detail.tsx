import { useLocation } from "wouter";
import { useGetBroadcast } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCheck, Check, Clock, X } from "lucide-react";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  sent: <Check className="h-3.5 w-3.5 text-blue-500" />,
  delivered: <CheckCheck className="h-3.5 w-3.5 text-green-500" />,
  read: <CheckCheck className="h-3.5 w-3.5 text-blue-600" />,
  pending: <Clock className="h-3.5 w-3.5 text-gray-400" />,
  failed: <X className="h-3.5 w-3.5 text-red-500" />,
};

interface Props {
  id: string;
}

export default function BroadcastDetail({ id }: Props) {
  const [, navigate] = useLocation();
  const broadcastId = parseInt(id);
  const { data: broadcast, isLoading } = useGetBroadcast(broadcastId, {
    query: { enabled: !!broadcastId },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!broadcast) {
    return <div className="text-muted-foreground p-4">Broadcast not found.</div>;
  }

  const total = broadcast.totalCount || 1;
  const deliveredPct = Math.round(((broadcast.deliveredCount + broadcast.readCount) / total) * 100);
  const readPct = Math.round((broadcast.readCount / total) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/broadcasts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{broadcast.name}</h1>
          <p className="text-muted-foreground text-sm">
            {broadcast.templateName && `Template: ${broadcast.templateName}`}
            {broadcast.listName && ` · List: ${broadcast.listName}`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total", value: broadcast.totalCount, color: "text-gray-700" },
          { label: "Sent", value: broadcast.sentCount, color: "text-blue-600" },
          { label: "Delivered", value: broadcast.deliveredCount + broadcast.readCount, color: "text-green-600" },
          { label: "Read", value: broadcast.readCount, color: "text-emerald-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Delivery Rate</span>
              <span className="font-medium">{deliveredPct}%</span>
            </div>
            <Progress value={deliveredPct} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Read Rate</span>
              <span className="font-medium">{readPct}%</span>
            </div>
            <Progress value={readPct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Messages ({broadcast.messages?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Contact</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {broadcast.messages?.map((msg) => (
                  <tr key={msg.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{msg.contactName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{msg.contactPhone}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICONS[msg.status]}
                        <span className="capitalize">{msg.status}</span>
                        {msg.errorMessage && (
                          <span className="text-xs text-red-500 ml-1">({msg.errorMessage})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!broadcast.messages || broadcast.messages.length === 0) && (
              <div className="p-8 text-center text-muted-foreground">No messages yet. Send the broadcast first.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
