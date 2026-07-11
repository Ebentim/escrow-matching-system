import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            🌾 Connecting Farmers Directly with Buyers
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Fresh Produce,{" "}
            <span className="text-primary">Fair Prices,</span>{" "}
            Verified Delivery
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            FarmConnect eliminates middlemen by matching smallholder farmers with
            buyers. Pay securely with escrow protection and verify delivery with
            OTP or QR code.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button size="lg" className="min-w-[200px] text-base">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="min-w-[200px] text-base"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border/40 bg-muted/30 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-16 text-center text-3xl font-bold tracking-tight">
            How It Works
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "🌱",
                title: "List Products",
                description:
                  "Farmers list their fresh produce with photos, quantity, and fair pricing.",
              },
              {
                icon: "🔍",
                title: "Smart Matching",
                description:
                  "Our algorithm matches buyers with the best farmers based on proximity, price, and freshness.",
              },
              {
                icon: "🔒",
                title: "Escrow Payment",
                description:
                  "Funds are held securely in escrow until delivery is verified by both parties.",
              },
              {
                icon: "✅",
                title: "Verified Delivery",
                description:
                  "Confirm delivery with OTP or QR code. Funds release only after verification.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border/40 bg-card p-6 text-center transition-shadow hover:shadow-md"
              >
                <div className="mb-4 text-4xl">{feature.icon}</div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-16 text-center text-3xl font-bold tracking-tight">
            Built for Everyone
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: "👨‍🌾",
                role: "Farmers",
                description:
                  "List your produce, reach buyers directly, and get fair prices without middlemen.",
              },
              {
                icon: "🛒",
                role: "Buyers",
                description:
                  "Browse fresh products, find the best deals nearby, and pay with escrow protection.",
              },
              {
                icon: "🚚",
                role: "Delivery Agents",
                description:
                  "Pick up and deliver orders with real-time tracking and verified handoff.",
              },
            ].map((item) => (
              <div
                key={item.role}
                className="rounded-xl border border-border/40 bg-card p-8 text-center transition-shadow hover:shadow-md"
              >
                <div className="mb-4 text-5xl">{item.icon}</div>
                <h3 className="mb-3 text-xl font-semibold">{item.role}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
