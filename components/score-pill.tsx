import { decisionLabel } from "@/lib/scoring";

export function ScorePill({ score, votes }: { score: number; votes: number }) {
  return (
    <span className="chip bg-marigold/15 text-ink">
      {votes ? `${score.toFixed(1)}/5 · ${votes} vote${votes > 1 ? "s" : ""}` : decisionLabel(score, votes)}
    </span>
  );
}
