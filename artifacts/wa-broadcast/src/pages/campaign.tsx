import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSendCampaign,
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
import { Badge } from "@/components/ui/badge";
import {
  Send, Loader2, CloudUpload,
  CheckCircle2, XCircle, ImageIcon, Video,
  AlertTriangle, Trash2, Users, KeyboardIcon,
  Pencil, Check, X, PenLine, UploadCloud,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SendResult {
  phone: string;
  success: boolean;
  error?: string | null;
}

interface PhoneList {
  name: string;
  phones: string[];
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

export default function Campaign() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Phone input mode ────────────────────────────────────────────
  const [phoneMode, setPhoneMode] = useState<"lists" | "manual">("lists");
  const [phonesText, setPhonesText] = useState("");
  const [listName, setListName] = useState("");
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());

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
  const [isSaveListOpen, setIsSaveListOpen] = useState(false);

  // ── Signature ───────────────────────────────────────────────────
  const [signature, setSignature] = useState(() =>
    localStorage.getItem("wa_signature") ?? ""
  );
  const [signatureEnabled, setSignatureEnabled] = useState(() =>
    localStorage.getItem("wa_signature_enabled") !== "false"
  );
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [sigDraft, setSigDraft] = useState("");

  useEffect(() => {
    localStorage.setItem("wa_signature", signature);
  }, [signature]);
  useEffect(() => {
    localStorage.setItem("wa_signature_enabled", String(signatureEnabled));
  }, [signatureEnabled]);

  function startEditSignature() { setSigDraft(signature); setIsEditingSignature(true); }
  function saveSignature() { setSignature(sigDraft); setIsEditingSignature(false); }
  function cancelEditSignature() { setIsEditingSignature(false); }

  const fullMessage =
    signatureEnabled && signature.trim()
      ? message + "\n\n" + signature.trim()
      : message;

  // ── API hooks ───────────────────────────────────────────────────
  const { data: settings } = useGetSettings();
  const { data: gistData } = useLoadPhonesFromGist({
    query: {
      enabled: !!settings?.hasGithubToken,
      queryKey: getLoadPhonesFromGistQueryKey(),
    },
  });
  const sendMutation = useSendCampaign();
  const saveMutation = useSavePhonesToGist();

  // ── Phone parsing ───────────────────────────────────────────────
  function parsePhones(): string[] {
    return phonesText
      .split(/[\n,،;]+/)
      .map((p) => p.trim().replace(/[\s+\-()]/g, ""))
      .filter((p) => p.length >= 10);
  }

  function getPhonesFromSelectedLists(): string[] {
    if (!gistData?.lists) return [];
    const all = new Set<string>();
    gistData.lists
      .filter((l) => selectedLists.has(l.name))
      .forEach((l) => l.phones.forEach((p) => all.add(p)));
    return Array.from(all);
  }

  const phones = phoneMode === "lists" ? getPhonesFromSelectedLists() : parsePhones();

  function toggleList(listItem: PhoneList) {
    setSelectedLists((prev) => {
      const next = new Set(prev);
      if (next.has(listItem.name)) next.delete(listItem.name);
      else next.add(listItem.name);
      return next;
    });
  }

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
    const validFiles = files.filter((f) => {
      const isImage = f.type.startsWith("image/");
      const isVideo = f.type.startsWith("video/");
      return isImage || isVideo;
    });
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
    const files = Array.from(e.dataTransfer.files);
    void processFiles(files);
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
  const totalMessages = phones.length > 0 ? phones.length * (1 + readyMedia.length) : 0;

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
        description: (e as Error)?.message ?? "تحقق من إعدادات الـ API",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveList() {
    const existing: PhoneList[] = gistData?.lists ?? [];
    const name = listName.trim();
    if (!name) return;
    const idx = existing.findIndex((l) => l.name === name);
    const newLists =
      idx >= 0
        ? existing.map((l, i) => (i === idx ? { ...l, phones } : l))
        : [...existing, { name, phones }];
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

  const lists = gistData?.lists ?? [];
  const hasLists = lists.length > 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Hidden file input */}
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
          ألصق الأرقام، اكتب الرسالة، أضف صور وفيديوهات، ثم أرسل
        </p>
      </div>

      {!settings?.isConfigured && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>تنبيه:</strong> لازم تضيف بيانات WhatsApp API الأول.{" "}
            <a href="/settings" className="underline font-medium">اذهب للإعدادات</a>
          </div>
        </div>
      )}

      {/* ─── Step 1: Phones ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <StepBadge n={1} />أرقام الهاتف
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Mode toggle */}
              <div className="flex rounded-lg border bg-muted p-0.5 text-xs">
                {settings?.hasGithubToken && hasLists && (
                  <button
                    onClick={() => setPhoneMode("lists")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                      phoneMode === "lists"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    قوائم محفوظة
                  </button>
                )}
                <button
                  onClick={() => setPhoneMode("manual")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                    phoneMode === "manual"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <KeyboardIcon className="h-3 w-3" />
                  إدخال يدوي
                </button>
              </div>
              {/* Save button (manual mode) */}
              {phoneMode === "manual" && settings?.hasGithubToken && phones.length > 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => setIsSaveListOpen(true)}>
                  <CloudUpload className="h-3 w-3 mr-1" />حفظ كقائمة
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {phoneMode === "lists" ? (
            <>
              {!settings?.hasGithubToken ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>فعّل GitHub Gist في الإعدادات لحفظ وتحميل القوائم</p>
                  <a href="/settings" className="underline text-xs mt-1 inline-block">الإعدادات</a>
                </div>
              ) : !hasLists ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>لا توجد قوائم محفوظة بعد</p>
                  <button
                    onClick={() => setPhoneMode("manual")}
                    className="underline text-xs mt-1"
                  >
                    أضف أرقاماً يدوياً واحفظها كقائمة
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {lists.map((list) => {
                    const isSelected = selectedLists.has(list.name);
                    return (
                      <button
                        key={list.name}
                        onClick={() => toggleList(list)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-sm ${
                          isSelected
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border hover:border-primary/40 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span className="font-medium">{list.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {list.phones.length} رقم
                        </Badge>
                      </button>
                    );
                  })}
                  {selectedLists.size > 0 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      <strong className="text-foreground">{phones.length}</strong> رقم فريد من{" "}
                      <strong className="text-foreground">{selectedLists.size}</strong>{" "}
                      {selectedLists.size === 1 ? "قائمة" : "قوائم"}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Textarea
                placeholder={"201012345678\n201123456789\n\nألصق الأرقام — رقم في كل سطر أو مفصولة بفاصلة"}
                value={phonesText}
                onChange={(e) => setPhonesText(e.target.value)}
                rows={5}
                className="font-mono text-sm resize-none"
                dir="ltr"
              />
              {phones.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{phones.length}</strong> رقم صالح
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Step 2: Message ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StepBadge n={2} />الرسالة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <Textarea
            placeholder="اكتب نص الرسالة هنا..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="resize-none rounded-b-none border-b-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          {/* Signature bar */}
          <div className={`border rounded-b-md transition-colors ${
            signatureEnabled ? "bg-muted/40 border-border" : "bg-background border-border opacity-60"
          }`}>
            <div className="flex items-center justify-between px-3 py-1.5 border-b">
              <div className="flex items-center gap-2">
                <PenLine className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">التوقيع</span>
              </div>
              <div className="flex items-center gap-1">
                {!isEditingSignature && (
                  <button onClick={startEditSignature}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors">
                    <Pencil className="h-3 w-3" />تعديل
                  </button>
                )}
                {isEditingSignature && (
                  <>
                    <button onClick={saveSignature}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 px-1.5 py-0.5 rounded hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors">
                      <Check className="h-3 w-3" />حفظ
                    </button>
                    <button onClick={cancelEditSignature}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors">
                      <X className="h-3 w-3" />إلغاء
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSignatureEnabled((v) => !v)}
                  className={`relative ml-1 inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${
                    signatureEnabled ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                    signatureEnabled ? "translate-x-3.5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            </div>
            <div className="px-3 py-2">
              {isEditingSignature ? (
                <Textarea
                  value={sigDraft}
                  onChange={(e) => setSigDraft(e.target.value)}
                  placeholder={"اكتب توقيعك هنا...\nمثال: أحمد محمد | 01012345678 | شركة النجاح العقارية"}
                  rows={3}
                  className="resize-none text-xs border-dashed focus-visible:ring-1"
                  autoFocus
                />
              ) : signature.trim() ? (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{signature}</p>
              ) : (
                <button onClick={startEditSignature}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors italic">
                  اضغط "تعديل" لإضافة توقيعك...
                </button>
              )}
            </div>
          </div>
          {signatureEnabled && signature.trim() && (
            <p className="text-xs text-muted-foreground pt-2">
              سيُضاف التوقيع تلقائياً لكل رسالة
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Step 3: Media (large dropzone) ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StepBadge n={3} />
            صور وفيديوهات
            <span className="text-xs font-normal text-muted-foreground">(اختياري)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          <div
            ref={dropRef}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none
              min-h-[180px] py-10
              ${isDragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
              isDragOver ? "bg-primary/10" : "bg-muted"
            }`}>
              <UploadCloud className={`h-7 w-7 transition-colors ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-sm text-foreground">
                {isDragOver ? "اتركها هنا!" : "اسحب الملفات هنا"}
              </p>
              <p className="text-xs text-muted-foreground">
                أو اضغط لاختيار الصور والفيديوهات من جهازك
              </p>
              <div className="flex items-center justify-center gap-3 pt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                  <ImageIcon className="h-3 w-3" /> JPG, PNG, WEBP
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                  <Video className="h-3 w-3" /> MP4, 3GP
                </span>
              </div>
            </div>
          </div>

          {/* Uploaded files grid */}
          {mediaItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mediaItems.map((item, idx) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  idx={idx}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          )}

          {readyMedia.length > 0 && (
            <p className="text-xs text-muted-foreground">
              سيتم إرسال{" "}
              <strong className="text-foreground">{1 + readyMedia.length} رسالة</strong>{" "}
              لكل رقم (نص + {readyMedia.length} مرفق)
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Send button ─── */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {phones.length > 0 && message && (
            <>{totalMessages} رسالة ← {phones.length} رقم</>
          )}
        </span>
        <Button
          size="lg"
          className="px-8"
          disabled={phones.length === 0 || !message || isSending || !settings?.isConfigured || anyUploading}
          onClick={() => setIsConfirmOpen(true)}
        >
          {isSending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />جاري الإرسال...</>
          ) : anyUploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />جاري رفع الملفات...</>
          ) : (
            <><Send className="h-4 w-4 mr-2" />إرسال للكل</>
          )}
        </Button>
      </div>

      {/* ─── Results ─── */}
      {sendResults && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-3">
              نتائج الإرسال
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                {successCount} نجح
              </Badge>
              {failCount > 0 && (
                <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
                  {failCount} فشل
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-60 overflow-y-auto divide-y">
              {sendResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  {r.success
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                  <span className="font-mono text-muted-foreground text-xs">{r.phone}</span>
                  {r.error && (
                    <span className="text-xs text-red-500 ml-auto truncate max-w-xs">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Confirm Dialog ─── */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تأكيد الإرسال</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              سيتم إرسال <strong>{1 + readyMedia.length} رسالة</strong> لـ{" "}
              <strong>{phones.length} رقم</strong> ({totalMessages} رسالة إجمالاً).
            </p>
            <div className="bg-muted/50 rounded-md p-3 text-xs whitespace-pre-wrap break-words">
              {message.slice(0, 200)}{message.length > 200 ? "..." : ""}
            </div>
            {readyMedia.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {readyMedia.map((m, i) => (
                  <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                    m.type === "image" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" : "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
                  }`}>
                    {m.type === "image" ? "📷" : "🎬"} {m.type === "image" ? `صورة ${i + 1}` : `فيديو ${i + 1}`}
                  </span>
                ))}
              </div>
            )}
            <p className="text-amber-600 dark:text-amber-400 text-xs">
              ملحوظة: رسائل التسويق لعملاء جدد تحتاج template معتمد من Meta.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>إلغاء</Button>
            <Button onClick={handleSend}><Send className="h-4 w-4 mr-2" />إرسال الآن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Save List Dialog ─── */}
      <Dialog open={isSaveListOpen} onOpenChange={setIsSaveListOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>حفظ كقائمة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اسم القائمة</Label>
              <Input value={listName} onChange={(e) => setListName(e.target.value)}
                placeholder="مثال: عملاء يناير" className="mt-1.5" autoFocus />
            </div>
            <p className="text-sm text-muted-foreground">سيتم حفظ {phones.length} رقم على GitHub Gist</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveListOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveList} disabled={!listName.trim() || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Small helpers ───────────────────────────────────────────────────────────────

function StepBadge({ n }: { n: number }) {
  return (
    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
      {n}
    </span>
  );
}

function MediaCard({
  item, idx, onRemove,
}: {
  item: MediaItem;
  idx: number;
  onRemove: () => void;
}) {
  return (
    <div className="relative group rounded-lg overflow-hidden border bg-muted aspect-square">
      {/* Preview */}
      {item.type === "image" ? (
        <img src={item.preview} alt="" className="w-full h-full object-cover" />
      ) : (
        <video src={item.preview} className="w-full h-full object-cover" muted />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          onClick={onRemove}
          className="bg-white/90 hover:bg-white text-red-600 rounded-full p-1.5 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Status badge */}
      <div className="absolute top-1.5 left-1.5">
        {item.uploading && (
          <span className="flex items-center gap-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />رفع...
          </span>
        )}
        {item.waMediaId && !item.uploading && (
          <span className="flex items-center gap-1 bg-green-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            <CheckCircle2 className="h-2.5 w-2.5" />جاهز
          </span>
        )}
        {item.uploadError && (
          <span className="flex items-center gap-1 bg-red-500/90 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            <XCircle className="h-2.5 w-2.5" />فشل
          </span>
        )}
      </div>

      {/* Type badge */}
      <div className="absolute bottom-1.5 right-1.5">
        <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          item.type === "image"
            ? "bg-blue-500/90 text-white"
            : "bg-purple-500/90 text-white"
        }`}>
          {item.type === "image"
            ? <ImageIcon className="h-2.5 w-2.5" />
            : <Video className="h-2.5 w-2.5" />}
          {idx + 1}
        </span>
      </div>
    </div>
  );
}
