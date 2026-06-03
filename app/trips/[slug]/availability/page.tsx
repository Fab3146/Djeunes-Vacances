import { notFound } from "next/navigation";
import { CalendarDays, Users } from "lucide-react";
import { addAvailabilityRangeAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { TripNav } from "@/components/trip-nav";
import { getAvailabilityPageData } from "@/lib/queries/trips";
import { formatShortDate } from "@/lib/dates";

function scoreClass(score: number) {
  if (score >= 0.85) return "border-lagoon/30 bg-lagoon/15 text-lagoon";
  if (score >= 0.55) return "border-marigold/30 bg-marigold/20 text-ink";
  if (score > 0) return "border-coral/30 bg-coral/10 text-coral";
  return "border-black/10 bg-white/70 text-muted";
}

export default async function AvailabilityPage({ params }: { params: { slug: string } }) {
  const data = await getAvailabilityPageData(params.slug);
  if (!data) notFound();

  const windows = [
    { title: "Top week-ends", items: data.topWeekends },
    { title: "Top semaines", items: data.topWeeks },
    { title: "Alternatives longues", items: data.alternatives }
  ];

  return (
    <>
      <TripNav trip={data.trip} />
      <main className="shell grid gap-5 py-6">
        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <form action={addAvailabilityRangeAction} className="panel grid gap-3">
            <input type="hidden" name="tripId" value={data.trip.id} />
            <input type="hidden" name="slug" value={data.trip.slug} />
            <div>
              <p className="eyebrow">Saisie</p>
              <h2 className="section-title mt-1">Ajouter une disponibilité</h2>
            </div>
            {data.participants.length ? (
              <>
                <label className="field">
                  Participant
                  <select className="input" name="participantId" required>
                    {data.participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.display_name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="field">
                    Du
                    <input className="input" name="startDate" type="date" required />
                  </label>
                  <label className="field">
                    Au
                    <input className="input" name="endDate" type="date" required />
                  </label>
                </div>
                <label className="field">
                  État
                  <select className="input" name="status" defaultValue="available">
                    <option value="available">Disponible</option>
                    <option value="maybe">Peut-être</option>
                    <option value="unavailable">Indisponible</option>
                  </select>
                </label>
                <button className="button-primary" type="submit">
                  Enregistrer la plage
                </button>
              </>
            ) : (
              <EmptyState icon={Users} title="Aucun participant">
                Ajoute les participants depuis le dashboard avant de saisir les dates.
              </EmptyState>
            )}
          </form>

          <div className="grid gap-4 sm:grid-cols-3">
            {windows.map((group) => (
              <article key={group.title} className="panel">
                <h2 className="font-black text-ink">{group.title}</h2>
                <div className="mt-3 grid gap-2">
                  {group.items.length ? (
                    group.items.map((window) => (
                      <div key={`${group.title}-${window.start}`} className="soft-panel">
                        <p className="font-black text-ink">{window.label}</p>
                        <p className="text-sm font-semibold text-muted">
                          {Math.round(window.averageScore * 100)}% moyen · plancher {Math.round(window.minScore * 100)}%
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-muted">Pas assez de données.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Calendrier</p>
              <h2 className="section-title mt-1">Score par date</h2>
            </div>
            <span className="chip">{data.participants.length} participant{data.participants.length > 1 ? "s" : ""}</span>
          </div>
          {data.scores.length ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10">
              {data.scores.map((score) => (
                <div key={score.date} className={`score-cell ${scoreClass(score.score)}`}>
                  <p>{formatShortDate(score.date)}</p>
                  <p className="mt-1 text-lg">{Math.round(score.score * 100)}%</p>
                  <p className="mt-1 text-[11px]">
                    {score.availableCount} ok · {score.maybeCount} maybe · {score.unavailableCount} non
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="Calendrier vide">
              Saisis quelques plages pour faire apparaître les scores.
            </EmptyState>
          )}
        </section>
      </main>
    </>
  );
}
