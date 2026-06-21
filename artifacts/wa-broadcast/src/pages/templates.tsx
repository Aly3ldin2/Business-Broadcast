import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  getListTemplatesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-800",
};

export default function Templates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    language: "ar",
    category: "MARKETING" as "MARKETING" | "UTILITY" | "AUTHENTICATION",
    body: "",
    headerText: "",
    footerText: "",
  });

  const { data: templates, isLoading } = useListTemplates();
  const createMutation = useCreateTemplate();
  const deleteMutation = useDeleteTemplate();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });

  async function submitCreate() {
    await createMutation.mutateAsync({ data: form });
    invalidate();
    setIsCreateOpen(false);
    toast({ title: "Template created. Note: Templates must be approved by Meta before use." });
  }

  async function submitDelete() {
    if (!selectedId) return;
    await deleteMutation.mutateAsync({ id: selectedId });
    invalidate();
    setIsDeleteOpen(false);
    toast({ title: "Template deleted" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-1">Manage your WhatsApp message templates</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>Important:</strong> WhatsApp requires that all templates be approved by Meta before you can send them in broadcasts. Templates saved here with "Pending" status must be submitted through the Meta Business Manager for approval.
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No templates yet</p>
            <p className="text-sm mt-1">Create a message template to start broadcasting</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{t.language}</Badge>
                      <Badge variant="outline" className="text-xs">{t.category}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? ""}`}>
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { setSelectedId(t.id); setIsDeleteOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {t.headerText && <p className="text-sm font-medium mb-1">{t.headerText}</p>}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.body}</p>
                {t.footerText && <p className="text-xs text-muted-foreground mt-1 italic">{t.footerText}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Message Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="e.g. promo_message" />
                <p className="text-xs text-muted-foreground mt-1">Lowercase, underscores only</p>
              </div>
              <div>
                <Label>Language *</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">Arabic (ar)</SelectItem>
                    <SelectItem value="en_US">English (en_US)</SelectItem>
                    <SelectItem value="en">English (en)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Header Text (optional)</Label>
              <Input value={form.headerText} onChange={(e) => setForm({ ...form, headerText: e.target.value })} placeholder="e.g. Special Offer" />
            </div>
            <div>
              <Label>Message Body *</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={4}
                placeholder="Hello {{1}}, we have a special offer for you..."
              />
              <p className="text-xs text-muted-foreground mt-1">Use {"{{1}}"}, {"{{2}}"} for variables</p>
            </div>
            <div>
              <Label>Footer Text (optional)</Label>
              <Input value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} placeholder="e.g. Reply STOP to unsubscribe" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={!form.name || !form.body || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? Any broadcasts using this template cannot be sent.</AlertDialogDescription>
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
