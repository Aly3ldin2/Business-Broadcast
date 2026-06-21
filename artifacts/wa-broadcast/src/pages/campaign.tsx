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

export default function Campaign() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [phonesText, setPhonesText] = useState("");
  const [listName, setListName] = useState("");

  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "none">("none");

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

  async function handleSend() {
    setIsSending(true);
    setIsConfirmOpen(false);
    setSendResults(null);
    try {
      const result = await sendMutation.mutateAsync({
        data: {
          phones,
          message,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType !== "none" ? mediaType : null,
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
    const existingLists: PhoneList[] = gistData?.lists ?? [];
    const name = listName.trim();
    if (!name) return;
    const idx = existingLists.findIndex((l) => l.name === name);
    let newLists: PhoneList[];
    if (idx >= 0) {
      newLists = existingLists.map((l, i) => (i === idx ? { ...l, phones } : l));
    } else {
      newLists = [...existingLists, { name, phones }];
    }
    try {
      await saveMutation.mutateAsync({ data: { lists: newLists } });
      queryClient.invalidateQueries({ queryKey: getLoadPhonesFromGistQueryKey() });
      setIsSaveListOpen(false);
      setListName("");
      toast({ title: `تم حفظ القائمة "${name}" — ${phones.length} رقم` });
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e?.message, variant: "destructive" });
    }
  }

  function loadList(list: PhoneList) {
    setPhonesText(list.phones.join("\n"));
    setIsLoadListOpen(false);
    toast({ title: `تم تحميل "${list.name}" — ${list.phones.length} رقم` });
  }

  const successCount = sendResults?.filter((r) => r.success).length ?? 0;
  const failCount = sendResults?.filter((r) => !r.success).length ?? 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">إرسال رسالة</h1>
        <p className="text-muted-foreground mt-1">
          ألصق الأرقام، اكتب الرسالة، واضغط إرسال
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
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                1
              </span>
              أرقام الهاتف
            </CardTitle>
            {settings?.hasGithubToken && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLoadListOpen(true)}
                  disabled={!gistData?.lists?.length}
                >
                  <CloudDownload className="h-3.5 w-3.5 mr-1" />
                  تحميل قائمة
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSaveListOpen(true)}
                  disabled={phones.length === 0}
                >
                  <CloudUpload className="h-3.5 w-3.5 mr-1" />
                  حفظ كقائمة
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder={`201012345678\n201123456789\n201234567890\n\nألصق الأرقام هنا — رقم في كل سطر أو مفصولة بفاصلة`}
            value={phonesText}
            onChange={(e) => setPhonesText(e.target.value)}
            rows={6}
            className="font-mono text-sm resize-none"
            dir="ltr"
          />
          {phones.length > 0 && (
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{phones.length}</strong> رقم صالح
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Message */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              2
            </span>
            الرسالة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>نص الرسالة *</Label>
            <Textarea
              placeholder="اكتب نص الرسالة هنا..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              نوع المحتوى (اختياري)
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {(["none", "image", "video"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMediaType(type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors text-sm font-medium ${
                    mediaType === type
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {type === "none" && <span className="text-lg">✉️</span>}
                  {type === "image" && <ImageIcon className="h-5 w-5" />}
                  {type === "video" && <Video className="h-5 w-5" />}
                  {type === "none" ? "نص فقط" : type === "image" ? "صورة" : "فيديو"}
                </button>
              ))}
            </div>
          </div>

          {mediaType !== "none" && (
            <div>
              <Label>رابط {mediaType === "image" ? "الصورة" : "الفيديو"} *</Label>
              <Input
                placeholder={
                  mediaType === "image"
                    ? "https://example.com/image.jpg"
                    : "https://example.com/video.mp4"
                }
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="mt-1.5 font-mono text-sm"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                الرابط لازم يكون متاح للعموم (public URL).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {phones.length > 0 && message && (
            <>
              جاهز للإرسال لـ <strong>{phones.length}</strong> رقم
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
            <CardTitle className="text-base flex items-center gap-3">
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
            <div className="max-h-64 overflow-y-auto divide-y">
              {sendResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  {r.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="font-mono text-muted-foreground">{r.phone}</span>
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

      {/* Confirm Send */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الإرسال</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              سيتم إرسال الرسالة لـ <strong>{phones.length} رقم</strong>.
            </p>
            <div className="bg-muted/50 rounded-md p-3 text-xs whitespace-pre-wrap break-words">
              {message.slice(0, 200)}
              {message.length > 200 ? "..." : ""}
            </div>
            {mediaType !== "none" && mediaUrl && (
              <p className="text-muted-foreground">
                + {mediaType === "image" ? "صورة" : "فيديو"} مرفق
              </p>
            )}
            <p className="text-amber-600 text-xs">
              ملحوظة: واتساب Business API يتيح الرسائل المجانية للمستخدمين الذين
              تواصلوا معك خلال 24 ساعة. للرسائل التسويقية تحتاج template معتمد.
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
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4 mr-2" />
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
                  <CloudDownload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
