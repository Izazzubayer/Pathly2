import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navigation() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            Pathly
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/trips">
              <Button variant="ghost" size="sm">
                My Trips
              </Button>
            </Link>
            <Link href="/trips/new">
              <Button size="sm">New Trip</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

