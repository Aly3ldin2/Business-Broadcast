import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useSaveSettings,
  useTestConnection,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Github,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WA_STEPS = [
  {
    n: 1,
    title: "أنشئ حساب Meta Developer",
    desc: 'اذهب لـ developers.facebook.com وسجل دخول. اضغط "Get Started".',
    link: "https://developers.facebook.com",
    linkText: "افتح Meta for Developers",
  },
  {
    n: 2,
    title: "أنشئ App جديد",
    desc: 'اضغط "Create App"، اختار نوع "Business"، اديله اسم، واضغط Create.',
  },
  {
    n: 3,
    title: "أضف WhatsApp للـ App",
    desc: 'في لوحة التحكم، دور على "Add products to your app" واضغط Set Up جنب WhatsApp.',
  },
  {
    n: 4,
    title: "خد الـ Phone Number ID",
    desc: 'اذهب لـ WhatsApp > Getting Started في القايمة الجانبية. هتلاقي "Phone Number ID" — انسخه وحطه تحت.',
  },
  {
    n: 5,
    title: "أنشئ Access Token دائم",
    desc: "اذهب لـ Meta Business Manager > System Users. أنشئ System User بصلاحية Admin، اضغط Generate New Token، اختار الـ App، أضف صلاحية whatsapp_business_messaging، وانسخ التوكن.",
    link: "https://business.facebook.com/settings/system-users",
    linkText: "افتح Business Manager",
  },
];

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
  const { data: settings, isLoading } = useGetSettings();
  const saveMutation = useSaveSettings();
  const testMutation = useTestConnection();

  const [waForm, setWaForm] = useState({
    phoneNumberId: "",
    accessToken: "",
    businessAccountId: "",
  });
  const [githubForm, setGithubForm] = useState({
    githubToken: "",
    gistId: "",
  });
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    phoneNumber?: string | null;
  } | null>(null);

  useEffect(() => {
    if (settings) {
      setWaForm({
        phoneNumberId: settings.phoneNumberId ?? "",
        accessToken: "",
        businessAccountId: settings.businessAccountId ?? "",
      });
      setGithubForm({
        githubToken: "",
        gistId: settings.gistId ?? "",
      });
    }
  }, [settings]);

  async function handleSaveWA() {
    const data: Record<string, string> = {};
    if (waForm.phoneNumberId) data.phoneNumberId = waForm.phoneNumberId;
    if (waForm.accessToken) data.accessToken = waForm.accessToken;
    if (waForm.businessAccountId !== undefined)
      data.businessAccountId = waForm.businessAccountId;
    await saveMutation.mutateAsync({ data });
    queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    toast({ title: "تم حفظ بيانات WhatsApp" });
  }

  async function handleSaveGitHub() {
    const data: Record<string, string> = {};
    if (githubForm.githubToken) data.githubToken = githubForm.githubToken;
    if (githubForm.gistId !== undefined) data.gistId = githubForm.gistId;
    await saveMutation.mutateAsync({ data });
    queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    toast({ title: "تم حفظ بيانات GitHub" });
  }

  async function handleTest() {
    const result = await testMutation.mutateAsync(undefined as unknown as void);
    setTestResult(result);
  }

  return (
    <div className="space-y-8 max-w-2xl" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">
          ضيف بيانات WhatsApp API وGitHub لحفظ قوائم الأرقام
        </p>
      </div>

      {/* WhatsApp API Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            WhatsApp Business API
            {settings?.isConfigured ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                مضبوط
              </span>
            ) : (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                مش مضبوط
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Setup Steps */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">
              خطوات الإعداد:
            </p>
            {WA_STEPS.map((step) => (
              <div key={step.n} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {step.n}
                </div>
                <div>
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.desc}
                  </p>
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

          {/* Form */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Phone Number ID *</Label>
                <Input
                  value={waForm.phoneNumberId}
                  onChange={(e) =>
                    setWaForm({ ...waForm, phoneNumberId: e.target.value })
                  }
                  placeholder="123456789012345"
                  dir="ltr"
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label>Access Token *</Label>
                <Input
                  type="password"
                  value={waForm.accessToken}
                  onChange={(e) =>
                    setWaForm({ ...waForm, accessToken: e.target.value })
                  }
                  placeholder={
                    settings?.accessToken
                      ? `الحالي: ${settings.accessToken} — الصق توكن جديد للتحديث`
                      : "الصق الـ Access Token هنا"
                  }
                  dir="ltr"
                  className="mt-1.5"
                />
              </div>

              {testResult && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                    testResult.success
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p>{testResult.message}</p>
                    {testResult.phoneNumber && (
                      <p className="font-medium mt-0.5">
                        رقم الهاتف: {testResult.phoneNumber}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveWA}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  حفظ بيانات WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  اختبار الاتصال
                </Button>
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
            <p className="text-sm font-medium text-muted-foreground">
              خطوات الإعداد:
            </p>
            {GITHUB_STEPS.map((step) => (
              <div key={step.n} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                  {step.n}
                </div>
                <div>
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.desc}
                  </p>
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

          <div className="space-y-4">
            <div>
              <Label>GitHub Personal Access Token</Label>
              <Input
                type="password"
                value={githubForm.githubToken}
                onChange={(e) =>
                  setGithubForm({ ...githubForm, githubToken: e.target.value })
                }
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
                onChange={(e) =>
                  setGithubForm({ ...githubForm, gistId: e.target.value })
                }
                placeholder="سيتم الإنشاء تلقائياً أول مرة تحفظ قائمة"
                dir="ltr"
                className="mt-1.5 font-mono text-sm"
              />
            </div>
            <Button
              onClick={handleSaveGitHub}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Github className="h-4 w-4 mr-2" />
              )}
              حفظ بيانات GitHub
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
