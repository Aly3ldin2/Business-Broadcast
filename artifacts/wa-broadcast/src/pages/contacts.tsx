import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useImportContacts,
  getListContactsQueryKey,
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContactFormData {
  name: string;
  phone: string;
  tags: string;
  notes: string;
}

export default function Contacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactFormData>({ name: "", phone: "", tags: "", notes: "" });
  const [csvPreview, setCsvPreview] = useState<ContactFormData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: contacts, isLoading } = useListContacts({ search: search || undefined });
  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();
  const deleteMutation = useDeleteContact();
  const importMutation = useImportContacts();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });

  function handleAdd() {
    setForm({ name: "", phone: "", tags: "", notes: "" });
    setIsAddOpen(true);
  }

  function handleEdit(id: number) {
    const c = contacts?.find((c) => c.id === id);
    if (!c) return;
    setSelectedId(id);
    setForm({ name: c.name, phone: c.phone, tags: c.tags ?? "", notes: c.notes ?? "" });
    setIsEditOpen(true);
  }

  function handleDelete(id: number) {
    setSelectedId(id);
    setIsDeleteOpen(true);
  }

  async function submitAdd() {
    await createMutation.mutateAsync({ data: { name: form.name, phone: form.phone, tags: form.tags, notes: form.notes } });
    invalidate();
    setIsAddOpen(false);
    toast({ title: "Contact added" });
  }

  async function submitEdit() {
    if (!selectedId) return;
    await updateMutation.mutateAsync({ id: selectedId, data: { name: form.name, phone: form.phone, tags: form.tags, notes: form.notes } });
    invalidate();
    setIsEditOpen(false);
    toast({ title: "Contact updated" });
  }

  async function submitDelete() {
    if (!selectedId) return;
    await deleteMutation.mutateAsync({ id: selectedId });
    invalidate();
    setIsDeleteOpen(false);
    toast({ title: "Contact deleted" });
  }

  function parseCsv(text: string): ContactFormData[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
      return { name: row["name"] ?? "", phone: row["phone"] ?? "", tags: row["tags"] ?? "", notes: row["notes"] ?? "" };
    }).filter((r) => r.name && r.phone);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvPreview(parseCsv(text));
      setIsImportOpen(true);
    };
    reader.readAsText(file);
  }

  async function submitImport() {
    const result = await importMutation.mutateAsync({ data: { contacts: csvPreview } });
    invalidate();
    setIsImportOpen(false);
    setCsvPreview([]);
    toast({ title: `Imported ${result.imported} contacts (${result.skipped} skipped)` });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-1">Manage your broadcast contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Import CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Contact
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {!contacts || contacts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p className="font-medium">No contacts yet</p>
                <p className="text-sm mt-1">Add contacts manually or import from CSV</p>
              </div>
            ) : (
              <div className="divide-y">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-muted-foreground">{c.phone}</div>
                      {c.tags && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {c.tags.split(",").map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs">{t.trim()}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 201012345678" /></div>
            <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. customer, vip" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={!form.name || !form.phone || createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={!form.name || !form.phone || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Import Contacts from CSV</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Preview — {csvPreview.length} contacts found</p>
          <div className="max-h-60 overflow-y-auto border rounded divide-y">
            {csvPreview.slice(0, 10).map((c, i) => (
              <div key={i} className="px-3 py-2 text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground ml-2">{c.phone}</span>
              </div>
            ))}
            {csvPreview.length > 10 && <div className="px-3 py-2 text-sm text-muted-foreground">... and {csvPreview.length - 10} more</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
            <Button onClick={submitImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? "Importing..." : `Import ${csvPreview.length} contacts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
