import { supabase } from './supabase';
import type { Pet } from '../types';

// ── User ID ────────────────────────────────────────────────────

export function getUserId(): string {
  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  if (tgUser?.id) return String(tgUser.id);
  // Dev fallback — stable per browser
  let devId = localStorage.getItem('_dev_uid');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('_dev_uid', devId);
  }
  return devId;
}

// ── Photo upload ───────────────────────────────────────────────

async function uploadPhoto(base64: string, path: string): Promise<string> {
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'image/jpeg' });

  const { error } = await supabase.storage
    .from('pet-photos')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;

  const { data } = supabase.storage.from('pet-photos').getPublicUrl(path);
  return data.publicUrl;
}

// ── Pets ───────────────────────────────────────────────────────

export async function savePet(pet: Pet): Promise<void> {
  const userId = getUserId();
  let photoUrl: string | null = null;

  if (pet.photo) {
    if (pet.photo.startsWith('data:') || !pet.photo.startsWith('http')) {
      // base64 → upload to Storage
      photoUrl = await uploadPhoto(pet.photo, `${userId}/${pet.id}.jpg`);
    } else {
      photoUrl = pet.photo;
    }
  }

  const { error } = await supabase.from('pets').upsert({
    id: pet.id,
    telegram_user_id: userId,
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? '',
    birth_date: pet.birthDate ?? '',
    weight: pet.weight ?? 0,
    weight_unit: pet.weightUnit ?? 'kg',
    gender: pet.gender ?? 'male',
    color: pet.color ?? '',
    photo_url: photoUrl,
    case_number: pet.caseNumber,
    created_at: pet.createdAt,
  });
  if (error) throw error;
}

export async function loadAllPets(): Promise<Pet[]> {
  const userId = getUserId();
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('telegram_user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    birthDate: row.birth_date,
    weight: Number(row.weight),
    weightUnit: row.weight_unit,
    gender: row.gender,
    color: row.color,
    photo: row.photo_url ?? undefined,
    caseNumber: row.case_number,
    createdAt: row.created_at,
  }));
}

export async function deletePet(petId: string): Promise<void> {
  const { error } = await supabase.from('pets').delete().eq('id', petId);
  if (error) throw error;
  // Storage photos — best effort
  const userId = getUserId();
  await supabase.storage.from('pet-photos').remove([`${userId}/${petId}.jpg`]);
}

// ── Module data ────────────────────────────────────────────────

export async function saveModuleData(
  petId: string,
  moduleId: string,
  data: unknown[]
): Promise<void> {
  const { error } = await supabase.from('module_data').upsert({
    pet_id: petId,
    module_id: moduleId,
    data,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function loadModuleData<T>(
  petId: string,
  moduleId: string
): Promise<T[]> {
  const { data, error } = await supabase
    .from('module_data')
    .select('data')
    .eq('pet_id', petId)
    .eq('module_id', moduleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return []; // no row
    throw error;
  }
  return (data?.data as T[]) ?? [];
}

// ── Legacy compat (не используется, но нужен импорт) ──────────
export async function storageSet(): Promise<void> {}
export async function storageGet(): Promise<null> { return null; }
export async function storageRemove(): Promise<void> {}
