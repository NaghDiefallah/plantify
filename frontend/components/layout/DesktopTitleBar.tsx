"use client";

import type {CSSProperties} from "react";
import {useEffect, useState} from "react";
import {Minus, Square, SquareStack, X} from "lucide-react";

import {Button} from "@/components/ui/button";
import {isDesktopShell} from "@/lib/platform";
import {cn} from "@/lib/utils";

type DesktopTitleBarProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  onMinimize?: () => void;
  onToggleMaximize?: () => void;
  onClose?: () => void;
};

const dragRegionStyle = {
  WebkitAppRegion: "drag"
} as CSSProperties;

const noDragStyle = {
  WebkitAppRegion: "no-drag"
} as CSSProperties;

export function DesktopTitleBar({
  className,
  title = "Plantify",
  subtitle = "Desktop Shell",
  onMinimize,
  onToggleMaximize,
  onClose
}: DesktopTitleBarProps) {
  const [desktopShell, setDesktopShell] = useState(false);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    setDesktopShell(isDesktopShell());
  }, []);

  useEffect(() => {
    if (!desktopShell) {
      return;
    }

    let mounted = true;
    void (async () => {
      try {
        const {getCurrentWindow} = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        const isWindowMaximized = await appWindow.isMaximized();
        if (mounted) {
          setMaximized(isWindowMaximized);
        }
      } catch {
        if (mounted) {
          setMaximized(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [desktopShell]);

  const handleMinimize = async () => {
    if (onMinimize) {
      onMinimize();
      return;
    }

    try {
      const {getCurrentWindow} = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch {
      // Ignore when running in web mode.
    }
  };

  const handleToggleMaximize = async () => {
    if (onToggleMaximize) {
      onToggleMaximize();
      return;
    }

    try {
      const {getCurrentWindow} = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
      const isWindowMaximized = await appWindow.isMaximized();
      setMaximized(isWindowMaximized);
    } catch {
      // Ignore when running in web mode.
    }
  };

  const handleClose = async () => {
    if (onClose) {
      onClose();
      return;
    }

    try {
      const {getCurrentWindow} = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      // Ignore when running in web mode.
    }
  };

  if (!desktopShell) {
    return null;
  }

  return (
    <header
      data-tauri-drag-region
      style={dragRegionStyle}
      className={cn(
        "sticky top-0 z-50 flex h-12 items-center justify-between border-b border-white/10 bg-zinc-950/88 px-3 backdrop-blur-xl",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/90 shadow-[0_0_12px_rgba(74,222,128,0.45)]" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-[0.14em] text-zinc-100 uppercase">{title}</span>
          <span className="text-[11px] text-zinc-400">{subtitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5" style={noDragStyle}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Minimize window"
          className="h-8 w-8 rounded-md text-zinc-300 hover:bg-white/8 hover:text-white"
          onClick={() => void handleMinimize()}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Toggle window size"
          className="h-8 w-8 rounded-md text-zinc-300 hover:bg-white/8 hover:text-white"
          onClick={() => void handleToggleMaximize()}
        >
          {maximized ? <SquareStack className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close window"
          className="h-8 w-8 rounded-md text-zinc-300 hover:bg-rose-500/18 hover:text-rose-100"
          onClick={() => void handleClose()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}