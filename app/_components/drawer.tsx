"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Ancho en desktop. Default: 60% (max 920px). */
  widthClassName?: string;
  /** Si querés un padding interno del drawer. */
  bodyClassName?: string;
};

export default function Drawer({
  open,
  onClose,
  children,
  widthClassName = "w-full md:w-[80%] lg:w-[60%] max-w-[920px]",
}: DrawerProps) {
  // Cerrar con ESC + bloquear scroll del body
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-turquesa-deep/40 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className={`fixed top-0 right-0 h-screen ${widthClassName} bg-crema z-[101] flex flex-col shadow-[-20px_0_60px_rgba(14,95,95,0.18)] overflow-hidden`}
          >
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Botón de cerrar reutilizable, suele ir en el header del drawer. */
export function DrawerCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="w-10 h-10 rounded-xl bg-crema text-turquesa-dark flex items-center justify-center hover:bg-turquesa-mist transition"
      aria-label="Cerrar"
    >
      <X className="w-5 h-5" strokeWidth={1.5} />
    </button>
  );
}
