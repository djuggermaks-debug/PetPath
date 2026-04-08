export interface Pet {
  id: string;
  name: string;
  breed: string;
  species: 'cat' | 'dog' | 'bird' | 'other';
  birthDate: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  gender: 'male' | 'female';
  color: string;
  photo?: string;
  caseNumber: string;
  createdAt: string;
}

export interface Module {
  id: string;
  label: string;
  labelShort: string;
  icon: string;
  color: string;
  isPremium: boolean;
  component: React.ComponentType<ModuleProps>;
}

export interface ModuleProps {
  petId: string;
}

export interface ParsedAtom {
  module: string;
  data: Record<string, unknown>;
  confidence: number;
  rawText: string;
}
