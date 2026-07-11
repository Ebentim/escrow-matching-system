import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 text-center text-sm text-muted-foreground md:flex-row md:justify-between md:text-left">
        <p>© {new Date().getFullYear()} FarmConnect. Connecting farmers directly with buyers.</p>
        <nav className="flex gap-4">
          <Link href="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link href="/contact" className="transition-colors hover:text-foreground">
            Contact
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
