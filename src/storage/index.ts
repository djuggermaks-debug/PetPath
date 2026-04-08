// Storage abstraction — free tier uses Telegram CloudStorage,
// premium tier will use Supabase (not yet implemented)

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        CloudStorage: {
          setItem: (key: string, value: string, cb: (err: string | null) => void) => void;
          getItem: (key: string, cb: (err: string | null, value?: string) => void) => void;
          removeItem: (key: string, cb: (err: string | null) => void) => void;
        };
      };
    };
  }
}

const tg = window.Telegram?.WebApp;

function isTelegram(): boolean {
  return !!tg?.CloudStorage && !!window.Telegram?.WebApp?.initData;
}

// ── Telegram CloudStorage (async key-value) ──────────────────

function tgSet(key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    tg!.CloudStorage.setItem(key, value, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function tgGet(key: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    tg!.CloudStorage.getItem(key, (err, value) => {
      if (err) reject(err);
      else resolve(value ?? null);
    });
  });
}

function tgRemove(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    tg!.CloudStorage.removeItem(key, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ── localStorage fallback (for development outside Telegram) ──

function localSet(key: string, value: string): void {
  localStorage.setItem(key, value);
}

function localGet(key: string): string | null {
  return localStorage.getItem(key);
}

function localRemove(key: string): void {
  localStorage.removeItem(key);
}

// ── Public API ────────────────────────────────────────────────

export async function storageSet(key: string, value: unknown): Promise<void> {
  const serialized = JSON.stringify(value);
  if (isTelegram()) {
    await tgSet(key, serialized);
  } else {
    localSet(key, serialized);
  }
}

export async function storageGet<T>(key: string): Promise<T | null> {
  let raw: string | null;
  if (isTelegram()) {
    raw = await tgGet(key);
  } else {
    raw = localGet(key);
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function storageRemove(key: string): Promise<void> {
  if (isTelegram()) {
    await tgRemove(key);
  } else {
    localRemove(key);
  }
}

// ── Pet-specific helpers ──────────────────────────────────────

const PETS_INDEX_KEY = 'pets_index';

export async function savePet(pet: import('../types').Pet): Promise<void> {
  // Save pet data
  await storageSet(`pet_${pet.id}`, pet);
  // Update index
  const index = (await storageGet<string[]>(PETS_INDEX_KEY)) ?? [];
  if (!index.includes(pet.id)) {
    await storageSet(PETS_INDEX_KEY, [...index, pet.id]);
  }
}

export async function loadAllPets(): Promise<import('../types').Pet[]> {
  const index = (await storageGet<string[]>(PETS_INDEX_KEY)) ?? [];
  const pets = await Promise.all(
    index.map(id => storageGet<import('../types').Pet>(`pet_${id}`))
  );
  return pets.filter(Boolean) as import('../types').Pet[];
}

export async function saveModuleData(
  petId: string,
  moduleId: string,
  data: unknown[]
): Promise<void> {
  await storageSet(`module_${petId}_${moduleId}`, data);
}

export async function loadModuleData<T>(
  petId: string,
  moduleId: string
): Promise<T[]> {
  return (await storageGet<T[]>(`module_${petId}_${moduleId}`)) ?? [];
}
