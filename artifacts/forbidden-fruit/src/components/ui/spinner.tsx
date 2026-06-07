import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  xs: { outer: "w-4 h-4", border: "border-[1.5px]", dot: "w-1 h-1" },
  sm: { outer: "w-6 h-6", border: "border-2", dot: "w-1.5 h-1.5" },
  md: { outer: "w-9 h-9", border: "border-2", dot: "w-2 h-2" },
  lg: { outer: "w-14 h-14", border: "border-[3px]", dot: "w-2.5 h-2.5" },
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  const s = sizeMap[size];
  return (
    <span className={cn("relative inline-flex items-center justify-center", s.outer, className)}>
      <span className={cn("absolute inset-0 rounded-full border-primary/15", s.border)} />
      <span className={cn("absolute inset-0 rounded-full border-transparent border-t-primary animate-spin", s.border)} />
      <span className={cn("rounded-full bg-primary/80 animate-pulse", s.dot)} />
    </span>
  );
}

export function PageSpinner() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[40vh]">
      <span className="relative inline-flex items-center justify-center w-12 h-12">
        <span className="absolute inset-0 rounded-full border-[3px] border-primary/10" />
        <span className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-spin" />
        <span className="absolute inset-1 rounded-full border-[2px] border-transparent border-b-primary/40 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      </span>
      <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-primary/60 animate-pulse">
        Loading
      </span>
    </div>
  );
}
