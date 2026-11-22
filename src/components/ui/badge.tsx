import { cn } from "@/lib/cn";

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "muted" | "danger" | "success" }) {
  const styles = {
    default: "bg-primary/10 text-primary",
    muted: "bg-muted text-muted-foreground",
    danger: "bg-red-100 text-red-700",
    success: "bg-green-100 text-green-700",
  }[variant];
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", styles, className)} {...props} />;
}
