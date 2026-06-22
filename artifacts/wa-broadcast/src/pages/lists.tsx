import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CountryPicker } from "@/components/country-picker";
import { findCountry, parseRawNumbers, type Country } from "@/data/countries";
import {
  useLoadPhonesFromGist,
  useSavePhonesToGist,
  useGetSettings,
  getLoadPhonesFromGistQueryKey,
} from "@workspace/api-client-react";
import type { Contact } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  Hash,
  X,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhoneList {
  name: string;
  phones: Contact[];
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
  const [formContacts, setFormContacts] = useState<Contact[]>([]);
  const [formPhoneInput, setFormPhoneInput] = useState("");
  const [formNameInput, setFormNameInput] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [country, setCountry] = useState<Country>(() =>
    findCountry(localStorage.getItem("wa_country") ?? "EG")
  );

  function handleCountryChange(c: Country) {
    setCountry(c);
    localStorage.setItem("wa_country", c.iso2);
  }

  function addFormContact() {
    const raw = formPhoneInput.replace(/\D/g, "");
    if (raw.length < 7) return;
    const dialDigits = country.dialCode.replace("+", "");
    const full = raw.startsWith(dialDigits)
      ? raw
      : dialDigits + (raw.startsWith("0") ? raw.slice(1) : raw);
    if (!formContacts.find((c) => c.number === full)) {
      setFormContacts((prev) => [
        ...prev,
        { number: full, name: formNameInput.trim() || null },
      ]);
    }
    setFormPhoneInput("");
    setFormNameInput("");
  }

  function removeFormContact(num: string) {
    setFormContacts((prev) => prev.filter((c) => c.number !== num));
  }

  function addBulk() {
    const nums = parseRawNumbers(bulkText, country.dialCode);
    if (nums.length === 0) return;
    setFormContacts((prev) => {
      const existing = new Set(prev.map((c) => c.number));
      const newOnes: Contact[] = nums
        .filter((n) => !existing.has(n))
        .map((n) => ({ number: n, name: null }));
      return [...prev, ...newOnes];
    });
    setBulkText("");
    setShowBulkPaste(false);
  }

  function openCreate() {
    setFormName("");
    setFormContacts([]);
    setFormPhoneInput("");
    setFormNameInput("");
    setShowBulkPaste(false);
    setBulkText("");
    setIsCreateOpen(true);
  }

  function openEdit(list: PhoneList) {
    setFormName(list.name);
    setFormContacts(list.phones);
    setFormPhoneInput("");
    setFormNameInput("");
    setShowBulkPaste(false);
    setBulkText("");
    setEditList(list);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    const existing: PhoneList[] = gistData?.lists ?? [];

    let newLists: PhoneList[];
    if (editList) {
      newLists = existing.map((l) =>
        l.name === editList.name ? { name: formName.trim(), phones: formContacts } : l
      );
    } else {
      if (existing.some((l) => l.name === formName.trim())) {
        toast({ title: "يوجد قائمة بنفس الاسم", variant: "destructive" });
        return;
      }
      newLists = [...existing, { name: formName.trim(), phones: formContacts }];
    }

    try {
      await saveMutation.mutateAsync({ data: { lists: newLists } });
      queryClient.invalidateQueries({ queryKey: getLoadPhonesFromGistQueryKey() });
      setIsCreateOpen(false);
      setEditList(null);
      toast({
        title: editList
          ? `تم تحديث "${formName.trim()}"`
          : `تم إنشاء قائمة "${formName.trim()}" — ${formContacts.length} جهة اتصال`,
      });
    } catch (e: unknown) {
      toast({ title: "فشل الحفظ", description: (e as Error)?.message, variant: "destructive" });
    }
  }

  async function handleDelete(name: string) {
    const newLists = (gistData?.lists ?? []).filter((l) => l.name !== name);
    try {
      await saveMutation.mutateAsync({ data: { lists: newLists } });
      queryClient.invalidateQueries({ queryKey: getLoadPhonesFromGistQueryKey() });
      setDeleteListName(null);
      toast({ title: `تم حذف "${name}"` });
    } catch (e: unknown) {
      toast({ title: "فشل الحذف", description: (e as Error)?.message, variant: "destructive" });
    }
  }

  const lists: PhoneList[] = gistData?.lists ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">قوائم جهات الاتصال</h1>
          <p className="text-muted-foreground mt-1">
            أنشئ قوائم لجهات الاتصال مع أسمائهم وأرقامهم، محفوظة على GitHub Gist
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
            <a href="/settings" className="underline font-medium">الإعدادات</a>.
            مجاني تماماً.
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
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base truncate">{list.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {list.phones.length} جهة اتصال
                  </p>
                  {list.phones.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {list.phones.slice(0, 3).map((c) => (
                        <p key={c.number} className="text-xs text-muted-foreground font-mono truncate" dir="ltr">
                          {c.name ? (
                            <span>
                              <span className="font-sans not-italic text-foreground/70">{c.name}</span>
                              {" — "}
                            </span>
                          ) : null}
                          {c.number}
                        </p>
                      ))}
                      {list.phones.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{list.phones.length - 3} أكثر
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(list)}>
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
          if (!open) { setIsCreateOpen(false); setEditList(null); }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

            <div className="space-y-3">
              <Label>جهات الاتصال</Label>

              {/* Two-field input row: phone + name */}
              <div className="space-y-2">
                <div className="flex rounded-xl border-2 border-border focus-within:border-primary transition-colors overflow-hidden bg-background shadow-sm">
                  <div className="border-r">
                    <CountryPicker value={country.iso2} onChange={handleCountryChange} />
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={formPhoneInput}
                    onChange={(e) => setFormPhoneInput(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFormContact(); } }}
                    placeholder={country.sample}
                    dir="ltr"
                    className="flex-1 px-3 py-2 text-sm font-mono bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0"
                  />
                </div>
                <div className="flex rounded-xl border-2 border-border focus-within:border-primary transition-colors overflow-hidden bg-background shadow-sm">
                  <div className="flex items-center px-3 border-r">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    value={formNameInput}
                    onChange={(e) => setFormNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFormContact(); } }}
                    placeholder="الاسم (اختياري)"
                    className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={addFormContact}
                  disabled={formPhoneInput.replace(/\D/g, "").length < 7}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة
                </button>
                <button
                  type="button"
                  onClick={() => { setShowBulkPaste((v) => !v); setBulkText(""); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Hash className="h-3.5 w-3.5" />
                  لصق متعدد
                </button>
                <span className="text-xs text-muted-foreground">الأصفار الأولى تُحذف</span>
              </div>

              {/* Bulk paste panel */}
              {showBulkPaste && (
                <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">الصق أرقاماً (كل رقم في سطر أو مفصولة بفواصل) — بدون أسماء</p>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`${country.sample}\n${country.sample.slice(0, -3)}456\n...`}
                    rows={4}
                    dir="ltr"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono resize-none outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/40"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addBulk}
                      disabled={!bulkText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      إضافة الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowBulkPaste(false); setBulkText(""); }}
                      className="px-3 py-1.5 rounded-lg border text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      إلغاء
                    </button>
                    {bulkText.trim() && (
                      <span className="text-xs text-muted-foreground">
                        {parseRawNumbers(bulkText, country.dialCode).length} رقم
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Contacts list */}
              {formContacts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      جهات الاتصال المضافة ({formContacts.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => setFormContacts([])}
                      className="text-xs text-destructive hover:underline"
                    >
                      مسح الكل
                    </button>
                  </div>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {formContacts.map((contact) => (
                      <div
                        key={contact.number}
                        className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-lg bg-muted border text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => removeFormContact(contact.number)}
                          className="w-4 h-4 rounded-full bg-muted-foreground/20 hover:bg-destructive hover:text-white flex items-center justify-center transition-colors shrink-0"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                        {contact.name && (
                          <span className="text-foreground/80 font-medium">{contact.name}</span>
                        )}
                        <span className="font-mono text-muted-foreground" dir="ltr">{contact.number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditList(null); }}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
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
