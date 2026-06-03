import Link from "next/link";
import { ArrowRight, CalendarCheck, Hotel, MapPinned, Palmtree } from "lucide-react";
import { AppHeader } from "@/components/app-header";

const pillars = [
  { title: "Dates communes", icon: CalendarCheck, text: "Scores par jour, meilleures semaines et week-ends directement visibles." },
  { title: "Décisions", icon: Palmtree, text: "Destinations et logements comparés avec un vote simple de 1 à 5." },
  { title: "Road trip", icon: MapPinned, text: "Points illimités, segments, filtres et exports Google Maps." },
  { title: "Logements", icon: Hotel, text: "Prix, couchages, avantages, contraintes et vote du groupe." }
];

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <main className="shell grid gap-8 py-8">
        <section className="grid min-h-[68vh] content-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="eyebrow">Les Djeuns</p>
            <h1 className="mt-3 max-w-4xl text-5xl font-black leading-[0.98] tracking-normal text-ink sm:text-7xl">
              Organiser les vacances sans perdre le groupe en route.
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-muted">
              Une V1 pensée pour décider: disponibilités, destinations, logements, itinéraire et exports vers Google Maps.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/trips/new" className="button-primary">
                Créer un voyage
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/db-test" className="button-secondary">
                Tester Neon
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.title} className="panel flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-lagoon/10 text-lagoon">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-black text-ink">{pillar.title}</h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-muted">{pillar.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
