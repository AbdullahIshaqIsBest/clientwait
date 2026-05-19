import { motion } from "motion/react";
import { Link } from "react-router-dom";

export const Navbar = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center group">
          <span className="text-slate-900 font-black text-xs tracking-[0.4em] uppercase italic group-hover:text-blue-600 transition-colors">
            Divine Minds Mystic Healing
          </span>
        </Link>
      </div>
    </header>
  );
};
