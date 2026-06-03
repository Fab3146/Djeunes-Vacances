export function averageScore(scores: number[]) {
  if (!scores.length) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export function decisionLabel(score: number, voteCount: number) {
  if (voteCount === 0) return "Pas encore voté";
  if (score >= 4.4) return "Favori clair";
  if (score >= 3.6) return "Très solide";
  if (score >= 3) return "À discuter";
  return "Faible consensus";
}
