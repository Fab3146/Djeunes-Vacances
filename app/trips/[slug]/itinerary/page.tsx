import { notFound } from "next/navigation";
import { Filter, MapPinned, Plus, Route } from "lucide-react";
import { addItineraryPointAction, addSegmentAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { TripNav } from "@/components/trip-nav";
import { formatShortDate } from "@/lib/dates";
import { groupPointsByCategory, groupPointsByDay, filterItineraryPoints, uniqueCategories } from "@/lib/itinerary";
import { getItineraryPoints, getSegments, getTripBySlug } from "@/lib/queries/trips";

const defaultCategories = [
  "plage",
  "restaurant",
  "bar",
  "café",
  "rando",
  "spot photo",
  "point de vue",
  "parking",
  "station-service",
  "supermarché",
  "hébergement",
  "activité",
  "arrêt route",
  "custom"
];

export default async function ItineraryPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { segment?: string; day?: string; category?: string; q?: string };
}) {
  const trip = await getTripBySlug(params.slug);
  if (!trip) notFound();
  const [segments, points] = await Promise.all([getSegments(trip.id), getItineraryPoints(trip.id)]);

  const day = searchParams.day ? Number(searchParams.day) : undefined;
  const filteredPoints = filterItineraryPoints(points, {
    segmentId: searchParams.segment || undefined,
    day: Number.isFinite(day) ? day : undefined,
    category: searchParams.category || undefined,
    query: searchParams.q || undefined
  });
  const categories = Array.from(new Set([...defaultCategories, ...uniqueCategories(points)]));
  const byDay = groupPointsByDay(filteredPoints);
  const byCategory = groupPointsByCategory(filteredPoints);

  return (
    <>
      <TripNav trip={trip} />
      <main className="shell grid gap-5 py-6">
        <section className="grid gap-4 lg:grid-cols-[1fr_390px]">
          <div className="grid gap-4">
            <div className="panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Road trip</p>
                  <h2 className="section-title mt-1">Points d’intérêt</h2>
                  <p className="mt-2 text-sm font-semibold text-muted">
                    {points.length} points au total · {filteredPoints.length} affichés · aucune limite par catégorie.
                  </p>
                </div>
                <span className="chip bg-lagoon/10 text-lagoon">{segments.length} segment{segments.length > 1 ? "s" : ""}</span>
              </div>

              <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_160px_160px_160px_auto]" method="get">
                <label className="field">
                  Recherche
                  <input className="input" name="q" defaultValue={searchParams.q} placeholder="titre, tag, note..." />
                </label>
                <label className="field">
                  Segment
                  <select className="input" name="segment" defaultValue={searchParams.segment ?? ""}>
                    <option value="">Tous</option>
                    {segments.map((segment) => (
                      <option key={segment.id} value={segment.id}>
                        {segment.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Jour
                  <input className="input" name="day" type="number" min="1" defaultValue={searchParams.day} />
                </label>
                <label className="field">
                  Catégorie
                  <select className="input" name="category" defaultValue={searchParams.category ?? ""}>
                    <option value="">Toutes</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button-primary self-end" type="submit">
                  <Filter className="size-4" aria-hidden="true" />
                  Filtrer
                </button>
              </form>
            </div>

            {filteredPoints.length ? (
              <div className="grid gap-4">
                <section className="panel">
                  <h3 className="font-black text-ink">Vue par jour</h3>
                  <div className="mt-3 grid gap-3">
                    {Object.entries(byDay).map(([group, groupPoints]) => (
                      <div key={group} className="soft-panel">
                        <h4 className="font-black text-ink">{group}</h4>
                        <div className="mt-3 grid gap-2">
                          {groupPoints.map((point) => (
                            <PointRow key={point.id} point={point} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="panel">
                  <h3 className="font-black text-ink">Vue par catégorie</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {Object.entries(byCategory).map(([category, groupPoints]) => (
                      <div key={category} className="soft-panel">
                        <h4 className="font-black text-ink">{category}</h4>
                        <p className="text-sm font-semibold text-muted">{groupPoints.length} point{groupPoints.length > 1 ? "s" : ""}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <EmptyState icon={MapPinned} title="Aucun point affiché">
                Ajoute plages, restos, parkings, randos, spots photo ou enlève des filtres.
              </EmptyState>
            )}
          </div>

          <aside className="grid h-fit gap-4 lg:sticky lg:top-4">
            <form action={addSegmentAction} className="panel grid gap-3">
              <input type="hidden" name="tripId" value={trip.id} />
              <input type="hidden" name="slug" value={trip.slug} />
              <h2 className="font-black text-ink">Ajouter un segment</h2>
              <label className="field">
                Titre
                <input className="input" name="title" placeholder="Jour 1 · Ajaccio" required />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  Jour
                  <input className="input" name="dayNumber" type="number" min="1" />
                </label>
                <label className="field">
                  Type
                  <select className="input" name="segmentType" defaultValue="day">
                    <option value="day">Journée</option>
                    <option value="transfer">Transfert</option>
                    <option value="zone">Zone</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  Départ
                  <input className="input" name="startLocation" />
                </label>
                <label className="field">
                  Arrivée
                  <input className="input" name="endLocation" />
                </label>
              </div>
              <label className="field">
                Ordre
                <input className="input" name="sortOrder" type="number" defaultValue={segments.length + 1} />
              </label>
              <label className="field">
                Notes
                <textarea className="input" name="notes" rows={2} />
              </label>
              <button className="button-secondary" type="submit">
                <Route className="size-4" aria-hidden="true" />
                Ajouter le segment
              </button>
            </form>

            <form action={addItineraryPointAction} className="panel grid gap-3">
              <input type="hidden" name="tripId" value={trip.id} />
              <input type="hidden" name="slug" value={trip.slug} />
              <h2 className="font-black text-ink">Ajouter un point</h2>
              <label className="field">
                Titre
                <input className="input" name="title" placeholder="Plage de Palombaggia" required />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  Catégorie
                  <input className="input" name="category" list="point-categories" placeholder="plage" required />
                  <datalist id="point-categories">
                    {categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </label>
                <label className="field">
                  Sous-catégorie
                  <input className="input" name="subcategory" placeholder="sunset" />
                </label>
              </div>
              <label className="field">
                Segment
                <select className="input" name="segmentId" defaultValue="">
                  <option value="">Non assigné</option>
                  {segments.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="field">
                  Jour
                  <input className="input" name="dayNumber" type="number" min="1" />
                </label>
                <label className="field">
                  Moment
                  <select className="input" name="daytimeSlot" defaultValue="">
                    <option value="">N/A</option>
                    <option value="morning">Matin</option>
                    <option value="lunch">Déjeuner</option>
                    <option value="afternoon">Après-midi</option>
                    <option value="sunset">Sunset</option>
                    <option value="evening">Soir</option>
                    <option value="night">Nuit</option>
                  </select>
                </label>
                <label className="field">
                  Priorité
                  <select className="input" name="priority" defaultValue="nice">
                    <option value="">N/A</option>
                    <option value="must">Must</option>
                    <option value="nice">Nice</option>
                    <option value="bonus">Bonus</option>
                  </select>
                </label>
              </div>
              <label className="field">
                Adresse
                <input className="input" name="addressText" />
              </label>
              <label className="field">
                URL Google Maps
                <input className="input" name="googleMapsUrl" type="url" />
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
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  Coût estimé
                  <input className="input" name="estimatedCost" type="number" min="0" step="0.01" />
                </label>
                <label className="field">
                  Durée min.
                  <input className="input" name="estimatedDurationMinutes" type="number" min="0" />
                </label>
              </div>
              <label className="field">
                Statut
                <select className="input" name="status" defaultValue="idea">
                  <option value="idea">Idée</option>
                  <option value="shortlisted">Shortlist</option>
                  <option value="booked">Réservé</option>
                  <option value="done">Fait</option>
                  <option value="canceled">Annulé</option>
                </select>
              </label>
              <label className="field">
                Tags
                <input className="input" name="tags" placeholder="baignade, vue, groupe" />
              </label>
              <label className="field">
                Description
                <textarea className="input" name="description" rows={2} />
              </label>
              <label className="field">
                Notes
                <textarea className="input" name="notes" rows={2} />
              </label>
              <label className="field">
                Ordre
                <input className="input" name="sortOrder" type="number" defaultValue={points.length + 1} />
              </label>
              <button className="button-primary" type="submit">
                <Plus className="size-4" aria-hidden="true" />
                Ajouter le point
              </button>
            </form>
          </aside>
        </section>
      </main>
    </>
  );
}

function PointRow({ point }: { point: Awaited<ReturnType<typeof getItineraryPoints>>[number] }) {
  return (
    <div className="rounded-md border border-black/10 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-black text-ink">{point.title}</p>
          <p className="mt-1 text-xs font-bold text-muted">
            {[point.category, point.subcategory, point.segment_title, point.day_number ? `jour ${point.day_number}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {point.priority ? <span className="chip">{point.priority}</span> : null}
      </div>
      {point.description ? <p className="mt-2 text-sm font-semibold text-muted">{point.description}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {point.tags.map((tag) => (
          <span key={tag} className="chip bg-linen">
            {tag}
          </span>
        ))}
        {point.created_at ? <span className="chip">Ajouté {formatShortDate(point.created_at.slice(0, 10))}</span> : null}
      </div>
    </div>
  );
}
