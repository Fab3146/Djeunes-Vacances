import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Hotel, Star } from "lucide-react";
import { addLodgingAction, voteLodgingAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { ScorePill } from "@/components/score-pill";
import { TripNav } from "@/components/trip-nav";
import { getDestinations, getLodgings, getParticipants, getTripBySlug } from "@/lib/queries/trips";

export default async function LodgingsPage({ params }: { params: { slug: string } }) {
  const trip = await getTripBySlug(params.slug);
  if (!trip) notFound();
  const [participants, destinations, lodgings] = await Promise.all([
    getParticipants(trip.id),
    getDestinations(trip.id),
    getLodgings(trip.id)
  ]);

  return (
    <>
      <TripNav trip={trip} />
      <main className="shell grid gap-5 py-6">
        <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-4">
            <div>
              <p className="eyebrow">Vote logement</p>
              <h2 className="section-title mt-1">Comparer les options sérieuses</h2>
            </div>
            {lodgings.length ? (
              <div className="grid gap-4">
                {lodgings.map((lodging) => (
                  <article key={lodging.id} className="panel grid gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-black text-ink">{lodging.title}</h3>
                        <p className="mt-1 text-sm font-bold text-muted">
                          {[lodging.destination_name, lodging.address_text].filter(Boolean).join(" · ") || "Logement"}
                        </p>
                      </div>
                      <ScorePill score={lodging.average_score} votes={lodging.vote_count} />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="soft-panel">
                        <p className="text-xs font-black uppercase text-muted">Total</p>
                        <p className="mt-1 font-black text-ink">{lodging.total_price ? `${lodging.total_price} €` : "N/A"}</p>
                      </div>
                      <div className="soft-panel">
                        <p className="text-xs font-black uppercase text-muted">Par personne</p>
                        <p className="mt-1 font-black text-ink">{lodging.price_per_person ? `${lodging.price_per_person} €` : "N/A"}</p>
                      </div>
                      <div className="soft-panel">
                        <p className="text-xs font-black uppercase text-muted">Couchages</p>
                        <p className="mt-1 font-black text-ink">{lodging.sleeps_count ?? "N/A"}</p>
                      </div>
                      <div className="soft-panel">
                        <p className="text-xs font-black uppercase text-muted">Chambres</p>
                        <p className="mt-1 font-black text-ink">{lodging.bedrooms_count ?? "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {lodging.amenities.map((amenity) => (
                        <span key={amenity} className="chip">
                          {amenity}
                        </span>
                      ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {lodging.pros ? (
                        <div className="soft-panel">
                          <p className="text-xs font-black uppercase text-lagoon">Pour</p>
                          <p className="mt-1 text-sm font-semibold text-muted">{lodging.pros}</p>
                        </div>
                      ) : null}
                      {lodging.cons ? (
                        <div className="soft-panel">
                          <p className="text-xs font-black uppercase text-coral">Contre</p>
                          <p className="mt-1 text-sm font-semibold text-muted">{lodging.cons}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-3">
                      {lodging.external_url ? (
                        <Link href={lodging.external_url} className="button-secondary" target="_blank">
                          Voir l’annonce <ExternalLink className="size-4" aria-hidden="true" />
                        </Link>
                      ) : (
                        <span />
                      )}

                      {participants.length ? (
                        <form action={voteLodgingAction} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="slug" value={trip.slug} />
                          <input type="hidden" name="lodgingId" value={lodging.id} />
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
                          <button className="button-primary" type="submit">
                            <Star className="size-4" aria-hidden="true" />
                            Voter
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={Hotel} title="Aucun logement">
                Ajoute les logements candidats pour comparer vite prix, capacité et compromis.
              </EmptyState>
            )}
          </div>

          <form action={addLodgingAction} className="panel grid h-fit gap-3 lg:sticky lg:top-4">
            <input type="hidden" name="tripId" value={trip.id} />
            <input type="hidden" name="slug" value={trip.slug} />
            <h2 className="font-black text-ink">Ajouter un logement</h2>
            <label className="field">
              Titre
              <input className="input" name="title" placeholder="Villa proche plage" required />
            </label>
            <label className="field">
              Destination
              <select className="input" name="destinationId" defaultValue="">
                <option value="">Non rattaché</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Lien
              <input className="input" name="externalUrl" type="url" placeholder="https://..." />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field">
                Prix total
                <input className="input" name="totalPrice" type="number" min="0" step="0.01" />
              </label>
              <label className="field">
                Prix / personne
                <input className="input" name="pricePerPerson" type="number" min="0" step="0.01" />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field">
                Couchages
                <input className="input" name="sleepsCount" type="number" min="0" />
              </label>
              <label className="field">
                Chambres
                <input className="input" name="bedroomsCount" type="number" min="0" />
              </label>
            </div>
            <label className="field">
              Équipements
              <input className="input" name="amenities" placeholder="piscine, parking, clim" />
            </label>
            <label className="field">
              Adresse
              <input className="input" name="addressText" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field">
                Latitude
                <input className="input" name="latitude" type="number" step="any" />
              </label>
              <label className="field">
                Longitude
                <input className="input" name="longitude" type="number" step="any" />
              </label>
            </div>
            <label className="field">
              Points forts
              <textarea className="input" name="pros" rows={2} />
            </label>
            <label className="field">
              Limites
              <textarea className="input" name="cons" rows={2} />
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
