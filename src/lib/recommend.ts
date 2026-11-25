import type { CatalogTour } from './types';
export interface QuizAnswers { budget: number; maxDays: number; categories: string[] }
// Deterministic scoring over real catalog rows.
export function recommend(tours: CatalogTour[], a: QuizAnswers) {
  return tours.filter((t) => t.price_kzt <= a.budget && t.duration_days <= a.maxDays && t.seats_left > 0)
    .map((t) => ({ t, score: (a.categories.includes(t.category) ? 50 : 0) + (1 - t.price_kzt / a.budget) * 20 + (t.avg_rating ?? 3) * 4 }))
    .sort((x, y) => y.score - x.score).map((x) => x.t);
}
