import { useRef, useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Upload, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadButtonProps {
  onUploaded: (objectPath: string) => void;
  accept?: string;
  label?: string;
  className?: string;
  preview?: boolean;
  currentValue?: string;
}

export function FileUploadButton({
  onUploaded,
  accept = "image/*,video/*",
  label = "Upload File",
  className,
  preview = true,
  currentValue,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, progress, state, error, reset } = useFileUpload();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    if (preview && file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    }

    const dataUrl = await upload(file);
    if (dataUrl) {
      onUploaded(dataUrl);
    }

    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setFileName(null);
    reset();
    onUploaded("");
  };

  const displayPreview = previewUrl || currentValue;
  const isImage = accept.includes("image");

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={isUploading}
      />

      {displayPreview && isImage && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/30">
          <img src={displayPreview} alt="Preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1 bg-black/60 rounded-full hover:bg-red-500 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed transition-all text-sm font-medium",
          isUploading
            ? "border-primary/50 bg-primary/5 cursor-wait text-primary"
            : state === "done"
            ? "border-green-500/50 bg-green-500/10 text-green-400 hover:border-green-400"
            : state === "error"
            ? "border-red-500/50 bg-red-500/10 text-red-400 hover:border-red-400"
            : "border-white/20 bg-black/30 text-muted-foreground hover:border-primary/50 hover:text-white hover:bg-primary/5"
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading... {progress}%
          </>
        ) : state === "done" ? (
          <>
            <CheckCircle className="w-4 h-4" />
            {fileName || "Uploaded"}
          </>
        ) : state === "error" ? (
          <>
            <AlertCircle className="w-4 h-4" />
            {error || "Upload failed"} — click to retry
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            {displayPreview ? "Replace file" : label}
          </>
        )}
      </button>

      {isUploading && (
        <div className="w-full bg-white/10 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
