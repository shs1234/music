import { XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MD, useMediaQuery } from "../hooks/useMediaQuery";
import { usePullDownToDrag } from "../hooks/usePullDownToDrag";
import { useT } from "../i18n";
import { IconButton } from "./IconButton";
import { PresenceLayer } from "./PresenceLayer";

/**
 * Layering (z-index) used across the app:
 * 10 sticky headers · 20 app chrome · 30 floating video · 40 sheet/drawer · 50 modal/menu · 60 toasts
 */
interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  const isMd = useMediaQuery(MD);
  const reduce = useReducedMotion();
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const drag = useDragControls();
  // On phones the whole sheet can be pulled down to close, not only its title bar.
  const body = useRef<HTMLDivElement>(null);
  usePullDownToDrag(body, drag, open && !isMd);
  const from = reduce ? { opacity: 0 } : isMd ? { opacity: 0, scale: 0.96, y: 8 } : { y: "100%" };

  return createPortal(
    <AnimatePresence>
      {open && (
        <PresenceLayer className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <motion.div
            className="absolute inset-0 touch-none bg-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            data-escape-closes
            initial={from}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={from}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            drag={isMd ? false : "y"}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
            className="island safe-bottom relative w-full rounded-b-none md:mx-4 md:max-w-md md:rounded-[20px]"
          >
            <div ref={body} className="island-core p-4 md:p-5">
              <div className="mb-3 flex touch-none items-center justify-between gap-3" onPointerDown={(e) => !isMd && drag.start(e)}>
                <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                <IconButton label={t.common.close} size="sm" onClick={onClose}>
                  <XIcon size={18} />
                </IconButton>
              </div>
              {children}
            </div>
          </motion.div>
        </PresenceLayer>
      )}
    </AnimatePresence>,
    document.body,
  );
}
