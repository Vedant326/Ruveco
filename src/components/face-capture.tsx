"use client";

import { Camera, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Spinner } from "./ui/misc";
import { Sheet } from "./ui/sheet";

/**
 * Live face photo from the front camera. There is no file picker here on purpose:
 * the photo must be taken now, not chosen from the gallery.
 */
export function FaceCapture({ open, onClose, onUse }: { open: boolean; onClose: () => void; onUse: (photo: Blob) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "live" | "error">("starting");
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);

  const live = open && !shot;
  useEffect(() => {
    if (!live) return;
    let stream: MediaStream | undefined;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        stream = s;
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play().catch(() => {});
        }
        setStatus("live");
      })
      .catch(() => setStatus("error"));
    if (!navigator.mediaDevices) queueMicrotask(() => setStatus("error"));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      setStatus("starting");
    };
  }, [live]);

  const discard = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
  };

  const capture = () => {
    const el = video.current;
    if (!el?.videoWidth) return;
    const size = Math.min(el.videoWidth, el.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(size, 720);
    canvas
      .getContext("2d")!
      .drawImage(el, (el.videoWidth - size) / 2, (el.videoHeight - size) / 2, size, size, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => blob && setShot({ blob, url: URL.createObjectURL(blob) }), "image/jpeg", 0.85);
  };

  const close = () => {
    discard();
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Take face photo" description="Hold the phone at eye level, in good light.">
      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-4xl bg-brand-950">
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of a just-captured blob
          <img src={shot.url} alt="Your face photo" className="h-full w-full object-cover" />
        ) : (
          <>
            <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            {status === "starting" && (
              <div className="absolute inset-0 grid place-items-center">
                <Spinner className="text-white" />
              </div>
            )}
            {status === "error" && (
              <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">
                Camera is not available. Allow camera access in your browser settings and try again.
              </p>
            )}
            <div className="pointer-events-none absolute inset-6 rounded-full border-2 border-dashed border-white/50" />
          </>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        {shot ? (
          <>
            <Button variant="outline" block icon={<RotateCcw className="h-4 w-4" />} onClick={discard}>
              Retake
            </Button>
            <Button
              block
              onClick={() => {
                onUse(shot.blob);
                URL.revokeObjectURL(shot.url);
                setShot(null);
                onClose();
              }}
            >
              Use photo
            </Button>
          </>
        ) : (
          <Button block disabled={status !== "live"} icon={<Camera className="h-5 w-5" />} onClick={capture}>
            Capture
          </Button>
        )}
      </div>
    </Sheet>
  );
}
