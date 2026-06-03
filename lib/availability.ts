import type { Availability, DateScore, DateWindow, Participant } from "@/lib/types";
import { addDays, eachDate, formatDateRange } from "@/lib/dates";

const STATUS_WEIGHT = {
  available: 1,
  maybe: 0.5,
  unavailable: 0
} as const;

export function scoreAvailabilityByDate(
  participants: Participant[],
  availabilities: Availability[]
): DateScore[] {
  const participantIds = new Set(participants.map((participant) => participant.id));
  const byDate = new Map<string, Availability[]>();

  for (const availability of availabilities) {
    if (!participantIds.has(availability.participant_id)) continue;
    const list = byDate.get(availability.date) ?? [];
    list.push(availability);
    byDate.set(availability.date, list);
  }

  return Array.from(byDate.entries())
    .map(([date, entries]) => {
      const statusByParticipant = new Map(entries.map((entry) => [entry.participant_id, entry.status]));
      const availableCount = entries.filter((entry) => entry.status === "available").length;
      const maybeCount = entries.filter((entry) => entry.status === "maybe").length;
      const unavailableCount = entries.filter((entry) => entry.status === "unavailable").length;
      const missingCount = participants.filter((participant) => !statusByParticipant.has(participant.id)).length;
      const rawScore = entries.reduce((sum, entry) => sum + STATUS_WEIGHT[entry.status], 0);
      const participantCount = Math.max(participants.length, 1);

      return {
        date,
        score: rawScore / participantCount,
        availableCount,
        maybeCount,
        unavailableCount,
        missingCount,
        participantCount
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function fillDateScores(
  scores: DateScore[],
  participants: Participant[],
  start: string,
  end: string
) {
  const scoreByDate = new Map(scores.map((score) => [score.date, score]));

  return eachDate(start, end).map((date) => {
    const existing = scoreByDate.get(date);
    if (existing) return existing;

    return {
      date,
      score: 0,
      availableCount: 0,
      maybeCount: 0,
      unavailableCount: 0,
      missingCount: participants.length,
      participantCount: participants.length
    };
  });
}

export function findBestWindows(scores: DateScore[], days: number, limit = 3): DateWindow[] {
  if (scores.length < days || days <= 0) return [];

  const windows: DateWindow[] = [];

  for (let index = 0; index <= scores.length - days; index += 1) {
    const slice = scores.slice(index, index + days);
    const averageScore = slice.reduce((sum, score) => sum + score.score, 0) / days;
    const minScore = Math.min(...slice.map((score) => score.score));
    const availableDays = slice.filter((score) => score.score >= 0.75).length;
    const start = slice[0].date;
    const end = slice[slice.length - 1].date;

    windows.push({
      start,
      end,
      days,
      averageScore,
      minScore,
      availableDays,
      label: formatDateRange(start, end)
    });
  }

  return windows
    .sort((a, b) => {
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      if (b.minScore !== a.minScore) return b.minScore - a.minScore;
      return b.availableDays - a.availableDays;
    })
    .slice(0, limit);
}

export function findPlanningRange(availabilities: Availability[]) {
  if (!availabilities.length) {
    const year = new Date().getFullYear();
    return { start: `${year}-07-01`, end: `${year}-09-15` };
  }

  const sorted = [...availabilities].sort((a, b) => a.date.localeCompare(b.date));
  return {
    start: addDays(sorted[0].date, -7),
    end: addDays(sorted[sorted.length - 1].date, 7)
  };
}
