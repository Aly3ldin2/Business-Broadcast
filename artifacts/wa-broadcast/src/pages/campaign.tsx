import { useState } from "react";
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
  Send,
  Loader2,
  CloudDownload,
  CloudUpload,
  CheckCircle2,
  XCircle,
  ImageIcon,
  Video,
  AlertTriangle,
  Plus,
  Trash2,
  GripVertical,
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
  url: string;
  type: "image" | "video";
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

  function addMediaItem(type: "image" | "video") {
    setMediaItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), url: "", type },
    ]);
  }

  function updateMediaItem(id: string, url: string) {
    setMediaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, url } : item))
    );
  }

  function removeMediaItem(id: string) {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSend() {
    setIsSending(true);
    setIsConfirmOpen(false);
    setSendResults(null);
    const validMedia = mediaItems.filter((m) => m.url.trim());
    try {
      const result = await sendMutation.mutateAsync({
        data: {
          phones,
          message,
          mediaItems: validMedia.map((m) => ({ url: m.url, type: m.type })),
        },
      });
      setSendResults(result.results);
      toast({
        title: `تم الإرسال: ${result.sent} نجح، ${result.failed} فشل`,
      });
    } catch (e: any) {
      toast({
        title: "فشل الإرسال",
        description: e?.message ?? "تحقق من إعدادات الـ API",
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
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e?.message, variant: "destructive" });
    }
  }

  function loadList(list: PhoneList) {
    setPhonesText(list.phones.join("\n"));
    setIsLoadListOpen(false);
    toast({ title: `تم تحميل "${list.name}" — ${list.phones.length} رقم` });
  }

  const validMediaItems = mediaItems.filter((m) => m.url.trim());
  const successCount = sendResults?.filter((r) => r.success).length ?? 0;
  const failCount = sendResults?.filter((r) => !r.success).length ?? 0;
  const totalMessages = phones.length > 0
    ? phones.length * (1 + validMediaItems.length)
    : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">رسالة جديدة</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          ألصق الأرقام، اكتب الرسالة، أضف صور وفيديوهات، ثم أرسل
        </p>
      </div>

      {!settings?.isConfigured && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>تنبيه:</strong> لازم تضيف بيانات WhatsApp API الأول.{" "}
            <a href="/settings" className="underline font-medium">
              اذهب للإعدادات
            </a>
          </div>
        </div>
      )}

      {/* Step 1: Phones */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                1
              </span>
              أرقام الهاتف
            </CardTitle>
            {settings?.hasGithubToken && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsLoadListOpen(true)}
                  disabled={!gistData?.lists?.length}
                >
                  <CloudDownload className="h-3 w-3 mr-1" />
                  تحميل قائمة
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsSaveListOpen(true)}
                  disabled={phones.length === 0}
                >
                  <CloudUpload className="h-3 w-3 mr-1" />
                  حفظ كقائمة
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder={`201012345678\n201123456789\n201234567890\n\nألصق الأرقام — رقم في كل سطر أو مفصولة بفاصلة`}
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
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
              2
            </span>
            الرسالة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="اكتب نص الرسالة هنا..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Step 3: Media */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                3
              </span>
              صور وفيديوهات
              <span className="text-xs font-normal text-muted-foreground">(اختياري)</span>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => addMediaItem("image")}
              >
                <ImageIcon className="h-3 w-3 mr-1" />
                + صورة
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => addMediaItem("video")}
              >
                <Video className="h-3 w-3 mr-1" />
                + فيديو
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mediaItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              اضغط "+ صورة" أو "+ فيديو" لإضافة مرفق
            </p>
          ) : (
            mediaItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                  <span
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.type === "image"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {item.type === "image" ? (
                      <ImageIcon className="h-3 w-3" />
                    ) : (
                      <Video className="h-3 w-3" />
                    )}
                    {item.type === "image" ? "صورة" : "فيديو"} {idx + 1}
                  </span>
                </div>
                <Input
                  placeholder={
                    item.type === "image"
                      ? "https://example.com/photo.jpg"
                      : "https://example.com/video.mp4"
                  }
                  value={item.url}
                  onChange={(e) => updateMediaItem(item.id, e.target.value)}
                  className="font-mono text-xs flex-1 h-8"
                  dir="ltr"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMediaItem(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
          {validMediaItems.length > 0 && (
            <p className="text-xs text-muted-foreground">
              سيتم إرسال الرسالة كـ{" "}
              <strong className="text-foreground">
                {1 + validMediaItems.length} رسالة
              </strong>{" "}
              لكل رقم (نص + {validMediaItems.length} مرفق)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Send Button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {phones.length > 0 && message && (
            <>
              {totalMessages} رسالة ← {phones.length} رقم
            </>
          )}
        </span>
        <Button
          size="lg"
          className="px-8"
          disabled={
            phones.length === 0 || !message || isSending || !settings?.isConfigured
          }
          onClick={() => setIsConfirmOpen(true)}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              إرسال للكل
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {sendResults && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-3">
              نتائج الإرسال
              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                {successCount} نجح
              </Badge>
              {failCount > 0 && (
                <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">
                  {failCount} فشل
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-60 overflow-y-auto divide-y">
              {sendResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  {r.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className="font-mono text-muted-foreground text-xs">{r.phone}</span>
                  {r.error && (
                    <span className="text-xs text-red-500 ml-auto truncate max-w-xs">
                      {r.error}
                    </span>
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
          <DialogHeader>
            <DialogTitle>تأكيد الإرسال</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              سيتم إرسال{" "}
              <strong>{1 + validMediaItems.length} رسالة</strong> لـ{" "}
              <strong>{phones.length} رقم</strong>{" "}
              ({totalMessages} رسالة إجمالاً).
            </p>
            <div className="bg-muted/50 rounded-md p-3 text-xs whitespace-pre-wrap break-words">
              {message.slice(0, 200)}
              {message.length > 200 ? "..." : ""}
            </div>
            {validMediaItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {validMediaItems.map((m, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      m.type === "image"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {m.type === "image" ? "📷" : "🎬"}{" "}
                    {m.type === "image" ? `صورة ${i + 1}` : `فيديو ${i + 1}`}
                  </span>
                ))}
              </div>
            )}
            <p className="text-amber-600 text-xs">
              ملحوظة: رسائل التسويق لعملاء جدد تحتاج template معتمد من Meta.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSend}>
              <Send className="h-4 w-4 mr-2" />
              إرسال الآن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save List */}
      <Dialog open={isSaveListOpen} onOpenChange={setIsSaveListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حفظ كقائمة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اسم القائمة</Label>
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="مثال: عملاء يناير"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <p className="text-sm text-muted-foreground">
              سيتم حفظ {phones.length} رقم على GitHub Gist
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveListOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSaveList}
              disabled={!listName.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load List */}
      <Dialog open={isLoadListOpen} onOpenChange={setIsLoadListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحميل قائمة</DialogTitle>
          </DialogHeader>
          {!gistData?.lists?.length ? (
            <p className="text-sm text-muted-foreground py-4">لا توجد قوائم محفوظة.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {gistData.lists.map((list) => (
                <button
                  key={list.name}
                  onClick={() => loadList(list)}
                  className="w-full text-right flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
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
            <Button variant="outline" onClick={() => setIsLoadListOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
