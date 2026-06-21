import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListContactLists,
  useCreateContactList,
  useDeleteContactList,
  useListContacts,
  useAddContactsToList,
  getListContactListsQueryKey,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Lists() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddContactsOpen, setIsAddContactsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);

  const { data: lists, isLoading } = useListContactLists();
  const { data: allContacts } = useListContacts();
  const createMutation = useCreateContactList();
  const deleteMutation = useDeleteContactList();
  const addContactsMutation = useAddContactsToList();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListContactListsQueryKey() });

  async function submitCreate() {
    await createMutation.mutateAsync({ data: { name: form.name, description: form.description } });
    invalidate();
    setIsCreateOpen(false);
    setForm({ name: "", description: "" });
    toast({ title: "List created" });
  }

  async function submitDelete() {
    if (!selectedId) return;
    await deleteMutation.mutateAsync({ id: selectedId });
    invalidate();
    setIsDeleteOpen(false);
    toast({ title: "List deleted" });
  }

  function openAddContacts(id: number) {
    setSelectedId(id);
    setSelectedContacts([]);
    setIsAddContactsOpen(true);
  }

  async function submitAddContacts() {
    if (!selectedId || selectedContacts.length === 0) return;
    await addContactsMutation.mutateAsync({ id: selectedId, data: { contactIds: selectedContacts } });
    invalidate();
    setIsAddContactsOpen(false);
    toast({ title: `Added ${selectedContacts.length} contacts to list` });
  }

  function toggleContact(id: number) {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Lists</h1>
          <p className="text-muted-foreground mt-1">Group contacts for targeted broadcasts</p>
        </div>
        <Button onClick={() => { setForm({ name: "", description: "" }); setIsCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Create List
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : !lists || lists.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No lists yet</p>
            <p className="text-sm mt-1">Create a list to organize your contacts for broadcasting</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Card key={list.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-start justify-between">
                  <span>{list.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive -mt-1 -mr-2"
                    onClick={() => { setSelectedId(list.id); setIsDeleteOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
                {list.description && <p className="text-sm text-muted-foreground">{list.description}</p>}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{list.contactCount} contacts</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openAddContacts(list.id)}>
                    Add Contacts
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Contact List</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={!form.name || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contacts Dialog */}
      <Dialog open={isAddContactsOpen} onOpenChange={setIsAddContactsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Contacts to List</DialogTitle></DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-1 border rounded p-2">
            {allContacts?.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-1 px-2 hover:bg-muted/30 rounded cursor-pointer" onClick={() => toggleContact(c.id)}>
                <Checkbox checked={selectedContacts.includes(c.id)} onCheckedChange={() => toggleContact(c.id)} />
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone}</div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddContactsOpen(false)}>Cancel</Button>
            <Button onClick={submitAddContacts} disabled={selectedContacts.length === 0 || addContactsMutation.isPending}>
              {addContactsMutation.isPending ? "Adding..." : `Add ${selectedContacts.length} Selected`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete List</AlertDialogTitle>
            <AlertDialogDescription>This will delete the list and remove all its members. Contacts are not deleted.</AlertDialogDescription>
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
