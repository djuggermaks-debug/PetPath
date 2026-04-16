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
import i18n from '../i18n';

interface ModuleEntry {
  id: string;
  label: string;
  labelShort: string;
  icon: string;
  color: string;
  isPremium: boolean;
  component: React.ComponentType<{ petId: string }>;
}

const t = (key: string) => i18n.t(key);

export const MODULE_REGISTRY: ModuleEntry[] = [
  { id: 'health',      get label() { return t('modules.health.label'); },      get labelShort() { return t('modules.health.short'); },      icon: '🩺', color: '#e74c3c', isPremium: false, component: HealthModule },
  { id: 'medications', get label() { return t('modules.medications.label'); },  get labelShort() { return t('modules.medications.short'); },  icon: '💊', color: '#e67e22', isPremium: false, component: MedicationsModule },
  { id: 'vaccines',    get label() { return t('modules.vaccines.label'); },     get labelShort() { return t('modules.vaccines.short'); },     icon: '💉', color: '#d4ac0d', isPremium: false, component: VaccinesModule },
  { id: 'allergies',   get label() { return t('modules.allergies.label'); },    get labelShort() { return t('modules.allergies.short'); },    icon: '⚠️', color: '#9b59b6', isPremium: false, component: AllergiesModule },
  { id: 'nutrition',   get label() { return t('modules.nutrition.label'); },    get labelShort() { return t('modules.nutrition.short'); },    icon: '🥣', color: '#27ae60', isPremium: true,  component: NutritionModule },
  { id: 'habits',      get label() { return t('modules.habits.label'); },       get labelShort() { return t('modules.habits.short'); },       icon: '🐾', color: '#3498db', isPremium: true,  component: HabitsModule },
  { id: 'documents',   get label() { return t('modules.documents.label'); },    get labelShort() { return t('modules.documents.short'); },    icon: '📄', color: '#1abc9c', isPremium: true,  component: DocumentsModule },
  { id: 'media',       get label() { return t('modules.media.label'); },        get labelShort() { return t('modules.media.short'); },        icon: '📸', color: '#e91e63', isPremium: true,  component: MediaModule },
  { id: 'items',       get label() { return t('modules.items.label'); },        get labelShort() { return t('modules.items.short'); },        icon: '🧸', color: '#e67e22', isPremium: true,  component: ItemsModule },
  { id: 'expenses',    get label() { return t('modules.expenses.label'); },     get labelShort() { return t('modules.expenses.short'); },     icon: '💰', color: '#f39c12', isPremium: true,  component: ExpensesModule },
];
