import Link from "next/link";
import { CalendarDays, Download, Home, Hotel, Map, Palmtree } from "lucide-react";
import type { Trip } from "@/lib/types";

const items = [
  { href: "", label: "Dashboard", icon: Home },
  { href: "/availability", label: "Dates", icon: CalendarDays },
  { href: "/destinations", label: "Destinations", icon: Palmtree },
  { href: "/lodgings", label: "Logements", icon: Hotel },
  { href: "/itinerary", label: "Itinéraire", icon: Map },
  { href: "/exports", label: "Exports", icon: Download }
];

const statusLabels: Record<Trip["status"], string> = {
  brainstorming: "Brainstorming",
  vote_dates: "Vote dates",
  vote_destinations: "Vote destinations",
  vote_logements: "Vote logements",
  preparation_itineraire: "Préparation itinéraire",
  verrouille: "Verrouillé",
  termine: "Terminé"
};

export function TripNav({ trip }: { trip: Trip }) {
  return (
    <div className="border-b border-black/10 bg-white/70">
      <div className="shell grid gap-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Les Djeuns · édition {trip.edition_year}</p>
            <h1 className="text-3xl font-black tracking-normal text-ink sm:text-4xl">{trip.name}</h1>
            {trip.description ? <p className="mt-2 max-w-3xl text-sm font-semibold text-muted">{trip.description}</p> : null}
          </div>
          <span className="chip border-lagoon/20 bg-lagoon/10 text-lagoon">{statusLabels[trip.status]}</span>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navigation voyage">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href || "home"} href={`/trips/${trip.slug}${item.href}`} className="button-secondary whitespace-nowrap">
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
