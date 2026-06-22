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
  Plus, Trash2, Pencil, Loader2, Github,
  Users, Hash, X, User, Phone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhoneList {
  name: string;
  phones: Contact[];
}

function getInitials(name: string | null | undefined, number: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return number.slice(-2);
}

// Deterministic pastel color from string
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
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
      setFormContacts((prev) => [...prev, { number: full, name: formNameInput.trim() || null }]);
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
      return [
        ...prev,
        ...nums.filter((n) => !existing.has(n)).map((n) => ({ number: n, name: null })),
      ];
    });
    setBulkText("");
    setShowBulkPaste(false);
  }

  function openCreate() {
    setFormName(""); setFormContacts([]);
    setFormPhoneInput(""); setFormNameInput("");
    setShowBulkPaste(false); setBulkText("");
    setIsCreateOpen(true);
  }

  function openEdit(list: PhoneList) {
    setFormName(list.name); setFormContacts(list.phones);
    setFormPhoneInput(""); setFormNameInput("");
    setShowBulkPaste(false); setBulkText("");
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
          : `تم إنشاء "${formName.trim()}" — ${formContacts.length} جهة اتصال`,
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
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">قوائم جهات الاتصال</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {lists.length > 0
              ? `${lists.length} قائمة · ${lists.reduce((s, l) => s + l.phones.length, 0)} جهة اتصال`
              : "أنشئ قوائم وحفظها على GitHub Gist"}
          </p>
        </div>
        {settings?.hasGithubToken && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            قائمة جديدة
          </Button>
        )}
      </div>

      {/* No GitHub token */}
      {!settings?.hasGithubToken && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-800 dark:text-blue-300">
          <Github className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            لحفظ القوائم محتاج{" "}
            <strong>GitHub Personal Access Token</strong> —{" "}
            <a href="/settings" className="underline font-medium">الإعدادات</a>
          </span>
        </div>
      )}

      {/* Loading */}
      {settings?.hasGithubToken && isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري تحميل القوائم...
        </div>
      )}

      {/* Empty */}
      {settings?.hasGithubToken && !isLoading && lists.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-medium text-sm">لا توجد قوائم بعد</p>
            <p className="text-xs text-muted-foreground mt-0.5">أنشئ قائمة وأضف جهات اتصالك</p>
          </div>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            أنشئ أول قائمة
          </Button>
        </div>
      )}

      {/* List cards */}
      <div className="space-y-3">
        {lists.map((list) => (
          <div
            key={list.name}
            className="rounded-2xl border bg-card overflow-hidden shadow-sm"
          >
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base truncate">{list.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {list.phones.length === 0
                    ? "لا توجد جهات اتصال"
                    : `${list.phones.length} جهة اتصال`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(list)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteListName(list.name)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Contacts */}
            {list.phones.length > 0 && (
              <div className="divide-y divide-border/60">
                {list.phones.map((contact) => {
                  const initials = getInitials(contact.name, contact.number);
                  const color = avatarColor(contact.number);
                  return (
                    <div
                      key={contact.number}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
                        {initials}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {contact.name ? (
                          <>
                            <p className="text-sm font-medium truncate leading-tight">{contact.name}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">{contact.number}</p>
                          </>
                        ) : (
                          <p className="text-sm font-mono text-muted-foreground" dir="ltr">{contact.number}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={isCreateOpen || editList !== null}
        onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditList(null); } }}
      >
        <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editList ? `تعديل "${editList.name}"` : "قائمة جديدة"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* List name */}
            <div>
              <Label className="text-sm font-medium">اسم القائمة *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثال: عملاء يناير، مجموعة A"
                className="mt-1.5"
                autoFocus
              />
            </div>

            {/* Add contact section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">إضافة جهة اتصال</Label>

              {/* Phone input */}
              <div className="flex rounded-xl border-2 border-border focus-within:border-primary transition-colors overflow-hidden bg-background">
                <div className="border-r border-border">
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
                  className="flex-1 px-3 py-2.5 text-sm font-mono bg-transparent outline-none placeholder:text-muted-foreground/40 min-w-0"
                />
              </div>

              {/* Name input */}
              <div className="flex rounded-xl border-2 border-border focus-within:border-primary transition-colors overflow-hidden bg-background">
                <div className="flex items-center px-3 border-r border-border text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  value={formNameInput}
                  onChange={(e) => setFormNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFormContact(); } }}
                  placeholder="الاسم (اختياري)"
                  className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40 min-w-0"
                />
              </div>

              {/* Buttons row */}
              <div className="flex items-center gap-2">
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
                <span className="text-xs text-muted-foreground">Enter للإضافة</span>
              </div>

              {/* Bulk paste */}
              {showBulkPaste && (
                <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">كل رقم في سطر أو مفصولة بفواصل</p>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`${country.sample}\n${country.sample.slice(0, -3)}456`}
                    rows={4}
                    dir="ltr"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono resize-none outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/40"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addBulk}
                      disabled={!bulkText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
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
            </div>

            {/* Added contacts list */}
            {formContacts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    جهات الاتصال ({formContacts.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormContacts([])}
                    className="text-xs text-destructive hover:underline"
                  >
                    مسح الكل
                  </button>
                </div>
                <div className="rounded-xl border overflow-hidden divide-y divide-border/60 max-h-52 overflow-y-auto">
                  {formContacts.map((contact) => {
                    const initials = getInitials(contact.name, contact.number);
                    const color = avatarColor(contact.number);
                    return (
                      <div key={contact.number} className="flex items-center gap-3 px-3 py-2 bg-card">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          {contact.name && (
                            <p className="text-xs font-medium truncate">{contact.name}</p>
                          )}
                          <p className="text-xs font-mono text-muted-foreground" dir="ltr">
                            {contact.number}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFormContact(contact.number)}
                          className="w-5 h-5 rounded-full bg-muted hover:bg-destructive hover:text-white flex items-center justify-center transition-colors shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {formContacts.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-4 text-center rounded-xl border border-dashed border-muted-foreground/20">
                <Phone className="h-5 w-5 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">أضف جهات الاتصال باستخدام الحقول أعلاه</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditList(null); }}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim() || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editList ? "حفظ التعديلات" : "إنشاء القائمة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteListName !== null} onOpenChange={(open) => !open && setDeleteListName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هيتم حذف قائمة "<strong>{deleteListName}</strong>" نهائياً من GitHub Gist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteListName && handleDelete(deleteListName)}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
