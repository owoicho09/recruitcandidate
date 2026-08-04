"use client";

import * as React from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface FileUploadProps {
  accept?: string;
  maxSizeMb?: number;
  hint?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

export function FileUpload({ accept, maxSizeMb = 10, hint, file, onChange, error }: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    const next = files?.[0];
    if (!next) return;
    if (next.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`File must be under ${maxSizeMb}MB`);
      return;
    }
    setLocalError(null);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragActive ? "border-accent bg-accent-soft" : "border-border-strong hover:border-accent/50",
          )}
        >
          <UploadCloud className="size-6 text-foreground-muted" />
          <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
          {hint && <p className="text-xs text-foreground-muted">{hint}</p>}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border-strong bg-surface-muted px-4 py-3">
          <FileText className="size-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-foreground-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md p-1 text-foreground-muted hover:bg-surface hover:text-danger"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {(error || localError) && <p className="text-xs text-danger">{error || localError}</p>}
    </div>
  );
}
