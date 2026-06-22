import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useSaveSettings,
  useGetBaileysStatus,
  useBaileysLogout,
  getGetSettingsQueryKey,
  getGetBaileysStatusQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Loader2,
  ExternalLink,
  Github,
  Smartphone,
  Wifi,
  WifiOff,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GITHUB_STEPS = [
  {
    n: 1,
    title: "أنشئ GitHub Personal Access Token",
    desc: 'اذهب لـ GitHub Settings > Developer settings > Personal access tokens > Tokens (classic). اضغط "Generate new token".',
    link: "https://github.com/settings/tokens/new",
    linkText: "أنشئ Token على GitHub",
  },
  {
    n: 2,
    title: "اختار الصلاحيات",
    desc: 'من الـ Scopes، اختار فقط "gist". ده كافي لحفظ وتحميل القوائم.',
  },
  {
    n: 3,
    title: "انسخ التوكن وحطه هنا",
    desc: "انسخ التوكن وحطه في الخانة دي وحفظ.",
  },
];

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  const saveMutation = useSaveSettings();
  const logoutMutation = useBaileysLogout();

  // Poll Baileys status: every 2s when not connected, every 10s when connected
  const { data: baileysStatus, isFetching: statusFetching } = useGetBaileysStatus({
    query: {
      refetchInterval: (q) => (q.state.data?.connected ? 10_000 : 2_000),
      queryKey: getGetBaileysStatusQueryKey(),
    },
  });

  // When WhatsApp connects, invalidate settings so the rest of the app updates
  const prevConnected = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    const connected = baileysStatus?.connected;
    if (connected !== prevConnected.current) {
      prevConnected.current = connected;
      if (connected) {
        void queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      }
    }
  }, [baileysStatus?.connected, queryClient]);

  const [githubForm, setGithubForm] = useState({ githubToken: "", gistId: "" });

  useEffect(() => {
    if (settings) {
      setGithubForm({ githubToken: "", gistId: settings.gistId ?? "" });
    }
  }, [settings]);

  async function handleSaveGitHub() {
    const data: Record<string, string> = {};
    if (githubForm.githubToken) data.githubToken = githubForm.githubToken;
    if (githubForm.gistId !== undefined) data.gistId = githubForm.gistId;
    await saveMutation.mutateAsync({ data });
    await queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    toast({ title: "تم حفظ بيانات GitHub" });
  }

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync(undefined as unknown as void);
      await queryClient.invalidateQueries({ queryKey: getGetBaileysStatusQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: "تم قطع الاتصال — جاري عرض QR جديد..." });
    } catch (e: unknown) {
      toast({ title: "فشل قطع الاتصال", description: (e as Error)?.message, variant: "destructive" });
    }
  }

  const isConnected = baileysStatus?.connected ?? false;
  const qrCode = baileysStatus?.qr ?? null;

  return (
    <div className="space-y-8 max-w-2xl" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">
          اربط WhatsApp عن طريق Baileys وأضف GitHub لحفظ قوائم الأرقام
        </p>
      </div>

      {/* WhatsApp / Baileys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            WhatsApp — ربط الجهاز
            {isConnected ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                متصل
              </span>
            ) : (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                غير متصل
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">WhatsApp متصل!</p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
                    الجهاز جاهز لإرسال البرودكاست. مش محتاج API ولا حدود.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                {logoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                قطع الاتصال وحذف الجلسة
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">خطوات الاتصال:</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">١</span>
                    <span>افتح WhatsApp على تليفونك</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">٢</span>
                    <span>اضغط على القائمة (⋮) ثم "الأجهزة المرتبطة"</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">٣</span>
                    <span>اضغط "ربط جهاز" ثم امسح QR Code التالي</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col items-center gap-4 py-2">
                {qrCode ? (
                  <>
                    <div className="p-3 bg-white rounded-xl border-2 border-border shadow-sm">
                      <img
                        src={qrCode}
                        alt="WhatsApp QR Code"
                        className="w-52 h-52 object-contain"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      QR Code ينتهي بعد دقيقة — بيتجدد تلقائياً
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-52 h-52 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      {statusFetching ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
                      ) : (
                        <div className="text-center space-y-2">
                          <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">في انتظار QR Code...</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">جاري الاتصال بـ WhatsApp...</p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                <span>
                  <strong>ملاحظة:</strong> Baileys بيشغل WhatsApp Web — زي ما بتفتحه في المتصفح. مفيش حدود على عدد الرسائل ومش محتاج Business API.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GitHub Gist Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Github className="h-4 w-4" />
            GitHub Gist — لحفظ قوائم الأرقام
            {settings?.hasGithubToken ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                مضبوط
              </span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                اختياري
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            بيخليك تحفظ قوائم أرقام العملاء على GitHub Gist وتحملها في أي وقت.
            مجاني تماماً ومش محتاج قاعدة بيانات.
          </p>

          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">خطوات الإعداد:</p>
            {GITHUB_STEPS.map((step) => (
              <div key={step.n} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                  {step.n}
                </div>
                <div>
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline"
                    >
                      {step.linkText}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {settingsLoading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>GitHub Personal Access Token</Label>
                <Input
                  type="password"
                  value={githubForm.githubToken}
                  onChange={(e) => setGithubForm({ ...githubForm, githubToken: e.target.value })}
                  placeholder={
                    settings?.hasGithubToken
                      ? "محفوظ — الصق توكن جديد للتحديث"
                      : "ghp_xxxxxxxxxxxxxxxxxxxx"
                  }
                  dir="ltr"
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label>Gist ID (اختياري — هيتملى تلقائياً)</Label>
                <Input
                  value={githubForm.gistId}
                  onChange={(e) => setGithubForm({ ...githubForm, gistId: e.target.value })}
                  placeholder="سيتم الإنشاء تلقائياً أول مرة تحفظ قائمة"
                  dir="ltr"
                  className="mt-1.5 font-mono text-sm"
                />
              </div>
              <Button onClick={handleSaveGitHub} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Github className="h-4 w-4 mr-2" />
                )}
                حفظ بيانات GitHub
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
