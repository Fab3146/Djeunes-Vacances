import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink, FileSpreadsheet, MapPinned } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { TripNav } from "@/components/trip-nav";
import { buildGoogleMapsLinks } from "@/lib/exports";
import { filterItineraryPoints, uniqueCategories } from "@/lib/itinerary";
import { getItineraryPoints, getSegments, getTripBySlug } from "@/lib/queries/trips";

export default async function ExportsPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { segment?: string; day?: string; category?: string };
}) {
  const trip = await getTripBySlug(params.slug);
  if (!trip) notFound();
  const [segments, points] = await Promise.all([getSegments(trip.id), getItineraryPoints(trip.id)]);
  const day = searchParams.day ? Number(searchParams.day) : undefined;
  const filteredPoints = filterItineraryPoints(points, {
    segmentId: searchParams.segment || undefined,
    day: Number.isFinite(day) ? day : undefined,
    category: searchParams.category || undefined
  });
  const categories = uniqueCategories(points);
  const googleLinks = buildGoogleMapsLinks(filteredPoints);
  const query = new URLSearchParams();
  if (searchParams.segment) query.set("segment", searchParams.segment);
  if (searchParams.day) query.set("day", searchParams.day);
  if (searchParams.category) query.set("category", searchParams.category);
  const csvHref = `/trips/${trip.slug}/exports/csv${query.toString() ? `?${query.toString()}` : ""}`;

  return (
    <>
      <TripNav trip={trip} />
      <main className="shell grid gap-5 py-6">
        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="panel">
            <div>
              <p className="eyebrow">Google Maps / My Maps</p>
              <h2 className="section-title mt-1">Exporter les points</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                Le CSV est compatible Google My Maps. Les liens Google Maps sont générés par paquets pour éviter des trajets trop longs.
              </p>
            </div>

            <form className="mt-4 grid gap-3 sm:grid-cols-3" method="get">
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
              <button className="button-secondary sm:col-span-3" type="submit">
                Appliquer les filtres
              </button>
            </form>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={csvHref} className="button-primary">
                <Download className="size-4" aria-hidden="true" />
                Télécharger le CSV
              </Link>
              <span className="chip">{filteredPoints.length} point{filteredPoints.length > 1 ? "s" : ""}</span>
            </div>
          </div>

          <div className="panel">
            <h2 className="font-black text-ink">Colonnes exportées</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {["Name", "Description", "Category", "Address", "Latitude", "Longitude", "GoogleMapsURL", "Day", "Segment", "Priority"].map(
                (column) => (
                  <div key={column} className="soft-panel flex items-center gap-2">
                    <FileSpreadsheet className="size-4 text-lagoon" aria-hidden="true" />
                    <span className="text-sm font-black text-ink">{column}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Liens directions</p>
              <h2 className="section-title mt-1">Google Maps par lot</h2>
            </div>
            <span className="chip">Max 9 arrêts par lien</span>
          </div>

          {googleLinks.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {googleLinks.map((link) => (
                <Link key={link.url} href={link.url} target="_blank" className="soft-panel transition hover:border-lagoon/40 hover:bg-lagoon/5">
                  <MapPinned className="mb-3 size-5 text-coral" aria-hidden="true" />
                  <p className="font-black text-ink">{link.label}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">{link.pointCount} point{link.pointCount > 1 ? "s" : ""}</p>
                  <span className="mt-3 inline-flex items-center gap-2 text-sm font-black text-lagoon">
                    Ouvrir <ExternalLink className="size-4" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={MapPinned} title="Aucun lien générable">
              Ajoute une adresse ou des coordonnées à quelques points pour générer des itinéraires.
            </EmptyState>
          )}
        </section>
      </main>
    </>
  );
}
