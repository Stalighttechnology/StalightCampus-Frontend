import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, X, Loader2, Image as ImageIcon, FileText } from "lucide-react";
import { uploadInventoryFile } from "../../../utils/inventory_api";

interface Props {
  value?: string;
  onChange?: (url: string) => void;
  file?: File | null;
  onFileChange?: (file: File | null) => void;
  label?: React.ReactNode;
  folder?: string;
  accept?: string;
  maxSizeMB?: number;
  autoUpload?: boolean;
}

export const PhotoUploader: React.FC<Props> = ({
  value,
  onChange,
  file,
  onFileChange,
  label = "Upload Image / Document",
  folder = "inventory/assets",
  accept = "image/*,application/pdf",
  maxSizeMB = 1,
  autoUpload = true,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      const objUrl = URL.createObjectURL(file);
      setLocalPreview(objUrl);
      return () => URL.revokeObjectURL(objUrl);
    } else {
      setLocalPreview(null);
    }
  }, [file]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (selected.size > maxBytes) {
      setError(`File size must be under ${maxSizeMB}MB`);
      return;
    }

    setError(null);

    if (onFileChange || !autoUpload) {
      onFileChange?.(selected);
      if (onChange && !autoUpload) {
        onChange("");
      }
      return;
    }

    try {
      setUploading(true);
      const url = await uploadInventoryFile(selected, folder);
      onChange?.(url);
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = "";
    setLocalPreview(null);
    onFileChange?.(null);
    onChange?.("");
    setError(null);
  };

  const displayUrl = localPreview || value;
  const isPdf =
    file?.type === "application/pdf" ||
    file?.name?.toLowerCase().endsWith(".pdf") ||
    value?.toLowerCase().endsWith(".pdf") ||
    value?.includes(".pdf");

  const displayName = file?.name || value?.split("/").pop() || "Document";
  const displaySize = file ? `(${(file.size / 1024).toFixed(0)} KB)` : "";

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          {label}
        </label>
      )}

      {displayUrl ? (
        <div className="relative group border rounded-xl overflow-hidden bg-muted/30 p-2 flex items-center gap-3">
          {isPdf ? (
            <div className="w-14 h-14 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
              <FileText className="w-7 h-7" />
            </div>
          ) : (
            <img
              src={displayUrl}
              alt="Preview"
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border"
            />
          )}
          <div className="flex-1 min-w-0 pr-8">
            <p className="text-xs font-medium text-foreground truncate">
              {displayName} {displaySize && <span className="text-muted-foreground text-[11px]">{displaySize}</span>}
            </p>
            {value ? (
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline font-medium inline-block mt-0.5"
              >
                View Document ↗
              </a>
            ) : (
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                Ready to upload on ticket submission
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground transition-colors shadow-sm"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
            uploading
              ? "border-primary/50 bg-primary/5 cursor-wait"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-xs font-medium text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-foreground">Click or drag & drop to upload</p>
              <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP, or PDF up to {maxSizeMB}MB</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-1 font-medium">{error}</p>}
    </div>
  );
};
