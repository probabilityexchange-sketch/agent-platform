import { RandiLogo } from "./RandiLogo";

interface LoadingLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  message?: string;
}

export function LoadingLogo({ size = "md", message }: LoadingLogoProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="logo-loading">
        <RandiLogo size={size} variant="icon-only" />
      </div>
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
