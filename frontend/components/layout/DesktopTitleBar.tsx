"use client";

import type {MouseEvent} from "react";
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

  const withCurrentWindow = async <T,>(
    action: (windowHandle: ReturnType<(typeof import("@tauri-apps/api/window"))["getCurrentWindow"]>) => Promise<T>
  ) => {
    const {getCurrentWindow} = await import("@tauri-apps/api/window");
    return action(getCurrentWindow());
  };

  const syncMaximizedState = async () => {
    try {
      const isWindowMaximized = await withCurrentWindow((windowHandle) => windowHandle.isMaximized());
      setMaximized(isWindowMaximized);
    } catch {
      setMaximized(false);
    }
  };

  useEffect(() => {
    setDesktopShell(isDesktopShell());
  }, []);

  useEffect(() => {
    if (!desktopShell) {
      return;
    }

    let mounted = true;
    let cleanup = () => {};
    void (async () => {
      try {
        const {getCurrentWindow} = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();
        const updateState = async () => {
          const isWindowMaximized = await appWindow.isMaximized();
          if (mounted) {
            setMaximized(isWindowMaximized);
          }
        };

        await updateState();

        const unlistenResize = await appWindow.onResized(() => {
          void updateState();
        });

        const unlistenMove = await appWindow.onMoved(() => {
          void updateState();
        });

        cleanup = () => {
          unlistenResize();
          unlistenMove();
        };
      } catch {
        if (mounted) {
          setMaximized(false);
        }
      }
    })();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [desktopShell]);

  const handleMinimize = async () => {
    if (onMinimize) {
      onMinimize();
      return;
    }

    try {
      await withCurrentWindow((windowHandle) => windowHandle.minimize());
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
      await withCurrentWindow((windowHandle) => windowHandle.toggleMaximize());
      await syncMaximizedState();
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
      await withCurrentWindow((windowHandle) => windowHandle.close());
    } catch {
      // Ignore when running in web mode.
    }
  };

  const handleDragStart = async (event: MouseEvent<HTMLDivElement>) => {
    if (!desktopShell || event.button !== 0) {
      return;
    }

    try {
      await withCurrentWindow((windowHandle) => windowHandle.startDragging());
    } catch {
      // Ignore when running in web mode.
    }
  };

  if (!desktopShell) {
    return null;
  }

  return (
    <header
      className={cn(
        "flex h-12 items-center justify-between rounded-[1.25rem] border border-white/10 bg-zinc-950/92 px-3 backdrop-blur-xl",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 pr-3" onMouseDown={(event) => void handleDragStart(event)} onDoubleClick={() => void handleToggleMaximize()}>
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/90 shadow-[0_0_12px_rgba(74,222,128,0.45)]" />
        <div className="min-w-0 flex flex-col select-none">
          <span className="truncate text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100">{title}</span>
          <span className="truncate text-[11px] text-zinc-400">{subtitle}</span>
        </div>
        <div className="flex-1" />
      </div>

      <div className="flex items-center gap-1.5" data-tauri-disable-drag-region>
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