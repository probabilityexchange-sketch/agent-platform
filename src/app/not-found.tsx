import Link from "next/link";
import { RandiLogo } from "@/components/branding/RandiLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background/50">
      <div className="text-center px-4">
        <div className="mb-8 flex justify-center">
          <RandiLogo size="lg" variant="icon-only" />
        </div>
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4 text-primary">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Oops! The page you&apos;re looking for doesn&apos;t exist. It might
          have been moved or deleted.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-primary hover:bg-accent text-primary-foreground rounded-lg font-medium transition-colors"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
