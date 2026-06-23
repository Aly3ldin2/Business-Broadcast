import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSendCampaign,
  useLoadPhonesFromGist,
  useSavePhonesToGist,
  useGetSettings,
  useGetBaileysStatus,
  getLoadPhonesFromGistQueryKey,
  getGetBaileysStatusQueryKey,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import type { Contact } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Send, Loader2, CloudUpload,
  CheckCircle2, XCircle, Video,
  AlertTriangle, Users, KeyboardIcon,
  Pencil, Check, X, PenLine, UploadCloud, Hash, Plus,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CountryPicker } from "@/components/country-picker";
import { findCountry, parseRawNumbers, type Country } from "@/data/countries";

interface SendResult {
  phone: string;
  success: boolean;
  error?: string | null;
}

interface PhoneList {
  name: string;
  phones: Contact[];
}

interface MediaItem {
  id: string;
  type: "image" | "video";
  file: File;
  preview: string;
  waMediaId?: string;
  uploading?: boolean;
  uploadError?: string;
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
  );
}

export default function Campaign() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Phone input mode ────────────────────────────────────────────
  const [phoneMode, setPhoneMode] = useState<"lists" | "manual">("lists");
  const [country, setCountry] = useState<Country>(() =>
    findCountry(localStorage.getItem("wa_country") ?? "EG")
  );
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneList, setPhoneList] = useState<string[]>([]);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState("");

  // Lists mode: selected individual phone numbers + expanded lists
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());

  // Save-list dialog
  const [isSaveListOpen, setIsSaveListOpen] = useState(false);
  const [listName, setListName] = useState("");

  function handleCountryChange(c: Country) {
    setCountry(c);
    localStorage.setItem("wa_country", c.iso2);
  }

  function addPhone() {
    const raw = phoneInput.replace(/\D/g, "");
    if (raw.length < 7) return;
    const dialDigits = country.dialCode.replace("+", "");
    const full = raw.startsWith(dialDigits) ? raw : dialDigits + (raw.startsWith("0") ? raw.slice(1) : raw);
    if (!phoneList.includes(full)) {
      setPhoneList((prev) => [...prev, full]);
    }
    setPhoneInput("");
    phoneInputRef.current?.focus();
  }

  function removePhone(num: string) {
    setPhoneList((prev) => prev.filter((p) => p !== num));
  }

  function handlePhoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addPhone(); }
  }

  function addBulk() {
    const nums = parseRawNumbers(bulkText, country.dialCode);
    if (nums.length === 0) return;
    setPhoneList((prev) => {
      const set = new Set(prev);
      nums.forEach((n) => set.add(n));
      return Array.from(set);
    });
    setBulkText("");
    setShowBulkPaste(false);
  }

  // ── Lists mode helpers ───────────────────────────────────────────
  function togglePhone(num: string) {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  }

  function toggleAllFromList(list: PhoneList) {
    const nums = list.phones.map((c) => c.number);
    const allSelected = nums.every((n) => selectedPhones.has(n));
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        nums.forEach((n) => next.delete(n));
      } else {
        nums.forEach((n) => next.add(n));
      }
      return next;
    });
  }

  function toggleExpandList(name: string) {
    setExpandedLists((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function getListCheckState(list: PhoneList): "all" | "some" | "none" {
    const nums = list.phones.map((c) => c.number);
    if (nums.length === 0) return "none";
    const count = nums.filter((n) => selectedPhones.has(n)).length;
    if (count === 0) return "none";
    if (count === nums.length) return "all";
    return "some";
  }

  // ── Message ─────────────────────────────────────────────────────
  const [message, setMessage] = useState("");

  // ── Media ───────────────────────────────────────────────────────
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Send state ──────────────────────────────────────────────────
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // ── Signature ───────────────────────────────────────────────────
  const [signature, setSignature] = useState(() => localStorage.getItem("wa_signature") ?? "");
  const [signatureEnabled, setSignatureEnabled] = useState(
    () => localStorage.getItem("wa_signature_enabled") !== "false"
  );
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [sigDraft, setSigDraft] = useState("");

  function startEditSignature() { setSigDraft(signature); setIsEditingSignature(true); }
  function saveSignature() {
    setSignature(sigDraft);
    localStorage.setItem("wa_signature", sigDraft);
    setIsEditingSignature(false);
  }
  function toggleSignature() {
    const next = !signatureEnabled;
    setSignatureEnabled(next);
    localStorage.setItem("wa_signature_enabled", String(next));
  }

  const fullMessage =
    signatureEnabled && signature.trim()
      ? message + "\n\n" + signature.trim()
      : message;

  // ── API hooks ───────────────────────────────────────────────────
  // Poll settings every 5s when not configured so the banner auto-clears on connect
  const { data: settings } = useGetSettings({
    query: {
      queryKey: getGetSettingsQueryKey(),
      refetchInterval: (q) => (q.state.data?.isConfigured ? false : 5_000),
    },
  });

  // Poll baileys status to keep connection indicator fresh
  const { data: baileysStatus } = useGetBaileysStatus({
    query: {
      queryKey: getGetBaileysStatusQueryKey(),
      refetchInterval: (q) => (q.state.data?.connected ? 15_000 : 5_000),
    },
  });

  // When connection status changes, invalidate settings — use ref to avoid re-invalidating every render
  const prevConnected = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    const connected = baileysStatus?.connected;
    if (connected !== prevConnected.current) {
      prevConnected.current = connected;
      void queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    }
  }, [baileysStatus?.connected, queryClient]);

  const { data: gistData } = useLoadPhonesFromGist({
    query: {
      enabled: !!settings?.hasGithubToken,
      queryKey: getLoadPhonesFromGistQueryKey(),
    },
  });
  const sendMutation = useSendCampaign();
  const saveMutation = useSavePhonesToGist();

  const phones = phoneMode === "lists" ? Array.from(selectedPhones) : phoneList;
  const lists: PhoneList[] = gistData?.lists ?? [];
  const hasLists = lists.length > 0;
  const isConnected = baileysStatus?.connected ?? settings?.isConfigured ?? false;

  // ── Media upload ────────────────────────────────────────────────
  async function uploadFile(file: File): Promise<string | undefined> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/media/upload", { method: "POST", body: formData });
    const data = await res.json() as { id?: string; error?: string };
    if (res.ok && data.id) return data.id;
    throw new Error(data.error ?? "فشل الرفع");
  }

  const processFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter((f) =>
      f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (!validFiles.length) return;

    const newItems: MediaItem[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      type: file.type.startsWith("image/") ? "image" : "video",
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }));

    setMediaItems((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const waMediaId = await uploadFile(item.file);
        setMediaItems((prev) =>
          prev.map((m) => m.id === item.id ? { ...m, waMediaId, uploading: false } : m)
        );
      } catch (e: unknown) {
        setMediaItems((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? { ...m, uploading: false, uploadError: (e as Error)?.message ?? "خطأ" }
              : m
          )
        );
      }
    }
  }, []);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    void processFiles(files);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    void processFiles(Array.from(e.dataTransfer.files));
  }

  function removeItem(id: string) {
    setMediaItems((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((m) => m.id !== id);
    });
  }

  // ── Send ────────────────────────────────────────────────────────
  const readyMedia = mediaItems
    .filter((m) => !!m.waMediaId)
    .map((m) => ({ type: m.type, id: m.waMediaId!, url: null }));
  const anyUploading = mediaItems.some((m) => m.uploading);
  const hasContent = fullMessage.trim().length > 0 || readyMedia.length > 0;
  const totalMessages = phones.length > 0
    ? phones.length * Math.max(readyMedia.length, fullMessage.trim() ? 1 : 0)
    : 0;

  async function handleSend() {
    setIsSending(true);
    setIsConfirmOpen(false);
    setSendResults(null);
    try {
      const result = await sendMutation.mutateAsync({
        data: { phones, message: fullMessage, mediaItems: readyMedia },
      });
      setSendResults(result.results);
      toast({ title: `تم الإرسال: ${result.sent} نجح، ${result.failed} فشل` });
    } catch (e: unknown) {
      toast({
        title: "فشل الإرسال",
        description: (e as Error)?.message ?? "تحقق من اتصال WhatsApp",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveList() {
    const existing = gistData?.lists ?? [];
    const name = listName.trim();
    if (!name) return;
    const newPhones = phones.map((n) => ({ number: n, name: null }));
    const idx = existing.findIndex((l) => l.name === name);
    const newLists =
      idx >= 0
        ? existing.map((l, i) => (i === idx ? { ...l, phones: newPhones } : l))
        : [...existing, { name, phones: newPhones }];
    try {
      await saveMutation.mutateAsync({ data: { lists: newLists } });
      queryClient.invalidateQueries({ queryKey: getLoadPhonesFromGistQueryKey() });
      setIsSaveListOpen(false);
      setListName("");
      toast({ title: `تم حفظ "${name}" — ${phones.length} رقم` });
    } catch (e: unknown) {
      toast({ title: "فشل الحفظ", description: (e as Error)?.message, variant: "destructive" });
    }
  }

  const successCount = sendResults?.filter((r) => r.success).length ?? 0;
  const failCount = sendResults?.filter((r) => !r.success).length ?? 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/3gpp"
        className="hidden"
        onChange={handleFileInput}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">رسالة جديدة</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          اختار جهات الاتصال، اكتب الرسالة، أضف صور وفيديوهات، ثم أرسل
        </p>
      </div>

      {!isConnected && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>تنبيه:</strong> لازم تربط WhatsApp الأول.{" "}
            <a href="/settings" className="underline font-medium">اذهب للإعدادات وامسح QR Code</a>
          </div>
        </div>
      )}

      {/* ─── Step 1: Phones ─── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <StepBadge n={1} />أرقام الهاتف
            </CardTitle>
            {phoneMode === "manual" && settings?.hasGithubToken && phones.length > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => setIsSaveListOpen(true)}>
                <CloudUpload className="h-3 w-3 mr-1" />حفظ كقائمة
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted">
            <button
              onClick={() => setPhoneMode("manual")}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                phoneMode === "manual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <KeyboardIcon className="h-4 w-4" />
              إدخال يدوي
            </button>
            <button
              onClick={() => setPhoneMode("lists")}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                phoneMode === "lists"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              من القوائم
              {hasLists && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  phoneMode === "lists"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted-foreground/15 text-muted-foreground"
                }`}>
                  {lists.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Manual mode ── */}
          {phoneMode === "manual" ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="flex w-full max-w-sm rounded-xl border-2 border-border focus-within:border-primary transition-colors overflow-hidden bg-background shadow-sm">
                  <div className="border-r">
                    <CountryPicker value={country.iso2} onChange={handleCountryChange} />
                  </div>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    inputMode="numeric"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={handlePhoneKeyDown}
                    placeholder={country.sample}
                    dir="ltr"
                    className="flex-1 px-4 py-2.5 text-base font-mono bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addPhone}
                    disabled={phoneInput.replace(/\D/g, "").length < 7}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة الرقم
                  </button>
                  <button
                    onClick={() => { setShowBulkPaste((v) => !v); setBulkText(""); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Hash className="h-3.5 w-3.5" />
                    لصق أرقام متعددة
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  اضغط Enter أو زرار الإضافة — الأصفار الأولى تُحذف تلقائياً
                </p>
              </div>

              {showBulkPaste && (
                <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">الصق أرقاماً (كل رقم في سطر أو مفصولة بفواصل)</p>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`${country.sample}\n${country.sample.slice(0, -3)}456\n...`}
                    rows={5}
                    dir="ltr"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono resize-none outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/40"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={addBulk}
                      disabled={!bulkText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      إضافة الكل
                    </button>
                    <button
                      onClick={() => { setShowBulkPaste(false); setBulkText(""); }}
                      className="px-3 py-2 rounded-lg border text-sm text-muted-foreground hover:bg-muted transition-colors"
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

              {phoneList.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      الأرقام المضافة ({phoneList.length})
                    </p>
                    <button onClick={() => setPhoneList([])} className="text-xs text-destructive hover:underline">
                      مسح الكل
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {phoneList.map((num) => (
                      <span
                        key={num}
                        className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-muted border text-xs font-mono"
                        dir="ltr"
                      >
                        <button
                          onClick={() => removePhone(num)}
                          className="w-4 h-4 rounded-full bg-muted-foreground/20 hover:bg-destructive hover:text-white flex items-center justify-center transition-colors shrink-0"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Lists mode with individual checkboxes ── */
            <>
              {!settings?.hasGithubToken ? (
                <div className="text-center py-8 space-y-2">
                  <Users className="h-9 w-9 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">محتاج GitHub Token لتحميل القوائم</p>
                  <a href="/settings" className="text-xs underline text-primary">اذهب للإعدادات</a>
                </div>
              ) : !hasLists ? (
                <div className="text-center py-8 space-y-2">
                  <Users className="h-9 w-9 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">لا توجد قوائم محفوظة بعد</p>
                  <button onClick={() => setPhoneMode("manual")} className="text-xs underline text-primary">
                    أضف أرقاماً يدوياً واحفظها كقائمة
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {lists.map((list) => {
                    const checkState = getListCheckState(list);
                    const isExpanded = expandedLists.has(list.name);
                    const selectedCount = list.phones.filter((c) => selectedPhones.has(c.number)).length;

                    return (
                      <div key={list.name} className="rounded-lg border-2 border-border overflow-hidden">
                        {/* List header row */}
                        <div className={`flex items-center gap-3 px-3 py-2.5 ${
                          checkState !== "none" ? "bg-primary/5 border-b border-primary/10" : "hover:bg-muted/40"
                        }`}>
                          <Checkbox
                            checked={checkState === "all" ? true : checkState === "some" ? "indeterminate" : false}
                            onCheckedChange={() => toggleAllFromList(list)}
                            className="shrink-0"
                          />
                          <button
                            onClick={() => toggleExpandList(list.name)}
                            className="flex-1 flex items-center gap-2 min-w-0"
                          >
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            }
                            <span className="font-medium text-sm flex-1 text-right truncate">{list.name}</span>
                            <Badge variant={checkState !== "none" ? "default" : "secondary"} className="text-xs shrink-0">
                              {checkState !== "none" ? `${selectedCount} / ` : ""}{list.phones.length}
                            </Badge>
                          </button>
                        </div>

                        {/* Individual contact rows */}
                        {isExpanded && list.phones.length > 0 && (
                          <div className="divide-y divide-border/50 max-h-56 overflow-y-auto">
                            {list.phones.map((contact) => {
                              const isChecked = selectedPhones.has(contact.number);
                              return (
                                <label
                                  key={contact.number}
                                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer select-none ${
                                    isChecked ? "bg-primary/5" : "hover:bg-muted/30"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => togglePhone(contact.number)}
                                    className="shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    {contact.name && (
                                      <p className="text-sm font-medium truncate">{contact.name}</p>
                                    )}
                                    <p className="text-xs font-mono text-muted-foreground" dir="ltr">
                                      {contact.number}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {isExpanded && list.phones.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">القائمة فاضية</p>
                        )}
                      </div>
                    );
                  })}

                  {selectedPhones.size > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-muted-foreground">
                        تم تحديد <strong>{selectedPhones.size}</strong> جهة اتصال
                      </p>
                      <button
                        onClick={() => setSelectedPhones(new Set())}
                        className="text-xs text-destructive hover:underline"
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Step 2: Message ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StepBadge n={2} />الرسالة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب نص الرسالة هنا..."
            rows={5}
            className="resize-none font-medium"
          />

          {/* Signature */}
          <div className="rounded-xl border bg-muted/20 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">التوقيع</span>
                {signature.trim() && (
                  <button
                    onClick={toggleSignature}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      signatureEnabled
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "text-muted-foreground border-muted-foreground/20"
                    }`}
                  >
                    {signatureEnabled ? "مفعّل" : "معطّل"}
                  </button>
                )}
              </div>
              <button
                onClick={startEditSignature}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />تعديل
              </button>
            </div>

            {isEditingSignature ? (
              <div className="space-y-2">
                <textarea
                  value={sigDraft}
                  onChange={(e) => setSigDraft(e.target.value)}
                  placeholder="مثال: فريق المبيعات — 01xxxxxxxxxx"
                  rows={2}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none outline-none focus:border-primary transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveSignature}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Check className="h-3 w-3" />حفظ
                  </button>
                  <button
                    onClick={() => setIsEditingSignature(false)}
                    className="px-3 py-1.5 rounded-lg border text-xs text-muted-foreground hover:bg-muted transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : signature.trim() ? (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{signature}</p>
            ) : (
              <p className="text-xs text-muted-foreground/50">لا يوجد توقيع — اضغط "تعديل" لإضافة واحد</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Step 3: Media ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StepBadge n={3} />صور وفيديوهات (اختياري)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/20"
            }`}
          >
            <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">اسحب ملفات هنا أو اضغط للاختيار</p>
            <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WebP, MP4 — حتى 64MB</p>
          </div>

          {mediaItems.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {mediaItems.map((item) => (
                <div key={item.id} className="relative rounded-lg overflow-hidden border aspect-square bg-muted">
                  {item.type === "image" ? (
                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20" />
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 hover:bg-destructive flex items-center justify-center transition-colors"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                  {item.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                  {item.uploadError && (
                    <div className="absolute bottom-0 inset-x-0 bg-destructive/80 p-1 text-center">
                      <p className="text-xs text-white truncate">{item.uploadError}</p>
                    </div>
                  )}
                  {item.waMediaId && !item.uploading && (
                    <div className="absolute bottom-1 right-1">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Send Results ─── */}
      {sendResults && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              نتائج الإرسال
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                {successCount} نجح
              </Badge>
              {failCount > 0 && (
                <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                  {failCount} فشل
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sendResults.map((r) => (
                <div key={r.phone} className="flex items-center gap-2 text-xs py-1 border-b last:border-0">
                  {r.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  )}
                  <span className="font-mono" dir="ltr">{r.phone}</span>
                  {r.error && <span className="text-destructive truncate">{r.error}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Send Button ─── */}
      <div className="flex items-center justify-between gap-3 pb-4">
        <div className="text-xs text-muted-foreground">
          {phones.length > 0 ? (
            <span>
              <strong>{phones.length}</strong> جهة اتصال
              {readyMedia.length > 0 ? ` × ${1 + readyMedia.length} رسالة = ${totalMessages} إجمالي` : ""}
            </span>
          ) : (
            <span>لم تحدد أي أرقام بعد</span>
          )}
        </div>
        <Button
          size="lg"
          disabled={phones.length === 0 || !hasContent || isSending || anyUploading}
          onClick={() => setIsConfirmOpen(true)}
          className="gap-2"
        >
          {isSending ? (
            <><Loader2 className="h-4 w-4 animate-spin" />جاري الإرسال...</>
          ) : (
            <><Send className="h-4 w-4" />إرسال</>
          )}
        </Button>
      </div>

      {/* ─── Confirm Dialog ─── */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الإرسال</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-2xl font-bold">{phones.length}</p>
                <p className="text-xs text-muted-foreground mt-1">جهة اتصال</p>
              </div>
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-2xl font-bold">{totalMessages}</p>
                <p className="text-xs text-muted-foreground mt-1">رسالة إجمالي</p>
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">معاينة الرسالة:</p>
              <p className="whitespace-pre-wrap text-sm line-clamp-4">{fullMessage}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>إلغاء</Button>
            <Button onClick={handleSend}>
              <Send className="h-4 w-4 mr-2" />
              أرسل الآن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Save List Dialog ─── */}
      <Dialog open={isSaveListOpen} onOpenChange={setIsSaveListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حفظ كقائمة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">اسم القائمة</label>
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSaveList(); }}
                placeholder="مثال: عملاء فبراير"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              سيتم حفظ {phones.length} رقم في هذه القائمة
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveListOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveList} disabled={!listName.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
