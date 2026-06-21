import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  useListBroadcasts,
  useCreateBroadcast,
  useDeleteBroadcast,
  useSendBroadcast,
  useListTemplates,
  useListContactLists,
  getListBroadcastsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Send, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sending: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function Broadcasts() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", templateId: "", listId: "" });

  const { data: broadcasts, isLoading } = useListBroadcasts();
  const { data: templates } = useListTemplates();
  const { data: lists } = useListContactLists();
  const createMutation = useCreateBroadcast();
  const deleteMutation = useDeleteBroadcast();
  const sendMutation = useSendBroadcast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListBroadcastsQueryKey() });

  async function submitCreate() {
    await createMutation.mutateAsync({
      data: {
        name: form.name,
        templateId: parseInt(form.templateId),
        listId: parseInt(form.listId),
      },
    });
    invalidate();
    setIsCreateOpen(false);
    setForm({ name: "", templateId: "", listId: "" });
    toast({ title: "Broadcast created" });
  }

  async function submitDelete() {
    if (!selectedId) return;
    await deleteMutation.mutateAsync({ id: selectedId });
    invalidate();
    setIsDeleteOpen(false);
    toast({ title: "Broadcast deleted" });
  }

  async function submitSend() {
    if (!selectedId) return;
    try {
      const result = await sendMutation.mutateAsync({ id: selectedId });
      invalidate();
      setIsSendOpen(false);
      toast({ title: `Sent! ${result.sent} messages sent, ${result.failed} failed.` });
    } catch (err: any) {
      toast({ title: "Send failed", description: err?.message ?? "Unknown error", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Broadcasts</h1>
          <p className="text-muted-foreground mt-1">Create and send bulk WhatsApp campaigns</p>
        </div>
        <Button onClick={() => { setForm({ name: "", templateId: "", listId: "" }); setIsCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Broadcast
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : !broadcasts || broadcasts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Send className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No broadcasts yet</p>
            <p className="text-sm mt-1">Create a broadcast campaign to send messages to your contacts</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => {
            const total = b.totalCount || 1;
            const deliveredPct = Math.round(((b.deliveredCount + b.readCount) / total) * 100);
            const readPct = Math.round((b.readCount / total) * 100);
            return (
              <Card key={b.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">{b.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[b.status] ?? ""}`}>
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {b.templateName && <span>Template: <strong>{b.templateName}</strong></span>}
                        {b.listName && <span className="ml-3">List: <strong>{b.listName}</strong></span>}
                      </div>
                      {b.status !== "draft" && (
                        <div className="mt-3 space-y-1.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Delivered</span>
                            <span>{b.deliveredCount + b.readCount}/{b.totalCount}</span>
                          </div>
                          <Progress value={deliveredPct} className="h-1.5" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Read</span>
                            <span>{b.readCount}/{b.totalCount}</span>
                          </div>
                          <Progress value={readPct} className="h-1.5" />
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        Created {new Date(b.createdAt).toLocaleDateString()}
                        {b.sentAt && ` · Sent ${new Date(b.sentAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="icon" onClick={() => navigate(`/broadcasts/${b.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {b.status === "draft" && (
                        <Button
                          size="icon"
                          onClick={() => { setSelectedId(b.id); setIsSendOpen(true); }}
                          disabled={sendMutation.isPending}
                        >
                          {sendMutation.isPending && selectedId === b.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { setSelectedId(b.id); setIsDeleteOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Broadcast</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Campaign Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramadan Promotion" /></div>
            <div>
              <Label>Message Template *</Label>
              <Select value={form.templateId} onValueChange={(v) => setForm({ ...form, templateId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.status})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contact List *</Label>
              <Select value={form.listId} onValueChange={(v) => setForm({ ...form, listId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a list" /></SelectTrigger>
                <SelectContent>
                  {lists?.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name} ({l.contactCount} contacts)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={!form.name || !form.templateId || !form.listId || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Confirmation */}
      <AlertDialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Broadcast</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the broadcast to all contacts in the selected list via WhatsApp Business API. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitSend} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? "Sending..." : "Send Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Broadcast</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will delete the broadcast and all its message records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
