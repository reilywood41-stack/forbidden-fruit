import { useState, useCallback } from "react";

type UploadState = "idle" | "uploading" | "done" | "error";

interface UseFileUploadReturn {
  upload: (file: File) => Promise<string | null>;
  isUploading: boolean;
  progress: number;
  state: UploadState;
  error: string | null;
  reset: () => void;
}

const MAX_SIZE_MB = 10;

export function useFileUpload(): UseFileUploadReturn {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setState("uploading");
    setProgress(10);
    setError(null);

    try {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          setProgress(70);
          resolve(reader.result as string);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      setProgress(100);
      setState("done");
      return dataUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setState("error");
      return null;
    }
  }, []);

  return {
    upload,
    isUploading: state === "uploading",
    progress,
    state,
    error,
    reset,
  };
}
