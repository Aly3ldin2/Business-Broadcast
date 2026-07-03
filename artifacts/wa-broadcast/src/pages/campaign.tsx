import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
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
  ChevronDown, ChevronRight, ImageIcon, PartyPopper,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CountryPicker } from "@/components/country-picker";
import { findCountry, parseRawNumbers, type Country } from "@/data/countries";
import { useI18n } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "") || "";
const MAX_VIDEO_DURATION = 300;
const MAX_FILE_SIZE = 300 * 1024 * 1024;

interface SendResult {
  phone: string;
  success: boolean;
  error?: string | null;
}

interface SendProgress {
  phase: "sending" | "complete";
  total: number;
  sent: number;
  failed: number;
  remaining: number;
  currentPhone: string | null;
  results: SendResult[];
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

// ─── Circular progress ring ────────────────────────────────────────────────
function ProgressRing({
  sent, failed, total,
}: { sent: number; failed: number; total: number }) {
  const radius = 54;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;

  const sentPct  = total > 0 ? sent  / total : 0;
  const failedPct = total > 0 ? failed / total : 0;

  const sentArc   = sentPct  * circumference;
  const failedArc = failedPct * circumference;
  const sentDeg   = sentPct  * 360;

  const pct = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 128 128" className="w-40 h-40">
        {/* Track */}
        <circle
          cx="64" cy="64" r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/30"
        />
        {/* Sent arc — green */}
        {sentArc > 0 && (
          <circle
            cx="64" cy="64" r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-emerald-500 transition-all duration-700 ease-out"
            strokeDasharray={`${sentArc} ${circumference - sentArc}`}
            strokeLinecap="butt"
            style={{ transform: "rotate(-90deg)", transformOrigin: "64px 64px" }}
          />
        )}
        {/* Failed arc — red, starts right after sent */}
        {failedArc > 0 && (
          <circle
            cx="64" cy="64" r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-rose-500 transition-all duration-700 ease-out"
            strokeDasharray={`${failedArc} ${circumference - failedArc}`}
            strokeLinecap="butt"
            style={{ transform: `rotate(${-90 + sentDeg}deg)`, transformOrigin: "64px 64px" }}
          />
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-black tabular-nums leading-none">{pct}<span className="text-xl">%</span></span>
        <span className="text-xs text-muted-foreground mt-1">{sent + failed} / {total}</span>
      </div>
    </div>
  );
}

// ─── Progress overlay ──────────────────────────────────────────────────────
function SendProgressOverlay({
  progress,
  onDone,
}: {
  progress: SendProgress;
  onDone: () => void;
}) {
  const { t, dir } = useI18n();
  const isComplete = progress.phase === "complete";
  const total = progress.total;
  const sentPct   = total > 0 ? (progress.sent   / total) * 100 : 0;
  const failedPct = total > 0 ? (progress.failed / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir={dir}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/75 backdrop-blur-md" />

      {/* Card */}
      <div className="relative bg-card border shadow-2xl rounded-3xl p-8 w-full max-w-sm mx-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {isComplete ? t("progress_complete_label") : t("progress_in_progress")}
          </p>
          <h2 className="text-xl font-bold">
            {isComplete ? t("progress_complete") : t("progress_sending")}
          </h2>
        </div>

        {/* Ring */}
        <div className="flex justify-center">
          {isComplete ? (
            <div className="w-40 h-40 flex flex-col items-center justify-center rounded-full border-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40">
              {progress.failed === 0
                ? <PartyPopper className="h-12 w-12 text-emerald-500 mb-1" />
                : <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-1" />
              }
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {t("progress_done")}
              </span>
            </div>
          ) : (
            <ProgressRing
              sent={progress.sent}
              failed={progress.failed}
              total={progress.total}
            />
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 space-y-0.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none pt-1">
              {progress.sent}
            </p>
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">{t("progress_sent")}</p>
          </div>

          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3 space-y-0.5">
            <XCircle className="h-4 w-4 text-rose-500 mx-auto" />
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums leading-none pt-1">
              {progress.failed}
            </p>
            <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400">{t("progress_failed")}</p>
          </div>

          <div className="rounded-2xl bg-muted border p-3 space-y-0.5">
            <Loader2 className={`h-4 w-4 text-muted-foreground mx-auto ${isComplete ? "" : "animate-spin"}`} />
            <p className="text-2xl font-black tabular-nums leading-none pt-1">{progress.remaining}</p>
            <p className="text-[11px] font-medium text-muted-foreground">{t("progress_remaining")}</p>
          </div>
        </div>

        {/* Segmented progress bar */}
        <div className="space-y-1.5">
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full flex transition-all duration-700 ease-out">
              <div
                className="bg-emerald-500 h-full transition-all duration-700 ease-out"
                style={{ width: `${sentPct}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-700 ease-out"
                style={{ width: `${failedPct}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {t("progress_sent")} {Math.round(sentPct)}%
            </span>
            {progress.failed > 0 && (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                {t("progress_failed")} {Math.round(failedPct)}%
              </span>
            )}
            <span className="font-medium">{total} {t("progress_total")}</span>
          </div>
        </div>

        {/* Current phone */}
        {!isComplete && progress.currentPhone && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-sm">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs text-muted-foreground">{t("progress_current")}</span>
            <span className="font-mono text-xs font-semibold truncate" dir="ltr">
              {progress.currentPhone}
            </span>
          </div>
        )}

        {/* Done button */}
        {isComplete && (
          <div className="space-y-2">
            <Button className="w-full rounded-xl h-11 text-base font-semibold" onClick={onDone}>
              <Check className="h-4 w-4 mr-2" />
              {t("progress_view_results")}
            </Button>
            {progress.failed > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {t("progress_partial_note", { failed: progress.failed })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
  );
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to read video duration")); };
    video.src = url;
  });
}

export default function Campaign() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, dir } = useI18n();

  // ── Phone input mode ─────────────────────────────────────────────
  const [phoneMode, setPhoneMode] = useState<"lists" | "manual">("lists");
  const [country, setCountry] = useState<Country>(() =>
    findCountry(localStorage.getItem("wa_country") ?? "EG")
  );
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneList, setPhoneList] = useState<string[]>([]);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
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
    if (!phoneList.includes(full)) setPhoneList((prev) => [...prev, full]);
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
    if (!nums.length) return;
    setPhoneList((prev) => Array.from(new Set([...prev, ...nums])));
    setBulkText("");
    setShowBulkPaste(false);
  }

  function togglePhone(num: string) {
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num); else next.add(num);
      return next;
    });
  }

  function toggleAllFromList(list: PhoneList) {
    const nums = list.phones.map((c) => c.number);
    const allSelected = nums.every((n) => selectedPhones.has(n));
    setSelectedPhones((prev) => {
      const next = new Set(prev);
      if (allSelected) nums.forEach((n) => next.delete(n));
      else nums.forEach((n) => next.add(n));
      return next;
    });
  }

  function toggleExpandList(name: string) {
    setExpandedLists((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function getListCheckState(list: PhoneList): "all" | "some" | "none" {
    const nums = list.phones.map((c) => c.number);
    if (!nums.length) return "none";
    const count = nums.filter((n) => selectedPhones.has(n)).length;
    if (count === 0) return "none";
    if (count === nums.length) return "all";
    return "some";
  }

  // ── Message ──────────────────────────────────────────────────────
  const [message, setMessage] = useState("");

  // ── Media ────────────────────────────────────────────────────────
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Send state ───────────────────────────────────────────────────
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [sendProgress, setSendProgress] = useState<SendProgress | null>(null);

  // ── Signature ────────────────────────────────────────────────────
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

  const fullMessage = signatureEnabled && signature.trim()
    ? message + "\n\n" + signature.trim()
    : message;

  // ── API hooks ────────────────────────────────────────────────────
  const { data: settings } = useGetSettings({
    query: {
      queryKey: getGetSettingsQueryKey(),
      refetchInterval: (q) => (q.state.data?.isConfigured ? false : 5_000),
    },
  });

  const { data: baileysStatus } = useGetBaileysStatus({
    query: {
      queryKey: getGetBaileysStatusQueryKey(),
      refetchInterval: (q) => (q.state.data?.connected ? 15_000 : 5_000),
    },
  });

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
  const saveMutation = useSavePhonesToGist();

  const phones = phoneMode === "lists" ? Array.from(selectedPhones) : phoneList;
  const lists: PhoneList[] = gistData?.lists ?? [];
  const hasLists = lists.length > 0;
  const isConnected = baileysStatus?.connected ?? settings?.isConfigured ?? false;

  // ── Media upload ─────────────────────────────────────────────────
  async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE}/api/media/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = (await res.json()) as { id?: string; error?: string };
    if (res.ok && data.id) return data.id;
    throw new Error(data.error ?? "Upload failed");
  }

  const processFiles = useCallback(async (files: File[]) => {
    const ACCEPTED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const ACCEPTED_VIDEO = ["video/mp4"];
    const validFiles = files.filter((f) => ACCEPTED_IMAGE.includes(f.type) || ACCEPTED_VIDEO.includes(f.type));
    const rejected = files.filter((f) => !ACCEPTED_IMAGE.includes(f.type) && !ACCEPTED_VIDEO.includes(f.type));
    if (rejected.length > 0) {
      toast({ title: t("campaign_unsupported_type"), description: t("campaign_mp4_only"), variant: "destructive" });
    }
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
      if (item.file.size > MAX_FILE_SIZE) {
        setMediaItems((prev) =>
          prev.map((m) => m.id === item.id
            ? { ...m, uploading: false, uploadError: t("campaign_file_too_large") }
            : m)
        );
        continue;
      }

      if (item.type === "video") {
        try {
          const duration = await getVideoDuration(item.file);
          if (duration > MAX_VIDEO_DURATION) {
            setMediaItems((prev) =>
              prev.map((m) => m.id === item.id
                ? { ...m, uploading: false, uploadError: t("campaign_video_too_long", { n: Math.round(duration / 60) }) }
                : m)
            );
            continue;
          }
        } catch { /* ignore */ }
      }

      try {
        const waMediaId = await uploadFile(item.file);
        setMediaItems((prev) =>
          prev.map((m) => m.id === item.id ? { ...m, waMediaId, uploading: false } : m)
        );
      } catch (e: unknown) {
        setMediaItems((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? { ...m, uploading: false, uploadError: (e as Error)?.message ?? t("campaign_upload_error") }
              : m
          )
        );
      }
    }
  }, [t]);

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

  // ── Send (SSE streaming) ─────────────────────────────────────────
  const readyMedia = mediaItems
    .filter((m) => !!m.waMediaId)
    .map((m) => ({ type: m.type, id: m.waMediaId!, url: null }));

  const anyUploading = mediaItems.some((m) => m.uploading);
  const hasText = fullMessage.trim().length > 0;
  const hasContent = hasText || readyMedia.length > 0;

  const msgsPerRecipient = readyMedia.length + (hasText ? 1 : 0);
  const totalMessages = phones.length > 0 ? phones.length * Math.max(msgsPerRecipient, 1) : 0;

  async function handleSend() {
    setIsSending(true);
    setIsConfirmOpen(false);
    setSendResults(null);
    setSendProgress(null);

    try {
      const response = await fetch(`${BASE}/api/campaign/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phones, message: fullMessage, mediaItems: readyMedia }),
      });

      // Non-SSE error (e.g. 400 not connected)
      if (!response.ok || !response.body) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Send failed");
      }

      // Initialize progress
      setSendProgress({
        phase: "sending",
        total: phones.length,
        sent: 0,
        failed: 0,
        remaining: phones.length,
        currentPhone: null,
        results: [],
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as Record<string, unknown>;

            if (event.type === "sending") {
              setSendProgress((prev) =>
                prev ? {
                  ...prev,
                  currentPhone: event.phone as string,
                  remaining: event.remaining as number,
                } : prev
              );
            } else if (event.type === "progress") {
              setSendProgress((prev) =>
                prev ? {
                  ...prev,
                  sent: event.sent as number,
                  failed: event.failed as number,
                  remaining: event.remaining as number,
                  currentPhone: null,
                  results: [
                    ...prev.results,
                    { phone: event.phone as string, success: event.success as boolean, error: (event.error ?? null) as string | null },
                  ],
                } : prev
              );
            } else if (event.type === "complete") {
              setSendProgress((prev) =>
                prev ? {
                  ...prev,
                  phase: "complete",
                  sent: event.sent as number,
                  failed: event.failed as number,
                  remaining: 0,
                  currentPhone: null,
                  results: event.results as SendResult[],
                } : prev
              );
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e: unknown) {
      setSendProgress(null);
      toast({
        title: t("campaign_send_fail"),
        description: (e as Error)?.message ?? t("campaign_check_wa"),
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }

  function handleProgressDone() {
    const results = sendProgress?.results ?? [];
    const sent = sendProgress?.sent ?? 0;
    const failed = sendProgress?.failed ?? 0;
    setSendResults(results);
    setSendProgress(null);
    toast({ title: t("campaign_sent_summary", { sent, failed }) });
  }

  async function handleSaveList() {
    const existing = gistData?.lists ?? [];
    const name = listName.trim();
    if (!name) return;
    const newPhones = phones.map((n) => ({ number: n, name: null }));
    const idx = existing.findIndex((l) => l.name === name);
    const newLists = idx >= 0
      ? existing.map((l, i) => (i === idx ? { ...l, phones: newPhones } : l))
      : [...existing, { name, phones: newPhones }];
    try {
      await saveMutation.mutateAsync({ data: { lists: newLists } });
      queryClient.invalidateQueries({ queryKey: getLoadPhonesFromGistQueryKey() });
      setIsSaveListOpen(false);
      setListName("");
      toast({ title: t("campaign_saved_list", { name, n: phones.length }) });
    } catch (e: unknown) {
      toast({ title: t("campaign_save_fail"), description: (e as Error)?.message, variant: "destructive" });
    }
  }

  const successCount = sendResults?.filter((r) => r.success).length ?? 0;
  const failCount    = sendResults?.filter((r) => !r.success).length ?? 0;

  return (
    <>
      {/* ─── Real-time progress overlay ─── */}
      {sendProgress && (
        <SendProgressOverlay
          progress={sendProgress}
          onDone={handleProgressDone}
        />
      )}

      <div className="space-y-6 max-w-3xl mx-auto" dir={dir}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
          className="hidden"
          onChange={handleFileInput}
        />

        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("campaign_title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("campaign_subtitle")}</p>
        </div>

        {!isConnected && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              {t("campaign_wa_not_connected")}{" "}
              <a href="/settings" className="underline font-medium">{t("campaign_wa_go_settings")}</a>
            </div>
          </div>
        )}

        {/* ─── Step 1: Phones ─── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <StepBadge n={1} />{t("campaign_step_phones")}
              </CardTitle>
              {phoneMode === "manual" && settings?.hasGithubToken && phones.length > 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => setIsSaveListOpen(true)}>
                  <CloudUpload className="h-3 w-3 mr-1" />{t("campaign_save_list")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted">
              {(["manual", "lists"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPhoneMode(mode)}
                  className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                    phoneMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode === "manual" ? <KeyboardIcon className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  {mode === "manual" ? t("campaign_manual") : t("campaign_from_lists")}
                  {mode === "lists" && hasLists && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      phoneMode === "lists"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted-foreground/15 text-muted-foreground"
                    }`}>{lists.length}</span>
                  )}
                </button>
              ))}
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
                      <Plus className="h-4 w-4" />{t("campaign_add_phone")}
                    </button>
                    <button
                      onClick={() => { setShowBulkPaste((v) => !v); setBulkText(""); }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Hash className="h-3.5 w-3.5" />{t("campaign_bulk_paste")}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("campaign_or_paste")}</p>
                </div>

                {showBulkPaste && (
                  <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">{t("campaign_paste_hint")}</p>
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
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="h-4 w-4" />{t("campaign_add_all")}
                      </button>
                      <button
                        onClick={() => { setShowBulkPaste(false); setBulkText(""); }}
                        className="px-3 py-2 rounded-lg border text-sm text-muted-foreground hover:bg-muted transition-colors"
                      >
                        {t("campaign_cancel")}
                      </button>
                      {bulkText.trim() && (
                        <span className="text-xs text-muted-foreground">
                          {parseRawNumbers(bulkText, country.dialCode).length} {t("campaign_number_label")}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {phoneList.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">{t("campaign_contacts_count", { n: phoneList.length })}</p>
                      <button onClick={() => setPhoneList([])} className="text-xs text-destructive hover:underline">{t("lists_clear_all")}</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {phoneList.map((num) => (
                        <span key={num} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-muted border text-xs font-mono" dir="ltr">
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
              /* ── Lists mode ── */
              <>
                {!settings?.hasGithubToken ? (
                  <div className="text-center py-8 space-y-2">
                    <Users className="h-9 w-9 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">{t("campaign_no_lists")}</p>
                    <a href="/settings" className="text-xs underline text-primary">{t("campaign_setup_github")}</a>
                  </div>
                ) : !hasLists ? (
                  <div className="text-center py-8 space-y-2">
                    <Users className="h-9 w-9 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">{t("lists_empty_title")}</p>
                    <button onClick={() => setPhoneMode("manual")} className="text-xs underline text-primary">
                      {t("lists_empty_subtitle")}
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
                          {isExpanded && list.phones.length > 0 && (
                            <div className="divide-y divide-border/50 max-h-56 overflow-y-auto">
                              {list.phones.map((contact) => {
                                const isChecked = selectedPhones.has(contact.number);
                                return (
                                  <label key={contact.number} className={`flex items-center gap-3 px-4 py-2 cursor-pointer select-none ${isChecked ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                                    <Checkbox checked={isChecked} onCheckedChange={() => togglePhone(contact.number)} className="shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      {contact.name && <p className="text-sm font-medium truncate">{contact.name}</p>}
                                      <p className="text-xs font-mono text-muted-foreground" dir="ltr">{contact.number}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                          {isExpanded && list.phones.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-3">{t("campaign_list_empty")}</p>
                          )}
                        </div>
                      );
                    })}
                    {selectedPhones.size > 0 && (
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-muted-foreground"><strong>{selectedPhones.size}</strong> {t("campaign_contacts_label")}</p>
                        <button onClick={() => setSelectedPhones(new Set())} className="text-xs text-destructive hover:underline">{t("campaign_deselect_all")}</button>
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
              <StepBadge n={2} />{t("campaign_step_message")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("campaign_message_placeholder")}
              rows={5}
              className="resize-none font-medium"
            />

            {/* Signature */}
            <div className="rounded-xl border bg-muted/20 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{t("campaign_signature")}</span>
                  {signature.trim() && (
                    <button
                      onClick={toggleSignature}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        signatureEnabled
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "text-muted-foreground border-muted-foreground/20"
                      }`}
                    >
                      {signatureEnabled ? t("campaign_sig_enabled") : t("campaign_sig_disabled")}
                    </button>
                  )}
                </div>
                <button onClick={startEditSignature} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Pencil className="h-3 w-3" />{t("edit")}
                </button>
              </div>

              {isEditingSignature ? (
                <div className="space-y-2">
                  <textarea
                    value={sigDraft}
                    onChange={(e) => setSigDraft(e.target.value)}
                    placeholder={t("campaign_signature_placeholder")}
                    rows={2}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none outline-none focus:border-primary transition-colors"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveSignature} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                      <Check className="h-3 w-3" />{t("campaign_save")}
                    </button>
                    <button onClick={() => setIsEditingSignature(false)} className="px-3 py-1.5 rounded-lg border text-xs text-muted-foreground hover:bg-muted transition-colors">
                      {t("campaign_cancel")}
                    </button>
                  </div>
                </div>
              ) : signature.trim() ? (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{signature}</p>
              ) : (
                <p className="text-xs text-muted-foreground/50">{t("campaign_no_signature")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Step 3: Media ─── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <StepBadge n={3} />{t("campaign_step_media")}
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
              <p className="text-sm text-muted-foreground">{t("campaign_drag_drop")}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{t("campaign_accepted_formats")}</p>
            </div>

            {mediaItems.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {mediaItems.map((item) => (
                  <div key={item.id} className="relative rounded-lg overflow-hidden border aspect-square bg-muted">
                    {item.type === "image" ? (
                      <img src={item.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={item.preview} className="w-full h-full object-cover" muted preload="metadata" />
                    )}
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute top-1 left-1">
                      {item.type === "video"
                        ? <Video className="h-3.5 w-3.5 text-white drop-shadow" />
                        : <ImageIcon className="h-3.5 w-3.5 text-white drop-shadow" />
                      }
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 hover:bg-destructive flex items-center justify-center transition-colors"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                    {item.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      </div>
                    )}
                    {item.uploadError && (
                      <div className="absolute bottom-0 inset-x-0 bg-destructive/90 p-1 text-center">
                        <p className="text-xs text-white leading-tight">{item.uploadError}</p>
                      </div>
                    )}
                    {item.waMediaId && !item.uploading && (
                      <div className="absolute bottom-1 right-1">
                        <CheckCircle2 className="h-4 w-4 text-green-400 drop-shadow" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(hasText || readyMedia.length > 0) && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {readyMedia.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {readyMedia.filter(m => m.type === "image").length > 0 && <ImageIcon className="h-3 w-3" />}
                    {readyMedia.filter(m => m.type === "video").length > 0 && <Video className="h-3 w-3" />}
                    {t("campaign_files_sent_first", { n: readyMedia.length })}
                  </span>
                )}
                {hasText && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted border">
                    {readyMedia.length > 0 ? t("campaign_text_sent_after") : t("campaign_text_sent_only")}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Send Results ─── */}
        {sendResults && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {t("campaign_results_title")}
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">{successCount} {t("campaign_succeeded")}</Badge>
                {failCount > 0 && <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">{failCount} {t("campaign_failed")}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {sendResults.map((r) => (
                  <div key={r.phone} className="flex items-center gap-2 text-xs py-1 border-b last:border-0">
                    {r.success
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    }
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
                <strong>{phones.length}</strong> {t("campaign_contacts_label")}
                {msgsPerRecipient > 1 ? ` × ${msgsPerRecipient} = ${totalMessages} ${t("campaign_total_messages")}` : ""}
              </span>
            ) : (
              <span>{t("campaign_no_phones")}</span>
            )}
          </div>
          <Button
            size="lg"
            disabled={phones.length === 0 || !hasContent || isSending || anyUploading}
            onClick={() => setIsConfirmOpen(true)}
            className="gap-2"
          >
            {isSending
              ? <><Loader2 className="h-4 w-4 animate-spin" />{t("campaign_sending")}</>
              : <><Send className="h-4 w-4" />{t("campaign_send_btn")}</>
            }
          </Button>
        </div>

        {/* ─── Confirm Dialog ─── */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("campaign_confirm_title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold">{phones.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("campaign_contacts_label")}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold">{totalMessages}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("campaign_total_messages")}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t("campaign_will_send")}</p>
                {readyMedia.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>{readyMedia.length} {t("campaign_media_first")}</span>
                  </div>
                )}
                {hasText && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-[10px]">
                      {readyMedia.length > 0 ? "2" : "1"}
                    </span>
                    <span>{readyMedia.length > 0 ? t("campaign_text_after") : t("campaign_text_only")}</span>
                  </div>
                )}
                {hasText && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 mt-1 border-t pt-2">{fullMessage}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>{t("campaign_cancel")}</Button>
              <Button onClick={() => void handleSend()}>
                <Send className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />{t("campaign_send_now")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Save List Dialog ─── */}
        <Dialog open={isSaveListOpen} onOpenChange={setIsSaveListOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("campaign_save_list_title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">{t("campaign_list_name")}</label>
                <Input
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleSaveList(); }}
                  placeholder={t("campaign_list_name_placeholder")}
                  className="mt-1.5"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">{t("campaign_will_save", { n: phones.length })}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSaveListOpen(false)}>{t("campaign_cancel")}</Button>
              <Button onClick={() => void handleSaveList()} disabled={!listName.trim() || saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"} animate-spin`} /> : null}
                {t("campaign_save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
