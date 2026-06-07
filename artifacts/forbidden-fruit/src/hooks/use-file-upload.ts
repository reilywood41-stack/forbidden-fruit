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
    setProgress(0);
    setError(null);

    try {
      const apiBase = (import.meta.env.VITE_API_URL as string) || "";

      const requestRes = await fetch(`${apiBase}/api/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!requestRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL, objectPath } = await requestRes.json() as {
        uploadURL: string;
        objectPath: string;
      };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      setProgress(100);
      setState("done");
      return objectPath;
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
