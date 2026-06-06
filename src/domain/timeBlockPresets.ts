import type { Locale, Priority } from './types'

export type TimeBlockPreset = {
  key: string
  label: Record<Locale, string>
  category: string
  colorToken: string
  priority: Priority
}

export const timeBlockPresets: TimeBlockPreset[] = [
  {
    key: 'wakeUp',
    label: { pl: 'Wake-up', en: 'Wake-up' },
    category: 'wakeUp',
    colorToken: '#FFD166',
    priority: 'medium',
  },
  {
    key: 'deepFocus',
    label: { pl: 'Deep Focus', en: 'Deep Focus' },
    category: 'deepFocus',
    colorToken: '#00E5FF',
    priority: 'high',
  },
  {
    key: 'growth',
    label: { pl: 'Rozwój', en: 'Growth' },
    category: 'growth',
    colorToken: '#D4AF37',
    priority: 'high',
  },
  {
    key: 'creative',
    label: { pl: 'Kreatywność', en: 'Creative' },
    category: 'creative',
    colorToken: '#FF8BD1',
    priority: 'medium',
  },
  {
    key: 'admin',
    label: { pl: 'Administracja', en: 'Admin' },
    category: 'admin',
    colorToken: '#8B8BA7',
    priority: 'medium',
  },
  {
    key: 'communication',
    label: { pl: 'Komunikacja', en: 'Communication' },
    category: 'communication',
    colorToken: '#7DD3FC',
    priority: 'medium',
  },
  {
    key: 'movement',
    label: { pl: 'Ruch', en: 'Movement' },
    category: 'movement',
    colorToken: '#2DD4BF',
    priority: 'medium',
  },
  {
    key: 'recovery',
    label: { pl: 'Regeneracja', en: 'Recovery' },
    category: 'recovery',
    colorToken: '#4ADE80',
    priority: 'low',
  },
  {
    key: 'relationship',
    label: { pl: 'Relacje', en: 'Relationships' },
    category: 'relationship',
    colorToken: '#C084FC',
    priority: 'medium',
  },
  {
    key: 'learning',
    label: { pl: 'Nauka', en: 'Learning' },
    category: 'learning',
    colorToken: '#38BDF8',
    priority: 'high',
  },
  {
    key: 'buffer',
    label: { pl: 'Bufor', en: 'Buffer' },
    category: 'buffer',
    colorToken: '#FBBF24',
    priority: 'low',
  },
  {
    key: 'shutdown',
    label: { pl: 'Shutdown', en: 'Shutdown' },
    category: 'shutdown',
    colorToken: '#A78BFA',
    priority: 'low',
  },
]

export const brandColorOptions: Array<{ value: string; label: Record<Locale, string> }> = [
  { value: '#22C55E', label: { pl: 'Zielony', en: 'Green' } },
  { value: '#FBBF24', label: { pl: 'Żółty', en: 'Yellow' } },
  { value: '#EF4444', label: { pl: 'Czerwony', en: 'Red' } },
  { value: '#00E5FF', label: { pl: 'Cyan', en: 'Cyan' } },
  { value: '#A78BFA', label: { pl: 'Fiolet', en: 'Violet' } },
  { value: '#F97316', label: { pl: 'Pomarańczowy', en: 'Orange' } },
  { value: '#3B82F6', label: { pl: 'Niebieski', en: 'Blue' } },
  { value: '#8B8BA7', label: { pl: 'Grafit', en: 'Graphite' } },
]

export function getPresetByCategory(category: string) {
  return timeBlockPresets.find((preset) => preset.category === category || preset.key === category)
}
