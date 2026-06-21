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
import { CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SETUP_STEPS = [
  {
    number: 1,
    title: "Create a Meta Developer account",
    description: "Go to developers.facebook.com and sign in with your Facebook account. Click \"Get Started\" to activate your developer account.",
    link: "https://developers.facebook.com",
    linkText: "Open Meta for Developers",
  },
  {
    number: 2,
    title: "Create a new App",
    description: "Click \"Create App\", select \"Business\" as the app type, give it a name, and click Create.",
  },
  {
    number: 3,
    title: "Add WhatsApp to your App",
    description: "In the app dashboard, find \"Add products to your app\" and click Set Up next to WhatsApp.",
  },
  {
    number: 4,
    title: "Get your Phone Number ID",
    description: "Go to WhatsApp > Getting Started in the left sidebar. You'll see a \"Phone Number ID\" — copy it and paste it below.",
  },
  {
    number: 5,
    title: "Get a permanent Access Token",
    description: "Go to your Meta Business Manager > System Users > Create a system user with Admin role. Then click \"Generate New Token\", select your app, and add the whatsapp_business_messaging permission. Copy the token below.",
    link: "https://business.facebook.com/settings/system-users",
    linkText: "Open Business Manager",
  },
  {
    number: 6,
    title: "Test your connection",
    description: "Enter your Phone Number ID and Access Token below, save, then click Test Connection to verify everything is working.",
  },
];

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const saveMutation = useSaveSettings();
  const testMutation = useTestConnection();

  const [form, setForm] = useState({ phoneNumberId: "", accessToken: "", businessAccountId: "" });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; phoneNumber?: string | null } | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        phoneNumberId: settings.phoneNumberId ?? "",
        accessToken: "",
        businessAccountId: settings.businessAccountId ?? "",
      });
    }
  }, [settings]);

  async function handleSave() {
    await saveMutation.mutateAsync({ data: { phoneNumberId: form.phoneNumberId, accessToken: form.accessToken, businessAccountId: form.businessAccountId } });
    queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    toast({ title: "Settings saved" });
  }

  async function handleTest() {
    const result = await testMutation.mutateAsync({});
    setTestResult(result);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your WhatsApp Business API credentials</p>
      </div>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup Guide — How to get your API credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {SETUP_STEPS.map((step) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {step.number}
              </div>
              <div>
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                {step.link && (
                  <a href={step.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline">
                    {step.linkText} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* Credentials Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            API Credentials
            {settings?.isConfigured ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Configured</span>
            ) : (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Not configured</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <>
              <div>
                <Label>Phone Number ID *</Label>
                <Input
                  value={form.phoneNumberId}
                  onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
                  placeholder="e.g. 123456789012345"
                />
                <p className="text-xs text-muted-foreground mt-1">Found in WhatsApp &gt; Getting Started in your Meta app</p>
              </div>
              <div>
                <Label>Access Token *</Label>
                <Input
                  type="password"
                  value={form.accessToken}
                  onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                  placeholder={settings?.accessToken ? "Enter new token to update (current: " + settings.accessToken + ")" : "Paste your permanent access token"}
                />
                <p className="text-xs text-muted-foreground mt-1">Generate a permanent token from Meta Business Manager &gt; System Users</p>
              </div>
              <div>
                <Label>Business Account ID (optional)</Label>
                <Input
                  value={form.businessAccountId}
                  onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
                  placeholder="e.g. 987654321098765"
                />
              </div>

              {/* Test Result */}
              {testResult && (
                <div className={`flex items-start gap-2 p-3 rounded-md text-sm ${testResult.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p>{testResult.message}</p>
                    {testResult.phoneNumber && <p className="font-medium mt-0.5">Phone: {testResult.phoneNumber}</p>}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={!form.phoneNumberId || !form.accessToken || saveMutation.isPending}>
                  {saveMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Credentials"}
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={testMutation.isPending}>
                  {testMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</> : "Test Connection"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
