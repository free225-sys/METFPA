import React from "react";
import { STATUS_LABELS } from "@/lib/format";

const STYLES = {
  termine: "bg-[#009E49]/10 text-[#009E49] before:bg-[#009E49]",
  en_cours: "bg-[#FF8200]/10 text-[#FF8200] before:bg-[#FF8200] before:animate-pulse",
  bloque: "bg-red-600/10 text-red-700 before:bg-red-600",
  non_demarre: "bg-gray-100 text-[#4A5568] before:bg-gray-400",
};

export function StatusBadge({ status, testid }) {
  const cls = STYLES[status] || STYLES.non_demarre;
  return (
    <span data-testid={testid}
      className={`inline-flex w-fit items-center gap-2 px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap before:content-[''] before:block before:w-1.5 before:h-1.5 before:rounded-full ${cls}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
