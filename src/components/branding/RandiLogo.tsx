import Image from "next/image";
import Link from "next/link";

interface RandiLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "with-text" | "icon-only";
  href?: string;
  animated?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { width: 62, height: 62, textSize: "text-xl" },
  md: { width: 80, height: 80, textSize: "text-2xl" },
  lg: { width: 120, height: 120, textSize: "text-3xl" },
  xl: { width: 164, height: 164, textSize: "text-5xl" },
};

export function RandiLogo({
  size = "md",
  variant = "default",
  href,
  animated = false,
  className = "",
}: RandiLogoProps) {
  const { width, height, textSize } = sizeMap[size];
  const showText = variant === "default" || variant === "with-text";

  const logoContent = (
    <div
      className={`flex items-center gap-3 group ${animated ? "transition-transform duration-200 hover:scale-105" : ""} ${className}`}
    >
      <div
        className="relative transition-all duration-200"
        style={{ width, height }}
      >
        <Image
          src="/randi.png"
          alt="Randi"
          fill
          className="object-contain"
          priority={size === "lg" || size === "xl"}
        />
      </div>
      {showText && (
        <span
          className={`font-bold text-foreground tracking-tight transition-colors duration-200 group-hover:text-primary ${textSize}`}
        >
          Randi
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
