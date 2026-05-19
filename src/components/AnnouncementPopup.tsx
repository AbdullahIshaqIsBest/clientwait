import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export const AnnouncementPopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-3xl"
        >
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-6 right-6 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors z-10"
          >
            <X size={20} />
          </button>
          
          <div className="p-16 text-center">
            <h3 className="text-2xl font-black text-slate-900 tracking-[0.3em] uppercase italic leading-none">
              Coming Soon
            </h3>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
