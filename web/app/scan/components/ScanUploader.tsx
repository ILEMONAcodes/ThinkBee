"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, UploadSimple, X } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";

import { useIdentity } from "@/components/auth/account-provider";
import { apiRequest, type ApiSchema } from "@/lib/api/client";
import { markPwaMeaningfulUse } from "@/lib/pwa/meaningful-use";
import { uploadScanPhoto } from "@/lib/scans/upload";

import { BrandLoader } from "@/components/ui/brand-loader";

interface MediaFile {
  id: string;
  file: File;
  preview: string;
}

const SUBJECT_TYPES = {
  hive: [
    { value: "langstroth", label: "Langstroth" },
    { value: "top-bar", label: "Top-bar / Kenyan" },
    { value: "warre", label: "Warré" },
    { value: "flow", label: "Flow Hive" },
    { value: "other", label: "Other / Custom" },
  ],
  crop: [
    { value: "cassava", label: "Cassava" },
    { value: "maize", label: "Maize / Corn" },
    { value: "rice", label: "Rice" },
    { value: "cocoa", label: "Cocoa" },
    { value: "tomato", label: "Tomato" },
    { value: "pepper", label: "Pepper" },
    { value: "yam", label: "Yam" },
    { value: "plantain", label: "Plantain / Banana" },
    { value: "vegetables", label: "Leafy Vegetables" },
    { value: "other", label: "Other Crop" },
  ],
} as const;

interface ScanUploaderProps {
  subject: "hive" | "crop";
  onScanComplete: (scanId: string) => void;
}

export function ScanUploader({ onScanComplete, subject }: ScanUploaderProps) {
  const t = useTranslations("Scan");
  const { owner } = useIdentity();
  const uploads = useRef(new Map<string, string>());
  const submission = useRef<{ fingerprint: string; id: string } | null>(null);
  const [subjectType, setSubjectType] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [note, setNote] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previews = useRef(new Set<string>());

  const handleFileSelect = useCallback((files: FileList) => {
    const validFiles: MediaFile[] = [];
    setError(null);
    for (const file of Array.from(files).slice(0, 5 - mediaFiles.length)) {
      if (!file.type.startsWith("image/")) {
        setError(t("invalidFileType", { name: file.name }));
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(t("fileTooLarge", { name: file.name }));
        continue;
      }
      validFiles.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) });
    }
    if (validFiles.length > 0) {
      for (const { preview } of validFiles) previews.current.add(preview);
      setMediaFiles((prev) => [...prev, ...validFiles]);
    }
  }, [mediaFiles.length, t]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const removeFile = (media: MediaFile) => {
    URL.revokeObjectURL(media.preview);
    previews.current.delete(media.preview);
    uploads.current.delete(media.id);
    setMediaFiles((previous) => previous.filter(({ id }) => id !== media.id));
  };

  const handleAnalyze = async () => {
    if (!owner || isAnalyzing) return;
    if (mediaFiles.length === 0) {
      setError(t("noMediaError"));
      return;
    }
    if (!subjectType) {
      setError(t("selectTypeError"));
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const imageKeys = await Promise.all(mediaFiles.map(async ({ id, file }) => {
        const existing = uploads.current.get(id);
        if (existing) return existing;
        const key = await uploadScanPhoto(file, owner);
        uploads.current.set(id, key);
        return key;
      }));

      const fingerprint = JSON.stringify([subject, subjectType, imageKeys, note]);
      if (submission.current?.fingerprint !== fingerprint) {
        submission.current = { fingerprint, id: crypto.randomUUID() };
      }
      const data = await apiRequest<ApiSchema["ScanResponse"]>("/scans", owner, "POST", {
        subject,
        subject_type: subjectType,
        image_keys: imageKeys,
        note: note || undefined,
        client_id: submission.current.id,
      }, { timeoutMs: 60_000 });
      if (data.status === "done") markPwaMeaningfulUse("saved_scan");
      onScanComplete(data.id);
    } catch {
      setError(t("analysisFailed"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const urls = previews.current;
    return () => { for (const url of urls) URL.revokeObjectURL(url); };
  }, []);

  const hive = subject === "hive";
  const handlePicker = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) handleFileSelect(event.target.files);
    event.target.value = "";
  };

  return (
    <div className="space-y-5">
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePicker} hidden />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePicker} hidden />
      {/* Media Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed bg-raised p-5 sm:p-7 ${hive ? "border-comb-600 dark:border-comb-400" : "border-forest-500 dark:border-forest-300"}`}
      >
        {mediaFiles.length === 0 ? (
          <div className="space-y-3 text-center">
            <div className={`comb-cell mx-auto grid size-16 place-items-center text-forest-950 ${hive ? "bg-comb-400" : "bg-forest-300"}`}>
              <Camera size={28} aria-hidden="true" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl">{t(hive ? "addHiveMedia" : "addCropMedia")}</h2>
            <p className="text-sm text-subtle">{t("mediaHint")}</p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-accent px-4 font-semibold text-on-accent hover:bg-accent-press">
                <Camera size={19} aria-hidden="true" />{t("takePhoto")}
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill border border-line px-4 font-semibold hover:bg-sunken">
                <UploadSimple size={19} aria-hidden="true" />{t("uploadMedia")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {mediaFiles.map((media) => (
                <div key={media.id} className="relative flex-shrink-0 size-24 rounded-xl overflow-hidden border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element -- This preview uses a local blob URL. */}
                  <img src={media.preview} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(media)}
                    className="absolute top-1 right-1 size-12 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    aria-label={t("remove")}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {mediaFiles.length < 5 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} aria-label={t("uploadMedia")} className="grid size-24 shrink-0 place-items-center rounded-xl border-2 border-dashed border-line hover:border-accent">
                  <UploadSimple size={26} className="text-subtle" aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="text-sm text-subtle mt-2">{mediaFiles.length}/5 {t("filesSelected")}</p>
          </>
        )}
      </div>

      <label className="block text-sm font-semibold">
        {t(hive ? "hiveType" : "cropType")}
        <select value={subjectType} onChange={(event) => setSubjectType(event.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-line bg-raised px-4 text-base font-normal">
          <option value="">{t("selectType")}</option>
          {SUBJECT_TYPES[subject].map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      {/* Note Input */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium mb-2">{t("addNote")}</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t(hive ? "notePlaceholder" : "cropNotePlaceholder")}
          rows={3}
          maxLength={4000}
          className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-line bg-raised text-text placeholder:text-muted focus:border-link focus:outline-none resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-300 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Analysis action */}
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isAnalyzing || mediaFiles.length === 0 || !subjectType}
        className="w-full min-h-14 rounded-pill bg-accent text-on-accent font-semibold text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-press"
      >
        {isAnalyzing ? (
          <>
            <BrandLoader size={24} />
            <span>{t("analyzing")}</span>
          </>
        ) : t("analyze")}
      </button>

      {mediaFiles.length === 0 ? <p className="text-center text-sm text-subtle">{t("addPhotoToStart")}</p> : null}

      {/* Disclaimer */}
      <p className="text-xs text-muted text-center max-w-xl mx-auto">
        {t("disclaimer")}
      </p>
    </div>
  );
}