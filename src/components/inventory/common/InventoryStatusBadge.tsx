import React from "react";
import { CheckCircle2, AlertTriangle, Wrench, Trash2, ArrowRightLeft, Package } from "lucide-react";

interface Props {
  status: string;
  size?: "sm" | "md";
}

export const InventoryStatusBadge: React.FC<Props> = ({ status, size = "sm" }) => {
  const normStatus = status?.toLowerCase() || "available";

  const config: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
    "in-use": {
      label: "In Use",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: CheckCircle2,
    },
    available: {
      label: "Available",
      bg: "bg-blue-50 dark:bg-blue-950/40",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800",
      icon: Package,
    },
    "in-repair": {
      label: "In Repair",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800",
      icon: Wrench,
    },
    scrapped: {
      label: "Scrapped",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200 dark:border-rose-800",
      icon: Trash2,
    },
    discarded: {
      label: "Discarded",
      bg: "bg-gray-50 dark:bg-gray-800/60",
      text: "text-gray-700 dark:text-gray-300",
      border: "border-gray-200 dark:border-gray-700",
      icon: Trash2,
    },
    transferred: {
      label: "Transferred",
      bg: "bg-purple-50 dark:bg-purple-950/40",
      text: "text-purple-700 dark:text-purple-300",
      border: "border-purple-200 dark:border-purple-800",
      icon: ArrowRightLeft,
    },
  };

  const item = config[normStatus] || {
    label: status,
    bg: "bg-gray-50 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
    icon: Package,
  };

  const Icon = item.icon;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${item.bg} ${item.text} ${item.border} ${sizeClasses}`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {item.label}
    </span>
  );
};
