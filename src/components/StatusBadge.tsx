import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "sufficient" | "insufficient" | "excess";
  className?: string;
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const statusConfig = {
    sufficient: {
      label: "Cukup",
      className: "bg-success/10 text-success border-success/20"
    },
    insufficient: {
      label: "Kurang Beban",
      className: "bg-destructive/10 text-destructive border-destructive/20"
    },
    excess: {
      label: "Lebih Beban",
      className: "bg-warning/10 text-warning border-warning/20"
    }
  };

  const config = statusConfig[status];

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;