import { notFound } from "next/navigation";
import { ImageOff, Palmtree, Star } from "lucide-react";
import { addDestinationAction, voteDestinationAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { ScorePill } from "@/components/score-pill";
import { TripNav } from "@/components/trip-nav";
import { getDestinations, getParticipants, getTripBySlug } from "@/lib/queries/trips";

export default async function DestinationsPage({ params }: { params: { slug: string } }) {
  const trip = await getTripBySlug(params.slug);
  if (!trip) notFound();
  const [participants, destinations] = await Promise.all([getParticipants(trip.id), getDestinations(trip.id)]);

  return (
    <>
      <TripNav trip={trip} />
      <main className="shell grid gap-5 py-6">
        <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-4">
            <div>
              <p className="eyebrow">Vote destination</p>
              <h2 className="section-title mt-1">Comparer les idées</h2>
              <p className="mt-2 text-sm font-semibold text-muted">
                Choix MVP: score 1 à 5. C’est plus nuancé qu’un simple like et assez lisible pour trancher vite.
              </p>
            </div>

            {destinations.length ? (
              <div className="grid gap-4">
                {destinations.map((destination) => (
                  <article key={destination.id} className="panel overflow-hidden p-0">
                    <div className="grid lg:grid-cols-[240px_1fr]">
                      <div className="min-h-52 bg-linen">
                        {destination.cover_image_url ? (
                          <img src={destination.cover_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted">
                            <ImageOff className="size-8" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <div className="grid gap-4 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-2xl font-black text-ink">{destination.name}</h3>
                            <p className="mt-1 text-sm font-bold text-muted">
                              {[destination.city, destination.region, destination.country].filter(Boolean).join(" · ") || "Destination"}
                            </p>
                          </div>
                          <ScorePill score={destination.average_score} votes={destination.vote_count} />
                        </div>

                        <p className="text-sm font-semibold leading-6 text-muted">
                          {destination.why_this_destination ?? destination.description ?? "Ajoute un pitch pour aider le groupe à décider."}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {destination.vacation_styles.map((style) => (
                            <span key={style} className="chip">
                              {style}
                            </span>
                          ))}
                          {destination.budget_estimate ? <span className="chip">{destination.budget_estimate}</span> : null}
                          {destination.ideal_duration_days ? <span className="chip">{destination.ideal_duration_days} jours</span> : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {destination.highlights ? (
                            <div className="soft-panel">
                              <p className="text-xs font-black uppercase text-lagoon">Highlights</p>
                              <p className="mt-1 text-sm font-semibold text-muted">{destination.highlights}</p>
                            </div>
                          ) : null}
                          {destination.constraints ? (
                            <div className="soft-panel">
                              <p className="text-xs font-black uppercase text-coral">Contraintes</p>
                              <p className="mt-1 text-sm font-semibold text-muted">{destination.constraints}</p>
                            </div>
                          ) : null}
                        </div>

                        {participants.length ? (
                          <form action={voteDestinationAction} className="flex flex-wrap items-end gap-2">
                            <input type="hidden" name="slug" value={trip.slug} />
                            <input type="hidden" name="destinationId" value={destination.id} />
                            <label className="field min-w-36">
                              Votant
                              <select className="input" name="participantId">
                                {participants.map((participant) => (
                                  <option key={participant.id} value={participant.id}>
                                    {participant.display_name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="field w-28">
                              Score
                              <select className="input" name="score" defaultValue="4">
                                {[1, 2, 3, 4, 5].map((score) => (
                                  <option key={score} value={score}>
                                    {score}/5
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="field min-w-48 flex-1">
                              Reco
                              <input className="input" name="recommendation" placeholder="Pourquoi ce score ?" />
                            </label>
                            <button className="button-primary" type="submit">
                              <Star className="size-4" aria-hidden="true" />
                              Voter
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={Palmtree} title="Aucune destination proposée">
                Ajoute 3 ou 4 options pour donner de la matière au vote.
              </EmptyState>
            )}
          </div>

          <form action={addDestinationAction} className="panel grid h-fit gap-3 lg:sticky lg:top-4">
            <input type="hidden" name="tripId" value={trip.id} />
            <input type="hidden" name="slug" value={trip.slug} />
            <h2 className="font-black text-ink">Proposer une destination</h2>
            <label className="field">
              Nom
              <input className="input" name="name" placeholder="Corse du Sud" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field">
                Pays
                <input className="input" name="country" placeholder="France" />
              </label>
              <label className="field">
                Région
                <input className="input" name="region" placeholder="Méditerranée" />
              </label>
            </div>
            <label className="field">
              Ville base
              <input className="input" name="city" placeholder="Bonifacio" />
            </label>
            <label className="field">
              Pourquoi cette destination
              <textarea className="input" name="why" rows={3} placeholder="Le compromis qui peut plaire au groupe..." />
            </label>
            <label className="field">
              Description
              <textarea className="input" name="description" rows={3} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field">
                Budget
                <input className="input" name="budgetEstimate" placeholder="€€" />
              </label>
              <label className="field">
                Durée idéale
                <input className="input" name="idealDurationDays" type="number" min="1" />
              </label>
            </div>
            <label className="field">
              Saison
              <input className="input" name="bestSeason" placeholder="Juin à septembre" />
            </label>
            <label className="field">
              Styles
              <input className="input" name="vacationStyles" placeholder="plage, food, roadtrip" />
            </label>
            <label className="field">
              Image de couverture
              <input className="input" name="coverImageUrl" type="url" placeholder="https://..." />
            </label>
            <label className="field">
              Highlights
              <textarea className="input" name="highlights" rows={2} />
            </label>
            <label className="field">
              Contraintes
              <textarea className="input" name="constraints" rows={2} />
            </label>
            <label className="field">
              Notes
              <textarea className="input" name="notes" rows={2} />
            </label>
            <label className="field">
              Créé par
              <select className="input" name="createdByMemberId" defaultValue="">
                <option value="">Non renseigné</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.display_name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-primary" type="submit">
              Ajouter
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
