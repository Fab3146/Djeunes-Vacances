import { AppHeader } from "@/components/app-header";
import { createTripAction } from "@/app/actions";

export default function NewTripPage() {
  const year = new Date().getFullYear();

  return (
    <>
      <AppHeader />
      <main className="shell max-w-3xl py-8">
        <p className="eyebrow">Nouveau voyage</p>
        <h1 className="mt-2 text-4xl font-black tracking-normal text-ink">Créer l’édition des Djeuns</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-muted">
          L’application génère un slug privé non prédictible. Partage simplement l’URL du voyage au groupe.
        </p>
        <form action={createTripAction} className="panel mt-6 grid gap-4">
          <label className="field">
            Nom du voyage
            <input className="input" name="name" placeholder="Vacances des Djeuns" required />
          </label>
          <label className="field">
            Année / édition
            <input className="input" name="editionYear" type="number" min="2024" max="2100" defaultValue={year} required />
          </label>
          <label className="field">
            Description
            <textarea
              className="input"
              name="description"
              rows={4}
              placeholder="Objectif, contraintes connues, envie générale du groupe..."
            />
          </label>
          <button className="button-primary justify-self-start" type="submit">
            Créer le voyage
          </button>
        </form>
      </main>
    </>
  );
}
