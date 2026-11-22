"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Image, Video, X, CaretDown, CaretUp } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { BrandLoader } from "@/components/ui/brand-loader";
import { PhotoBackdrop } from "@/components/ui/photo-backdrop";

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
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
  onScanComplete: (scanId: string) => void;
}

export function ScanUploader({ onScanComplete }: ScanUploaderProps) {
  const t = useTranslations("Scan");
  const router = useRouter();
  const [subject, setSubject] = useState<"hive" | "crop">("crop");
  const [subjectType, setSubjectType] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [note, setNote] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList) => {
    const validFiles: MediaFile[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        if (file.size > 10 * 1024 * 1024) {
          setError(t("fileTooLarge", { name: file.name }));
          continue;
        }
        validFiles.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          type: "image",
        });
      } else if (file.type.startsWith("video/")) {
        if (file.size > 50 * 1024 * 1024) {
          setError(t("fileTooLarge", { name: file.name }));
          continue;
        }
        validFiles.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          type: "video",
        });
      } else {
        setError(t("invalidFileType", { name: file.name }));
      }
    }
    if (validFiles.length > 0) {
      setMediaFiles((prev) => [...prev, ...validFiles].slice(0, 5));
      setError(null);
    }
  }, [t]);

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

  const removeFile = useCallback((id: string) => {
    setMediaFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleAnalyze = async () => {
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
      // Upload files to S3 via presigned URLs
      const uploadPromises = mediaFiles.map(async (media) => {
        const res = await fetch("/api/scan/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: media.file.type }),
        });
        const { uploadUrl, key } = await res.json();
        await fetch(uploadUrl, { method: "PUT", body: media.file, headers: { "Content-Type": media.file.type } });
        return key;
      });
      const imageKeys = await Promise.all(uploadPromises);

      // Create scan
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          subject_type: subjectType,
          image_keys: imageKeys,
          note: note || undefined,
          client_id: crypto.randomUUID(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || t("analysisFailed"));

      onScanComplete(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("analysisFailed"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      mediaFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, [mediaFiles]);

  const currentTypes = SUBJECT_TYPES[subject];

  return (
    <div className="space-y-6">
      {/* Subject Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">{t("whatToScan")}</label>
        <div className="flex gap-3" role="radiogroup" aria-label={t("whatToScan")}>
          <button
            type="button"
            role="radio"
            aria-checked={subject === "hive"}
            onClick={() => { setSubject("hive"); setSubjectType(""); setShowTypeSelect(true); }}
            className={`flex-1 flex items-center justify-center gap-2 min-h-14 rounded-xl border-2 transition-colors ${
              subject === "hive"
                ? "border-comb-400 bg-comb-50 dark:bg-comb-950 text-comb-700 dark:text-comb-300"
                : "border-line text-subtle hover:border-link hover:text-text"
            }`}
          >
            <Camera size={22} aria-hidden="true" />
            <span>{t("hive")}</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={subject === "crop"}
            onClick={() => { setSubject("crop"); setSubjectType(""); setShowTypeSelect(true); }}
            className={`flex-1 flex items-center justify-center gap-2 min-h-14 rounded-xl border-2 transition-colors ${
              subject === "crop"
                ? "border-forest-400 bg-forest-50 dark:bg-forest-950 text-forest-700 dark:text-forest-300"
                : "border-line text-subtle hover:border-link hover:text-text"
            }`}
          >
            <Image size={22} aria-hidden="true" />
            <span>{t("crop")}</span>
          </button>
        </div>
      </div>

      {/* Subject Type Selector */}
      {showTypeSelect && (
        <div>
          <label className="block text-sm font-medium mb-2">{t("whatKind")}</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypeSelect(!showTypeSelect)}
              className="w-full min-h-12 px-4 py-3 rounded-xl border border-line bg-raised text-left text-text flex items-center justify-between hover:border-link transition-colors"
            >
              <span>{subjectType ? currentTypes.find((t) => t.value === subjectType)?.label || subjectType : t("selectType")}</span>
              <span className="transition-transform" style={{ transform: showTypeSelect ? "rotate(180deg)" : "rotate(0deg)" }}>
                <CaretDown size={20} aria-hidden="true" />
              </span>
            </button>
            {showTypeSelect && (
              <div className="absolute z-10 w-full mt-1 rounded-xl border border-line bg-raised shadow-card overflow-hidden max-h-60 overflow-y-auto">
                {currentTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => { setSubjectType(type.value); setShowTypeSelect(false); }}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      subjectType === type.value
                        ? "bg-accent text-on-accent"
                        : "text-text hover:bg-sunken"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-colors ${
          mediaFiles.length > 0 ? "border-line" : "border-line hover:border-accent"
        }`}
      >
        {mediaFiles.length === 0 ? (
          <div className="text-center space-y-4">
            <div className="mx-auto size-16 rounded-full border border-line bg-sunken flex items-center justify-center">
              <Camera size={32} className="text-subtle" aria-hidden="true" />
            </div>
            <p className="text-text">{t("dragDropOrClick")}</p>
            <p className="text-sm text-subtle">{t("mediaHint")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              capture="environment"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="sr-only"
              id="media-upload"
            />
            <label htmlFor="media-upload" className="inline-flex min-h-12 items-center gap-2 rounded-pill bg-accent px-5 py-2 text-sm font-semibold text-on-accent hover:bg-accent-press cursor-pointer">
              <Camera size={18} aria-hidden="true" />
              {t("chooseFiles")}
            </label>
          </div>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {mediaFiles.map((media) => (
                <div key={media.id} className="relative flex-shrink-0 size-24 rounded-xl overflow-hidden border border-line">
                  {media.type === "image" ? (
                    <img src={media.preview} alt="" className="size-full object-cover" />
                  ) : (
                    <video src={media.preview} muted className="size-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(media.id)}
                    className="absolute top-1 right-1 size-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    aria-label={t("remove")}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-xs rounded bg-black/60 text-white capitalize">
                    {media.type}
                  </span>
                </div>
              ))}
              {mediaFiles.length < 5 && (
                <label
                  htmlFor="media-upload"
                  className="flex-shrink-0 size-24 rounded-xl border-2 border-dashed border-line flex items-center justify-center hover:border-accent cursor-pointer transition-colors"
                >
                  <Camera size={28} className="text-subtle" aria-hidden="true" />
                </label>
              )}
            </div>
            <p className="text-sm text-subtle mt-2">{mediaFiles.length}/5 {t("filesSelected")}</p>
          </>
        )}
      </div>

      {/* Note Input */}
      <div>
        <label htmlFor="note" className="block text-sm font-medium mb-2">{t("addNote")}</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("notePlaceholder")}
          rows={3}
          className="w-full min-h-[100px] px-4 py-3 rounded-xl border border-line bg-raised text-text placeholder:text-muted focus:border-link focus:outline-none resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-300 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Analyze Button */}
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isAnalyzing || mediaFiles.length === 0 || !subjectType}
        className="w-full min-h-14 rounded-xl bg-accent text-on-accent font-semibold text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-press"
      >
        {isAnalyzing ? (
          <>
            <BrandLoader size={24} />
            <span>{t("analyzing")}</span>
          </>
        ) : (
          <>
            <Camera size={22} aria-hidden="true" />
            <span>{t("analyze")}</span>
          </>
        )}
      </button>

      {/* Disclaimer */}
      <p className="text-xs text-muted text-center max-w-xl mx-auto">
        {t("disclaimer")}
      </p>
    </div>
  );
}