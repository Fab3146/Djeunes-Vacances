import Link from "next/link";
import { MapPinned, Plus } from "lucide-react";

export function AppHeader() {
  return (
    <header className="border-b border-black/10 bg-white/70 backdrop-blur">
      <div className="shell flex items-center justify-between gap-4 py-4">
        <Link href="/" className="flex items-center gap-3 font-black text-ink">
          <span className="flex size-10 items-center justify-center rounded-md bg-lagoon text-white">
            <MapPinned className="size-5" aria-hidden="true" />
          </span>
          <span>Voyage djeunes</span>
        </Link>
        <Link href="/trips/new" className="button-primary">
          <Plus className="size-4" aria-hidden="true" />
          Nouveau voyage
        </Link>
      </div>
    </header>
  );
}
