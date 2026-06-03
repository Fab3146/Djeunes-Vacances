import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Hotel, MapPinned, Palmtree, Users } from "lucide-react";
import { addParticipantAction, updateTripStatusAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { ScorePill } from "@/components/score-pill";
import { TripNav } from "@/components/trip-nav";
import { getDashboardData } from "@/lib/queries/trips";

const statuses = [
  ["brainstorming", "Brainstorming"],
  ["vote_dates", "Vote dates"],
  ["vote_destinations", "Vote destinations"],
  ["vote_logements", "Vote logements"],
  ["preparation_itineraire", "Préparation itinéraire"],
  ["verrouille", "Verrouillé"],
  ["termine", "Terminé"]
] as const;

export default async function TripDashboardPage({ params }: { params: { slug: string } }) {
  const data = await getDashboardData(params.slug);
  if (!data) notFound();

  const progress = [
    { label: "Participants", done: data.participants.length >= 2 },
    { label: "Dates", done: data.topWeeks.length > 0 && data.topWeeks[0].averageScore > 0 },
    { label: "Destinations", done: data.topDestinations.length > 0 },
    { label: "Logements", done: data.topLodgings.length > 0 },
    { label: "Itinéraire", done: data.pointCount > 0 }
  ];
  const doneCount = progress.filter((item) => item.done).length;

  return (
    <>
      <TripNav trip={data.trip} />
      <main className="shell grid gap-5 py-6">
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Décision</p>
                <h2 className="section-title mt-1">Tableau de bord</h2>
              </div>
              <span className="chip bg-lagoon/10 text-lagoon">{doneCount}/5 blocs lancés</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {progress.map((item) => (
                <div key={item.label} className="soft-panel">
                  <CheckCircle2 className={`mb-2 size-5 ${item.done ? "text-lagoon" : "text-muted/40"}`} aria-hidden="true" />
                  <p className="text-sm font-black text-ink">{item.label}</p>
                  <p className="mt-1 text-xs font-bold text-muted">{item.done ? "En cours" : "À initier"}</p>
                </div>
              ))}
            </div>
          </div>

          <form action={updateTripStatusAction} className="panel grid gap-3">
            <input type="hidden" name="tripId" value={data.trip.id} />
            <input type="hidden" name="slug" value={data.trip.slug} />
            <label className="field">
              Statut du voyage
              <select className="input" name="status" defaultValue={data.trip.status}>
                {statuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-primary" type="submit">
              Mettre à jour
            </button>
          </form>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="panel">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black text-ink">Meilleures semaines</h2>
              <CalendarDays className="size-5 text-coral" aria-hidden="true" />
            </div>
            <div className="mt-3 grid gap-2">
              {data.topWeeks.length ? (
                data.topWeeks.map((window) => (
                  <div key={`${window.start}-${window.end}`} className="soft-panel">
                    <p className="font-black text-ink">{window.label}</p>
                    <p className="text-sm font-semibold text-muted">{Math.round(window.averageScore * 100)}% de compatibilité moyenne</p>
                  </div>
                ))
              ) : (
                <EmptyState icon={CalendarDays} title="Pas encore de créneau">
                  Ajoute les participants puis leurs disponibilités.
                </EmptyState>
              )}
            </div>
            <Link href={`/trips/${data.trip.slug}/availability`} className="button-secondary mt-3 w-full">
              Travailler les dates <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>

          <article className="panel">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black text-ink">Top destinations</h2>
              <Palmtree className="size-5 text-coral" aria-hidden="true" />
            </div>
            <div className="mt-3 grid gap-2">
              {data.topDestinations.length ? (
                data.topDestinations.map((destination) => (
                  <div key={destination.id} className="soft-panel">
                    <p className="font-black text-ink">{destination.name}</p>
                    <p className="text-sm font-semibold text-muted">{[destination.country, destination.region].filter(Boolean).join(" · ")}</p>
                    <div className="mt-2">
                      <ScorePill score={destination.average_score} votes={destination.vote_count} />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={Palmtree} title="Aucune destination">
                  Propose quelques options pour lancer le vote.
                </EmptyState>
              )}
            </div>
            <Link href={`/trips/${data.trip.slug}/destinations`} className="button-secondary mt-3 w-full">
              Comparer les destinations <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>

          <article className="panel">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black text-ink">Top logements</h2>
              <Hotel className="size-5 text-coral" aria-hidden="true" />
            </div>
            <div className="mt-3 grid gap-2">
              {data.topLodgings.length ? (
                data.topLodgings.map((lodging) => (
                  <div key={lodging.id} className="soft-panel">
                    <p className="font-black text-ink">{lodging.title}</p>
                    <p className="text-sm font-semibold text-muted">
                      {lodging.price_per_person ? `${lodging.price_per_person} €/pers.` : lodging.destination_name ?? "Logement"}
                    </p>
                    <div className="mt-2">
                      <ScorePill score={lodging.average_score} votes={lodging.vote_count} />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={Hotel} title="Aucun logement">
                  Ajoute les options sérieuses dès que la destination se précise.
                </EmptyState>
              )}
            </div>
            <Link href={`/trips/${data.trip.slug}/lodgings`} className="button-secondary mt-3 w-full">
              Comparer les logements <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="panel">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black text-ink">Participants</h2>
              <Users className="size-5 text-coral" aria-hidden="true" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.participants.length ? (
                data.participants.map((participant) => (
                  <span key={participant.id} className="chip" style={{ borderColor: participant.color }}>
                    {participant.avatar_emoji ?? "•"} {participant.display_name}
                  </span>
                ))
              ) : (
                <p className="text-sm font-semibold text-muted">Ajoute les potes pour commencer les votes et les dispos.</p>
              )}
            </div>
          </article>

          <form action={addParticipantAction} className="panel grid gap-3">
            <input type="hidden" name="tripId" value={data.trip.id} />
            <input type="hidden" name="slug" value={data.trip.slug} />
            <h2 className="font-black text-ink">Ajouter un participant</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="field">
                Prénom
                <input className="input" name="displayName" placeholder="Flavien" required />
              </label>
              <label className="field">
                Couleur
                <input className="input" name="color" type="color" defaultValue="#126b64" />
              </label>
              <label className="field">
                Emoji
                <input className="input" name="avatarEmoji" placeholder="☀️" maxLength={8} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field">
                Budget
                <input className="input" name="budgetPreference" placeholder="Éco, confort, flexible..." />
              </label>
              <label className="field">
                Styles
                <input className="input" name="stylePreferences" placeholder="plage, food, roadtrip" />
              </label>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-bold text-muted">
              {[
                ["canDrive", "Peut conduire"],
                ["likesBeach", "Plage"],
                ["likesFood", "Food"],
                ["likesHiking", "Rando"],
                ["likesRoadtrip", "Road trip"],
                ["likesParty", "Soirées"],
                ["wantsComfort", "Confort"]
              ].map(([name, label]) => (
                <label key={name} className="inline-flex items-center gap-2">
                  <input name={name} type="checkbox" />
                  {label}
                </label>
              ))}
            </div>
            <button className="button-primary justify-self-start" type="submit">
              Ajouter
            </button>
          </form>
        </section>

        <section className="panel flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Itinéraire</p>
            <h2 className="font-black text-ink">{data.pointCount} points d’intérêt · {data.segments.length} segments</h2>
          </div>
          <Link href={`/trips/${data.trip.slug}/itinerary`} className="button-primary">
            Préparer le road trip <MapPinned className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </main>
    </>
  );
}
