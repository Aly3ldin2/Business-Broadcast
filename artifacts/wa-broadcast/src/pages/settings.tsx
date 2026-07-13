import { useState, useEffect, useRef } from "react";
import { PageReveal, Reveal } from "@/components/reveal";
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
  KeyRound,
  QrCode,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "") || "";

const QR_TTL = 60;

function useQRCountdown(qrCode: string | null) {
  const [seconds, setSeconds] = useState(QR_TTL);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!qrCode) {
      if (timerRef.current) clearInterval(timerRef.current);
      setSeconds(QR_TTL);
      return;
    }
    setSeconds(QR_TTL);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((s) => (s <= 1 ? QR_TTL : s - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [qrCode]);

  const pct = seconds / QR_TTL;
  const color: "green" | "amber" | "red" =
    seconds > 30 ? "green" : seconds > 15 ? "amber" : "red";

  return { seconds, pct, color };
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, dir } = useI18n();

  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  const saveMutation = useSaveSettings();
  const logoutMutation = useBaileysLogout();

  const { data: baileysStatus, isFetching: statusFetching } = useGetBaileysStatus({
    query: {
      refetchInterval: (q) => (q.state.data?.connected ? 10_000 : 2_000),
      queryKey: getGetBaileysStatusQueryKey(),
    },
  });

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
  const [credForm, setCredForm] = useState({ newUsername: "", newPassword: "", confirmPassword: "" });
  const [credLoading, setCredLoading] = useState(false);

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
    toast({ title: t("settings_github_saved") });
  }

  async function handleWALogout() {
    try {
      await logoutMutation.mutateAsync(undefined as unknown as void);
      await queryClient.invalidateQueries({ queryKey: getGetBaileysStatusQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: t("settings_disconnected") });
    } catch (e: unknown) {
      toast({ title: t("settings_disconnect_fail"), description: (e as Error)?.message, variant: "destructive" });
    }
  }

  async function handleChangeCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!credForm.newUsername.trim() || !credForm.newPassword) return;
    if (credForm.newPassword !== credForm.confirmPassword) {
      toast({ title: t("settings_mismatch"), variant: "destructive" });
      return;
    }
    setCredLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/change-credentials`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername: credForm.newUsername.trim(), newPassword: credForm.newPassword }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (!res.ok || data.error) {
        toast({ title: t("settings_error"), description: data.error ?? t("settings_credentials_fail"), variant: "destructive" });
        return;
      }
      toast({ title: t("settings_credentials_saved"), description: t("settings_credentials_saved_desc") });
      await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    } catch {
      toast({ title: t("settings_error"), variant: "destructive" });
    } finally {
      setCredLoading(false);
    }
  }

  const isConnected = baileysStatus?.connected ?? false;
  const qrCode = baileysStatus?.qr ?? null;
  const countdown = useQRCountdown(qrCode);

  const githubSteps = [
    {
      n: 1,
      title: t("settings_github_step1_title"),
      desc: t("settings_github_step1_desc"),
      link: "https://github.com/settings/tokens/new",
      linkText: t("settings_github_step1_link"),
    },
    {
      n: 2,
      title: t("settings_github_step2_title"),
      desc: t("settings_github_step2_desc"),
    },
    {
      n: 3,
      title: t("settings_github_step3_title"),
      desc: t("settings_github_step3_desc"),
    },
  ];

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageReveal>
    <div className="space-y-8 max-w-2xl" dir={dir}>
      <Reveal>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings_title")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings_subtitle")}</p>
      </div>
      </Reveal>

      {/* WhatsApp Section */}
      <Reveal delay={0.08}><Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            {t("settings_wa_section")}
            {isConnected ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Wifi className="h-3 w-3" />{t("settings_connected")}
              </span>
            ) : (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <WifiOff className="h-3 w-3" />{t("settings_not_connected")}
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
                  <p className="font-medium text-green-800 dark:text-green-300">{t("settings_wa_ready")}</p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">{t("settings_wa_ready_sub")}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => void handleWALogout()}
                disabled={logoutMutation.isPending}
                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                {logoutMutation.isPending
                  ? <Loader2 className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"} animate-spin`} />
                  : <LogOut className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />}
                {t("settings_disconnect")}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* QR Steps */}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <QrCode className="h-4 w-4" />
                  {t("settings_qr_steps_title")}
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {[
                    t("settings_qr_step1"),
                    t("settings_qr_step2"),
                    t("settings_qr_step3"),
                  ].map((step, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Display */}
              <div className="flex flex-col items-center gap-3 py-2">
                {qrCode ? (
                  <>
                    <div className="p-3 bg-white rounded-xl border border-border shadow-sm">
                      <img src={qrCode} alt="WhatsApp QR Code" className="w-52 h-52 object-contain" />
                    </div>

                    {/* Progress bar timer */}
                    <div className="w-full max-w-[220px] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <RefreshCw className="h-3 w-3" />
                          {t("settings_qr_auto_refresh")}
                        </span>
                        <span
                          className={`tabular-nums font-bold ${
                            countdown.color === "green"
                              ? "text-green-600 dark:text-green-400"
                              : countdown.color === "amber"
                              ? "text-amber-500"
                              : "text-red-500"
                          }`}
                        >
                          {countdown.seconds}s
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                            countdown.color === "green"
                              ? "bg-green-500"
                              : countdown.color === "amber"
                              ? "bg-amber-400"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${countdown.pct * 100}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-52 h-52 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      {statusFetching ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
                      ) : (
                        <div className="text-center space-y-2">
                          <QrCode className="h-10 w-10 mx-auto text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">{t("settings_qr_waiting")}</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("settings_qr_connecting")}</p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{t("settings_baileys_note")}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card></Reveal>

      {/* Change Credentials */}
      <Reveal delay={0.14}><Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {t("settings_credentials_section")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleChangeCredentials(e)} className="space-y-4">
            <div>
              <Label>{t("settings_new_username")}</Label>
              <Input
                dir="ltr"
                value={credForm.newUsername}
                onChange={(e) => setCredForm({ ...credForm, newUsername: e.target.value })}
                placeholder={t("settings_new_username_placeholder")}
                className="mt-1.5"
                disabled={credLoading}
              />
            </div>
            <div>
              <Label>{t("settings_new_password")}</Label>
              <Input
                type="password"
                dir="ltr"
                value={credForm.newPassword}
                onChange={(e) => setCredForm({ ...credForm, newPassword: e.target.value })}
                placeholder="••••••••"
                className="mt-1.5"
                disabled={credLoading}
              />
            </div>
            <div>
              <Label>{t("settings_confirm_password")}</Label>
              <Input
                type="password"
                dir="ltr"
                value={credForm.confirmPassword}
                onChange={(e) => setCredForm({ ...credForm, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="mt-1.5"
                disabled={credLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={credLoading || !credForm.newUsername.trim() || !credForm.newPassword || !credForm.confirmPassword}
            >
              {credLoading
                ? <Loader2 className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"} animate-spin`} />
                : <KeyRound className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />}
              {t("settings_save_credentials")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("settings_credentials_hint")}</p>
          </form>
        </CardContent>
      </Card></Reveal>

      {/* GitHub Gist */}
      <Reveal delay={0.2}><Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Github className="h-4 w-4" />
            {t("settings_github_section")}
            {settings?.hasGithubToken ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{t("settings_github_configured")}</span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{t("settings_github_optional")}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">{t("settings_github_desc")}</p>

          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">{t("settings_github_steps_title")}</p>
            {githubSteps.map((step) => (
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

          <div className="space-y-3">
            <div>
              <Label>{t("settings_github_token_label")}</Label>
              <Input
                dir="ltr"
                type="password"
                value={githubForm.githubToken}
                onChange={(e) => setGithubForm({ ...githubForm, githubToken: e.target.value })}
                placeholder={settings?.hasGithubToken ? t("settings_github_token_placeholder_saved") : "ghp_xxxxxxxxxxxx"}
                className="mt-1.5 font-mono text-sm"
              />
            </div>

            <div>
              <Label>{t("settings_gist_id_label")}</Label>
              <Input
                dir="ltr"
                value={githubForm.gistId}
                onChange={(e) => setGithubForm({ ...githubForm, gistId: e.target.value })}
                placeholder={t("settings_gist_id_placeholder")}
                className="mt-1.5 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">{t("settings_gist_id_hint")}</p>
            </div>

            <Button
              onClick={() => void handleSaveGitHub()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? <Loader2 className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"} animate-spin`} />
                : <Github className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />}
              {t("settings_save_github")}
            </Button>
          </div>
        </CardContent>
      </Card></Reveal>
    </div>
    </PageReveal>
  );
}
