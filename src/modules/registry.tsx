import React from 'react';

interface ModuleEntry {
  id: string;
  label: string;
  labelShort: string;
  icon: string;
  color: string;
  isPremium: boolean;
  component: React.ComponentType<{ petId: string }>;
}

const PlaceholderModule = ({ label }: { petId: string; label: string }) => (
  <div style={{ padding: '24px 16px', color: '#9c8878', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
    <p style={{ fontSize: 14 }}>Раздел «{label}» — скоро здесь появятся записи</p>
    <p style={{ fontSize: 12, marginTop: 8, opacity: 0.6 }}>Напишите что-нибудь внизу</p>
  </div>
);

export const MODULE_REGISTRY: ModuleEntry[] = [
  {
    id: 'health',
    label: 'Здоровье',
    labelShort: 'Здоров.',
    icon: '🩺',
    color: '#e74c3c',
    isPremium: false,
    component: (props) => <PlaceholderModule {...props} label="Здоровье" />,
  },
  {
    id: 'medications',
    label: 'Лекарства',
    labelShort: 'Лекарст.',
    icon: '💊',
    color: '#e67e22',
    isPremium: false,
    component: (props) => <PlaceholderModule {...props} label="Лекарства" />,
  },
  {
    id: 'vaccines',
    label: 'Прививки',
    labelShort: 'Привив.',
    icon: '💉',
    color: '#d4ac0d',
    isPremium: false,
    component: (props) => <PlaceholderModule {...props} label="Прививки" />,
  },
  {
    id: 'allergies',
    label: 'Аллергии',
    labelShort: 'Аллерг.',
    icon: '⚠️',
    color: '#9b59b6',
    isPremium: false,
    component: (props) => <PlaceholderModule {...props} label="Аллергии" />,
  },
  {
    id: 'nutrition',
    label: 'Питание',
    labelShort: 'Питание',
    icon: '🥣',
    color: '#27ae60',
    isPremium: true,
    component: (props) => <PlaceholderModule {...props} label="Питание" />,
  },
  {
    id: 'habits',
    label: 'Привычки',
    labelShort: 'Привыч.',
    icon: '🐾',
    color: '#3498db',
    isPremium: true,
    component: (props) => <PlaceholderModule {...props} label="Привычки" />,
  },
  {
    id: 'documents',
    label: 'Документы',
    labelShort: 'Докум.',
    icon: '📄',
    color: '#1abc9c',
    isPremium: true,
    component: (props) => <PlaceholderModule {...props} label="Документы" />,
  },
  {
    id: 'media',
    label: 'Медиабанк',
    labelShort: 'Медиа',
    icon: '📸',
    color: '#e91e63',
    isPremium: true,
    component: (props) => <PlaceholderModule {...props} label="Медиабанк" />,
  },
];
