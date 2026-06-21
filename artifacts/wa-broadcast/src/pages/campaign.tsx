import { useState, useRef, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  Send, Loader2, CloudDownload, CloudUpload,
  CheckCircle2, XCircle, ImageIcon, Video,
  AlertTriangle, Trash2, GripVertical, Link2, Upload, Users,
  Pencil, Check, X, PenLine,
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

type MediaSource = "url" | "device";

interface MediaItem {
  id: string;
  type: "image" | "video";
  source: MediaSource;
  // URL mode
  url: string;
  // Device upload mode
  file?: File;
  preview?: string;     // object URL for preview
  waMediaId?: string;   // returned from upload
  uploading?: boolean;
  uploadError?: string;
}

export default function Campaign() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [phonesText, setPhonesText] = useState("");
  const [listName, setListName] = useState("");
  const [message, setMessage] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaveListOpen, setIsSaveListOpen] = useState(false);
  const [isLoadListOpen, setIsLoadListOpen] = useState(false);

  // ── Signature ──────────────────────────────────────────────────
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

  function startEditSignature() {
    setSigDraft(signature);
    setIsEditingSignature(true);
  }
  function saveSignature() {
    setSignature(sigDraft);
    setIsEditingSignature(false);
  }
  function cancelEditSignature() {
    setIsEditingSignature(false);
  }

  const fullMessage =
    signatureEnabled && signature.trim()
      ? message + "\n\n" + signature.trim()
      : message;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAddType = useRef<"image" | "video">("image");

  const { data: settings } = useGetSettings();
  const { data: gistData } = useLoadPhonesFromGist({
    query: {
      enabled: !!settings?.hasGithubToken,
      queryKey: getLoadPhonesFromGistQueryKey(),
    },
  });
  const sendMutation = useSendCampaign();
  const saveMutation = useSavePhonesToGist();

  function parsePhones(): string[] {
    return phonesText
      .split(/[\n,،;]+/)
      .map((p) => p.trim().replace(/[\s+\-()]/g, ""))
      .filter((p) => p.length >= 10);
  }
  const phones = parsePhones();

  // ── Media helpers ──────────────────────────────────────────────
  function addUrlItem(type: "image" | "video") {
    setMediaItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type, source: "url", url: "" },
    ]);
  }

  function triggerFileInput(type: "image" | "video") {
    pendingAddType.current = type;
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === "image" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/3gpp";
      fileInputRef.current.click();
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const newItems: MediaItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      type: pendingAddType.current,
      source: "device" as const,
      url: "",
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }));

    setMediaItems((prev) => [...prev, ...newItems]);

    // Upload each file to WhatsApp via backend
    for (const item of newItems) {
      if (!item.file) continue;
      try {
        const formData = new FormData();
        formData.append("file", item.file);
        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json() as { id?: string; error?: string };
        if (res.ok && data.id) {
          setMediaItems((prev) =>
            prev.map((m) =>
              m.id === item.id
                ? { ...m, waMediaId: data.id, uploading: false }
                : m
            )
          );
        } else {
          setMediaItems((prev) =>
            prev.map((m) =>
              m.id === item.id
                ? { ...m, uploading: false, uploadError: data.error ?? "فشل الرفع" }
                : m
            )
          );
        }
      } catch {
        setMediaItems((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? { ...m, uploading: false, uploadError: "خطأ في الاتصال" }
              : m
          )
        );
      }
    }
  }

  function updateUrl(id: string, url: string) {
    setMediaItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, url } : m))
    );
  }

  function removeItem(id: string) {
    setMediaItems((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((m) => m.id !== id);
    });
  }

  // ── Send ───────────────────────────────────────────────────────
  function buildApiMediaItems() {
    return mediaItems
      .filter((m) => {
        if (m.source === "device") return !!m.waMediaId;
        return !!m.url.trim();
      })
      .map((m) => ({
        type: m.type,
        id: m.waMediaId ?? null,
        url: m.source === "url" ? m.url.trim() : null,
      }));
  }

  const readyMedia = buildApiMediaItems();
  const anyUploading = mediaItems.some((m) => m.uploading);

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

  function loadList(list: PhoneList) {
    setPhonesText(list.phones.join("\n"));
    setIsLoadListOpen(false);
    toast({ title: `تم تحميل "${list.name}" — ${list.phones.length} رقم` });
  }

  const successCount = sendResults?.filter((r) => r.success).length ?? 0;
  const failCount = sendResults?.filter((r) => !r.success).length ?? 0;
  const totalMessages = phones.length > 0 ? phones.length * (1 + readyMedia.length) : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelected}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">رسالة جديدة</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          ألصق الأرقام، اكتب الرسالة، أضف صور وفيديوهات، ثم أرسل
        </p>
      </div>

      {!settings?.isConfigured && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>تنبيه:</strong> لازم تضيف بيانات WhatsApp API الأول.{" "}
            <a href="/settings" className="underline font-medium">اذهب للإعدادات</a>
          </div>
        </div>
      )}

      {/* Step 1: Phones */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <StepBadge n={1} />
              أرقام الهاتف
            </CardTitle>
            {settings?.hasGithubToken && (
              <Button variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => setIsSaveListOpen(true)}
                disabled={phones.length === 0}>
                <CloudUpload className="h-3 w-3 mr-1" />حفظ كقائمة
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Inline list picker */}
          {settings?.hasGithubToken && gistData?.lists && gistData.lists.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">اختار من قوائمك:</p>
              <div className="flex flex-wrap gap-2">
                {gistData.lists.map((list) => {
                  const isLoaded = phonesText.trim() !== "" &&
                    list.phones.every((p) => phonesText.includes(p));
                  return (
                    <button
                      key={list.name}
                      onClick={() => {
                        if (phonesText.trim() && !isLoaded) {
                          // Append phones not already present
                          const existing = new Set(parsePhones());
                          const toAdd = list.phones.filter((p) => !existing.has(p));
                          setPhonesText((prev) =>
                            prev.trimEnd() + (prev.trim() ? "\n" : "") + toAdd.join("\n")
                          );
                        } else if (!phonesText.trim()) {
                          setPhonesText(list.phones.join("\n"));
                        } else {
                          // Already loaded — deselect (clear list phones)
                          const listSet = new Set(list.phones);
                          const remaining = parsePhones().filter((p) => !listSet.has(p));
                          setPhonesText(remaining.join("\n"));
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                        isLoaded
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      {list.name}
                      <span className={`text-[10px] px-1 rounded-full ${
                        isLoaded ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {list.phones.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
        </CardContent>
      </Card>

      {/* Step 2: Message */}
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

          {/* Signature section */}
          <div className={`border rounded-b-md transition-colors ${
            signatureEnabled ? "bg-muted/40 border-border" : "bg-background border-border opacity-60"
          }`}>
            {/* Signature header bar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b">
              <div className="flex items-center gap-2">
                <PenLine className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">التوقيع</span>
              </div>
              <div className="flex items-center gap-1">
                {!isEditingSignature && (
                  <button
                    onClick={startEditSignature}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
                  >
                    <Pencil className="h-3 w-3" />
                    تعديل
                  </button>
                )}
                {isEditingSignature && (
                  <>
                    <button
                      onClick={saveSignature}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 px-1.5 py-0.5 rounded hover:bg-green-50 transition-colors"
                    >
                      <Check className="h-3 w-3" />
                      حفظ
                    </button>
                    <button
                      onClick={cancelEditSignature}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
                    >
                      <X className="h-3 w-3" />
                      إلغاء
                    </button>
                  </>
                )}
                {/* Toggle */}
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

            {/* Signature body */}
            <div className="px-3 py-2">
              {isEditingSignature ? (
                <Textarea
                  value={sigDraft}
                  onChange={(e) => setSigDraft(e.target.value)}
                  placeholder="اكتب توقيعك هنا...&#10;مثال: أحمد محمد | 01012345678 | شركة النجاح العقارية"
                  rows={3}
                  className="resize-none text-xs border-dashed focus-visible:ring-1"
                  autoFocus
                />
              ) : signature.trim() ? (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {signature}
                </p>
              ) : (
                <button
                  onClick={startEditSignature}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors italic"
                >
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

      {/* Step 3: Media */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <StepBadge n={3} />
              صور وفيديوهات
              <span className="text-xs font-normal text-muted-foreground">(اختياري)</span>
            </CardTitle>
            {/* Add buttons */}
            <div className="flex gap-1.5">
              {/* Image */}
              <div className="flex rounded-md border overflow-hidden text-xs">
                <button
                  onClick={() => addUrlItem("image")}
                  className="flex items-center gap-1 px-2 py-1.5 hover:bg-muted transition-colors border-r"
                  title="أضف رابط صورة"
                >
                  <Link2 className="h-3 w-3" />
                  <ImageIcon className="h-3 w-3" />
                </button>
                <button
                  onClick={() => triggerFileInput("image")}
                  className="flex items-center gap-1 px-2 py-1.5 hover:bg-muted transition-colors"
                  title="ارفع صورة من الجهاز"
                >
                  <Upload className="h-3 w-3" />
                  <ImageIcon className="h-3 w-3" />
                </button>
              </div>
              {/* Video */}
              <div className="flex rounded-md border overflow-hidden text-xs">
                <button
                  onClick={() => addUrlItem("video")}
                  className="flex items-center gap-1 px-2 py-1.5 hover:bg-muted transition-colors border-r"
                  title="أضف رابط فيديو"
                >
                  <Link2 className="h-3 w-3" />
                  <Video className="h-3 w-3" />
                </button>
                <button
                  onClick={() => triggerFileInput("video")}
                  className="flex items-center gap-1 px-2 py-1.5 hover:bg-muted transition-colors"
                  title="ارفع فيديو من الجهاز"
                >
                  <Upload className="h-3 w-3" />
                  <Video className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Link2 className="h-3 w-3" /> رابط URL</span>
            <span className="flex items-center gap-1"><Upload className="h-3 w-3" /> رفع من الجهاز</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mediaItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              اضغط على أي زرار بالأعلى لإضافة صورة أو فيديو
            </p>
          ) : (
            mediaItems.map((item, idx) => (
              <MediaRow
                key={item.id}
                item={item}
                idx={idx}
                onUrlChange={(url) => updateUrl(item.id, url)}
                onRemove={() => removeItem(item.id)}
              />
            ))
          )}
          {readyMedia.length > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              سيتم إرسال{" "}
              <strong className="text-foreground">{1 + readyMedia.length} رسالة</strong>{" "}
              لكل رقم (نص + {readyMedia.length} مرفق)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Send */}
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

      {/* Results */}
      {sendResults && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-3">
              نتائج الإرسال
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">{successCount} نجح</Badge>
              {failCount > 0 && (
                <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">{failCount} فشل</Badge>
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

      {/* Confirm Dialog */}
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
                    m.type === "image" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                  }`}>
                    {m.type === "image" ? "📷" : "🎬"} {m.type === "image" ? `صورة ${i + 1}` : `فيديو ${i + 1}`}
                  </span>
                ))}
              </div>
            )}
            <p className="text-amber-600 text-xs">
              ملحوظة: رسائل التسويق لعملاء جدد تحتاج template معتمد من Meta.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>إلغاء</Button>
            <Button onClick={handleSend}><Send className="h-4 w-4 mr-2" />إرسال الآن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save List */}
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

      {/* Load List */}
      <Dialog open={isLoadListOpen} onOpenChange={setIsLoadListOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تحميل قائمة</DialogTitle></DialogHeader>
          {!gistData?.lists?.length ? (
            <p className="text-sm text-muted-foreground py-4">لا توجد قوائم محفوظة.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {gistData.lists.map((list) => (
                <button key={list.name} onClick={() => loadList(list)}
                  className="w-full text-right flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{list.name}</p>
                    <p className="text-xs text-muted-foreground">{list.phones.length} رقم</p>
                  </div>
                  <CloudDownload className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLoadListOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function StepBadge({ n }: { n: number }) {
  return (
    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
      {n}
    </span>
  );
}

function MediaRow({
  item, idx, onUrlChange, onRemove,
}: {
  item: MediaItem;
  idx: number;
  onUrlChange: (url: string) => void;
  onRemove: () => void;
}) {
  const typeLabel = item.type === "image" ? "صورة" : "فيديو";
  const colorClass = item.type === "image"
    ? "bg-blue-100 text-blue-700"
    : "bg-purple-100 text-purple-700";

  return (
    <div className="flex items-start gap-2">
      {/* Label */}
      <div className="flex items-center gap-1 shrink-0 mt-1.5">
        <GripVertical className="h-4 w-4 text-muted-foreground/30" />
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${colorClass}`}>
          {item.type === "image" ? <ImageIcon className="h-3 w-3" /> : <Video className="h-3 w-3" />}
          {typeLabel} {idx + 1}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {item.source === "device" ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {/* Thumbnail */}
              {item.preview && item.type === "image" && (
                <img
                  src={item.preview}
                  alt=""
                  className="h-10 w-10 object-cover rounded border shrink-0"
                />
              )}
              {item.preview && item.type === "video" && (
                <video
                  src={item.preview}
                  className="h-10 w-10 object-cover rounded border shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{item.file?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.file ? (item.file.size / 1024 / 1024).toFixed(1) + " MB" : ""}
                </p>
              </div>
            </div>
            {/* Upload status */}
            {item.uploading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                جاري الرفع على WhatsApp...
              </div>
            )}
            {item.waMediaId && !item.uploading && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                تم الرفع بنجاح
              </div>
            )}
            {item.uploadError && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <XCircle className="h-3 w-3" />
                {item.uploadError}
              </div>
            )}
          </div>
        ) : (
          <Input
            placeholder={item.type === "image" ? "https://example.com/photo.jpg" : "https://example.com/video.mp4"}
            value={item.url}
            onChange={(e) => onUrlChange(e.target.value)}
            className="font-mono text-xs h-8"
            dir="ltr"
          />
        )}
      </div>

      {/* Remove */}
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive mt-0.5"
        onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
