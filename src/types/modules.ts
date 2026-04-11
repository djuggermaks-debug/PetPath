// ── Health ────────────────────────────────────────────────────
export interface HealthEntry {
  id: string;
  date: string;
  type: 'symptom' | 'visit' | 'diagnosis';
  description: string;
  // visit fields
  vet?: string;
  clinic?: string;
  reason?: string;
  result?: string;
  nextVisitDate?: string;
  nextVisitNotify?: boolean;
  // symptom fields
  severity?: 'mild' | 'moderate' | 'severe';
  // diagnosis fields
  diagnosis?: string;
  _photo?: string;
}

// ── Medications ───────────────────────────────────────────────
export interface MedicationEntry {
  id: string;
  name: string;
  dose: string;
  unit: 'мг' | 'мл' | 'таб' | 'кап' | 'другое';
  frequency: string;
  startDate: string;
  endDate?: string;
  reason?: string;
  prescribedBy: 'vet' | 'self';
  notify: boolean;
  notifyTime?: string;
}

// ── Vaccines ──────────────────────────────────────────────────
export interface VaccineEntry {
  id: string;
  name: string;
  date: string;
  drug?: string;
  manufacturer?: string;
  vet?: string;
  clinic?: string;
  nextDate?: string;
  notify: boolean;
}

// ── Allergies ─────────────────────────────────────────────────
export interface AllergyEntry {
  id: string;
  allergen: string;
  allergenType: 'food' | 'plant' | 'drug' | 'other';
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  firstDate?: string;
  confirmedByVet: boolean;
  _photo?: string;
}

// ── Nutrition ─────────────────────────────────────────────────
export interface NutritionEntry {
  id: string;
  date: string;
  feedType: 'dry' | 'wet' | 'natural' | 'mixed';
  brand?: string;
  portionSize?: string;
  frequency?: string;
  restrictions?: string;
  favorites?: string;
  dislikes?: string;
  reaction?: string;
}

// ── Habits ────────────────────────────────────────────────────
export interface HabitEntry {
  id: string;
  date: string;
  category: 'activity' | 'sleep' | 'play' | 'command' | 'behavior' | 'change';
  description: string;
  activityLevel?: 'low' | 'medium' | 'high';
}

// ── Documents ─────────────────────────────────────────────────
export interface DocumentEntry {
  id: string;
  type: 'passport' | 'chip' | 'insurance' | 'pedigree' | 'other';
  title: string;
  number?: string;
  date?: string;
  expiry?: string;
  notes?: string;
}

// ── Items ─────────────────────────────────────────────────────
export interface ItemEntry {
  id: string;
  name: string;
  category: 'toy' | 'bed' | 'feeder' | 'leash' | 'clothing' | 'cage' | 'other';
  condition?: 'new' | 'used' | 'worn';
  reaction?: 'loves' | 'likes' | 'ignores' | 'afraid';
  purchaseDate?: string;
  notes?: string;
  _photo?: string;
}

// ── Expenses ──────────────────────────────────────────────────
export interface ExpenseEntry {
  id: string;
  date: string;
  amount: number;
  currency: string;
  category: 'food' | 'health' | 'grooming' | 'items' | 'other';
  description: string;
  shop?: string;
  _photo?: string;
}

// ── Calendar ──────────────────────────────────────────────────
export interface CalendarEntry {
  id: string;
  date: string;
  title: string;
}

// ── Media ─────────────────────────────────────────────────────
export interface MediaEntry {
  id: string;
  date: string;
  type: 'photo' | 'video';
  url: string;
  caption?: string;
  category: 'regular' | 'vet' | 'before_after';
}
