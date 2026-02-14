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
  sm: { width: 32, height: 32, textSize: "text-base" },
  md: { width: 40, height: 40, textSize: "text-xl" },
  lg: { width: 64, height: 64, textSize: "text-2xl" },
  xl: { width: 96, height: 96, textSize: "text-3xl" },
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
