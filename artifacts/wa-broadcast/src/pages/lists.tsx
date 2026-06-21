import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLoadPhonesFromGist,
  useSavePhonesToGist,
  useGetSettings,
  getLoadPhonesFromGistQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Github,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhoneList {
  name: string;
  phones: string[];
}

export default function Lists() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useGetSettings();
  const { data: gistData, isLoading } = useLoadPhonesFromGist({
    query: {
      enabled: !!settings?.hasGithubToken,
      queryKey: getLoadPhonesFromGistQueryKey(),
    },
  });
  const saveMutation = useSavePhonesToGist();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editList, setEditList] = useState<PhoneList | null>(null);
  const [deleteListName, setDeleteListName] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhones, setFormPhones] = useState("");

  function parsePhones(text: string): string[] {
    return text
      .split(/[\n,،;]+/)
      .map((p) => p.trim().replace(/[\s+\-()]/g, ""))
      .filter((p) => p.length >= 10);
  }

  function openCreate() {
    setFormName("");
    setFormPhones("");
    setIsCreateOpen(true);
  }

  function openEdit(list: PhoneList) {
    setFormName(list.name);
    setFormPhones(list.phones.join("\n"));
    setEditList(list);
  }

  async function handleSave() {
    const phones = parsePhones(formPhones);
    if (!formName.trim()) return;
    const existing: PhoneList[] = gistData?.lists ?? [];

    let newLists: PhoneList[];
    if (editList) {
      // Replace the edited list (find by old name)
      newLists = existing.map((l) =>
        l.name === editList.name ? { name: formName.trim(), phones } : l
      );
    } else {
      if (existing.some((l) => l.name === formName.trim())) {
        toast({ title: "يوجد قائمة بنفس الاسم", variant: "destructive" });
        return;
      }
      newLists = [...existing, { name: formName.trim(), phones }];
    }

    try {
      await saveMutation.mutateAsync({ data: { lists: newLists } });
      queryClient.invalidateQueries({ queryKey: getLoadPhonesFromGistQueryKey() });
      setIsCreateOpen(false);
      setEditList(null);
      toast({
        title: editList
          ? `تم تحديث "${formName.trim()}"`
          : `تم إنشاء قائمة "${formName.trim()}" — ${phones.length} رقم`,
      });
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e?.message, variant: "destructive" });
    }
  }

  async function handleDelete(name: string) {
    const newLists = (gistData?.lists ?? []).filter((l) => l.name !== name);
    try {
      await saveMutation.mutateAsync({ data: { lists: newLists } });
      queryClient.invalidateQueries({ queryKey: getLoadPhonesFromGistQueryKey() });
      setDeleteListName(null);
      toast({ title: `تم حذف "${name}"` });
    } catch (e: any) {
      toast({ title: "فشل الحذف", description: e?.message, variant: "destructive" });
    }
  }

  const lists: PhoneList[] = gistData?.lists ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">قوائم الأرقام</h1>
          <p className="text-muted-foreground mt-1">
            أنشئ قوائم لأرقام هاتفية وحفظها على GitHub Gist
          </p>
        </div>
        {settings?.hasGithubToken && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            قائمة جديدة
          </Button>
        )}
      </div>

      {!settings?.hasGithubToken && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <Github className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            لحفظ القوائم محتاج تضيف{" "}
            <strong>GitHub Personal Access Token</strong> في{" "}
            <a href="/settings" className="underline font-medium">
              الإعدادات
            </a>
            . مجاني تماماً.
          </div>
        </div>
      )}

      {settings?.hasGithubToken && isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري تحميل القوائم...
        </div>
      )}

      {settings?.hasGithubToken && !isLoading && lists.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">مفيش قوائم لحد دلوقتي.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            أنشئ أول قائمة
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {lists.map((list) => (
          <Card key={list.name} className="relative group">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-base truncate">{list.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {list.phones.length} رقم
                  </p>
                  {list.phones.length > 0 && (
                    <p
                      className="text-xs text-muted-foreground mt-2 font-mono truncate"
                      dir="ltr"
                    >
                      {list.phones.slice(0, 3).join(", ")}
                      {list.phones.length > 3 ? ` +${list.phones.length - 3}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openEdit(list)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteListName(list.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={isCreateOpen || editList !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditList(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editList ? `تعديل "${editList.name}"` : "قائمة جديدة"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم القائمة *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثال: عملاء يناير، مجموعة A"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <Label>الأرقام</Label>
              <Textarea
                value={formPhones}
                onChange={(e) => setFormPhones(e.target.value)}
                placeholder={`201012345678\n201123456789\n201234567890\n\nرقم في كل سطر أو مفصولة بفاصلة`}
                rows={8}
                className="mt-1.5 font-mono text-sm resize-none"
                dir="ltr"
              />
              {formPhones && (
                <p className="text-xs text-muted-foreground mt-1">
                  {parsePhones(formPhones).length} رقم صالح
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditList(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formName.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {editList ? "حفظ التعديلات" : "إنشاء القائمة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={deleteListName !== null}
        onOpenChange={(open) => !open && setDeleteListName(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هيتم حذف قائمة "<strong>{deleteListName}</strong>" نهائياً من
              GitHub Gist. مش هتقدر ترجعها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteListName && handleDelete(deleteListName)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
