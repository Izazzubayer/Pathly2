import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Map, Route, Calendar } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section - Apple Style */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-6 pt-20 pb-32 md:pt-32 md:pb-48">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Product Name */}
            <div className="space-y-4">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight">
                Pathly
              </h1>
              <p className="text-2xl md:text-3xl text-muted-foreground font-normal">
                Travel planning, reimagined.
              </p>
            </div>

            {/* Hero Description */}
            <p className="text-xl md:text-2xl text-foreground/80 leading-relaxed max-w-3xl mx-auto font-light">
              Transform scattered inspiration into route-optimized itineraries.
              <br />
              AI-powered. Human-approved. Effortlessly calm.
            </p>

            {/* CTA */}
            <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/trips/new">
                <Button size="lg" className="text-base px-8 py-6 rounded-full">
                  Get started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/trips">
                <Button size="lg" variant="outline" className="text-base px-8 py-6 rounded-full">
                  View my trips
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Gradient Background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background to-accent/20" />
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32 bg-accent/40">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
                Planning made simple
              </h2>
              <p className="text-xl text-accent-foreground/70 font-light max-w-2xl mx-auto">
                Everything you need to turn inspiration into action.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {/* Feature 1 */}
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">AI extraction</h3>
                <p className="text-lg text-accent-foreground/80 leading-relaxed font-light">
                  Paste Instagram reels, YouTube videos, or notes. AI extracts places instantly.
                  You confirm, edit, or remove. Always in control.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center">
                  <Route className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Route-aware planning</h3>
                <p className="text-lg text-accent-foreground/80 leading-relaxed font-light">
                  Discover places along your route, not just nearby. See detour costs.
                  Optimize movement, not just lists.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center">
                  <Map className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Hotel as anchor</h3>
                <p className="text-lg text-accent-foreground/80 leading-relaxed font-light">
                  All routes start from where you stay. Plan naturally around your base.
                  No more backtracking.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-background flex items-center justify-center">
                  <Calendar className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Smart organization</h3>
                <p className="text-lg text-accent-foreground/80 leading-relaxed font-light">
                  Auto-group places into days. Drag to reorder. Re-optimize on the go.
                  Your itinerary, your way.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
                Inspiration first.<br />Organization second.
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-light max-w-3xl mx-auto">
                People don't plan trips top-down. They collect inspiration messily,
                then organize later. Pathly respects that behavior.
              </p>
            </div>

            {/* Principles */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-8">
              {[
                "Inspiration first",
                "Hotel as anchor",
                "AI suggests, humans decide",
                "Paths > proximity",
                "Calm over completeness",
                "Editability over magic",
              ].map((principle) => (
                <div
                  key={principle}
                  className="p-6 rounded-2xl bg-accent/40 hover:bg-accent/60 transition-colors"
                >
                  <p className="text-sm md:text-base font-medium">{principle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 bg-accent/40">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
              Start planning your next trip
            </h2>
            <p className="text-xl text-accent-foreground/70 font-light">
              Free to use. No credit card required.
            </p>
            <div className="pt-4">
              <Link href="/trips/new">
                <Button size="lg" className="text-base px-8 py-6 rounded-full">
                  Create your first trip
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 Pathly. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/trips" className="hover:text-foreground transition-colors">
                My Trips
              </Link>
              <Link href="/trips/new" className="hover:text-foreground transition-colors">
                New Trip
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

