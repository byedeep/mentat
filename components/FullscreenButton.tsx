"use client";

import { useEffect, useState, type RefObject } from "react";
import { Expand, Minimize } from "lucide-react";

type FullscreenButtonProps = {
  targetRef: RefObject<HTMLElement | null>;
  label: string;
};

export function FullscreenButton({ targetRef, label }: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(Boolean(document.fullscreenEnabled && targetRef.current?.requestFullscreen));

    function syncFullscreenState() {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    }

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, [targetRef]);

  async function toggleFullscreen() {
    const target = targetRef.current;

    if (!target) {
      return;
    }

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      await target.requestFullscreen();
    } catch {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    }
  }

  if (!isSupported) {
    return null;
  }

  const action = isFullscreen ? "Exit full screen" : "Expand";
  const Icon = isFullscreen ? Minimize : Expand;

  return (
    <button
      className="fullscreen-toggle"
      type="button"
      onClick={toggleFullscreen}
      aria-label={`${action} ${label}`}
      aria-pressed={isFullscreen}
      title={`${action} ${label}`}
    >
      <Icon size={22} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}
