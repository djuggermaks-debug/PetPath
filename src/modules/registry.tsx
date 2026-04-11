import { HealthModule } from './health';
import { MedicationsModule } from './medications';
import { VaccinesModule } from './vaccines';
import { AllergiesModule } from './allergies';
import { NutritionModule } from './nutrition';
import { HabitsModule } from './habits';
import { DocumentsModule } from './documents';
import { MediaModule } from './media';
import { ItemsModule } from './items';
import { ExpensesModule } from './expenses';

interface ModuleEntry {
  id: string;
  label: string;
  labelShort: string;
  icon: string;
  color: string;
  isPremium: boolean;
  component: React.ComponentType<{ petId: string }>;
}

export const MODULE_REGISTRY: ModuleEntry[] = [
  { id: 'health',      label: 'Здоровье',   labelShort: 'Здоров.',  icon: '🩺', color: '#e74c3c', isPremium: false, component: HealthModule },
  { id: 'medications', label: 'Лекарства',  labelShort: 'Лекарст.', icon: '💊', color: '#e67e22', isPremium: false, component: MedicationsModule },
  { id: 'vaccines',    label: 'Прививки',   labelShort: 'Привив.',  icon: '💉', color: '#d4ac0d', isPremium: false, component: VaccinesModule },
  { id: 'allergies',   label: 'Аллергии',   labelShort: 'Аллерг.',  icon: '⚠️', color: '#9b59b6', isPremium: false, component: AllergiesModule },
  { id: 'nutrition',   label: 'Питание',    labelShort: 'Питание',  icon: '🥣', color: '#27ae60', isPremium: true,  component: NutritionModule },
  { id: 'habits',      label: 'Привычки',   labelShort: 'Привыч.',  icon: '🐾', color: '#3498db', isPremium: true,  component: HabitsModule },
  { id: 'documents',   label: 'Документы',  labelShort: 'Докум.',   icon: '📄', color: '#1abc9c', isPremium: true,  component: DocumentsModule },
  { id: 'media',       label: 'Медиабанк',  labelShort: 'Медиа',    icon: '📸', color: '#e91e63', isPremium: true,  component: MediaModule },
  { id: 'items',       label: 'Вещи',       labelShort: 'Вещи',     icon: '🧸', color: '#e67e22', isPremium: true,  component: ItemsModule },
  { id: 'expenses',    label: 'Расходы',    labelShort: 'Расходы',  icon: '💰', color: '#f39c12', isPremium: true,  component: ExpensesModule },
];
