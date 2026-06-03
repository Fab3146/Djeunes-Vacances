import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { DbTestForm } from "@/components/db-test-form";

export default function DbTestPage() {
  return (
    <>
      <AppHeader />
      <main className="shell max-w-2xl py-8">
        <Link href="/" className="text-sm font-black text-lagoon">
          Retour
        </Link>
        <div className="mt-4">
          <p className="eyebrow">Neon</p>
          <h1 className="section-title mt-2">Test de connexion serveur</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted">
            Ce test exécute `select 1 as ok` via une server action. La variable `DATABASE_URL` reste côté serveur.
          </p>
        </div>
        <div className="mt-5">
          <DbTestForm />
        </div>
      </main>
    </>
  );
}
