import React from "react";

interface StatusBadgeProps {
  status: "loading" | "ok" | "error";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (status === "loading") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
        <span className="w-2 h-2 mr-2 rounded-full bg-amber-400 animate-pulse" />
        Checking backend...
      </span>
    );
  }

  if (status === "ok") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <span className="w-2 h-2 mr-2 rounded-full bg-emerald-400" />
        Backend Online (status: ok)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
      <span className="w-2 h-2 mr-2 rounded-full bg-rose-400" />
      Backend Offline
    </span>
  );
};
