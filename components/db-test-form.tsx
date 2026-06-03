"use client";

import { useFormState } from "react-dom";
import { DatabaseZap } from "lucide-react";
import { testDatabaseConnectionAction } from "@/app/actions";

type State = { ok: boolean; message: string } | null;

export function DbTestForm() {
  const [state, formAction] = useFormState<State, FormData>(testDatabaseConnectionAction, null);

  return (
    <form action={formAction} className="panel grid gap-3">
      <button className="button-primary" type="submit">
        <DatabaseZap className="size-4" aria-hidden="true" />
        Tester la connexion Neon
      </button>
      {state ? (
        <p className={`rounded-md p-3 text-sm font-black ${state.ok ? "bg-lagoon/10 text-lagoon" : "bg-coral/10 text-coral"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
