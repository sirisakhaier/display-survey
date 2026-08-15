/**
 * Normalizes raw category names from CSV imports to standardized full names
 */
export const CATEGORY_MAP: Record<string, string> = {
  // Refrigerator
  'rf': 'Refrigerator',
  'refrigerator': 'Refrigerator',
  'ตู้เย็น': 'Refrigerator',

  // Washing machine
  'wm': 'Washing machine',
  'washing machine': 'Washing machine',
  'เครื่องซักผ้า': 'Washing machine',

  // Television
  'tv': 'Television',
  'television': 'Television',
  'ทีวี': 'Television',

  // Freezer
  'fz': 'Freezer',
  'freezer': 'Freezer',
  'ตู้แช่': 'Freezer',

  // Water heater
  'wh': 'Water heater',
  'water heater': 'Water heater',
  'เครื่องทำน้ำอุ่น': 'Water heater',

  // Water dispenser
  'water dispenser': 'Water dispenser',
  'ตู้กดน้ำ': 'Water dispenser',

  // Air conditioner
  'ac': 'Air conditioner',
  'air conditioner': 'Air conditioner',
  'เครื่องปรับอากาศ': 'Air conditioner',
};

export function normalizeCategory(rawCat: string | null | undefined): string {
  if (!rawCat) return 'Other';
  const trimmed = rawCat.trim();
  const lower = trimmed.toLowerCase();
  
  if (CATEGORY_MAP[lower]) {
    return CATEGORY_MAP[lower];
  }

  // Handle fuzzy matches
  if (lower.startsWith('refrig') || lower === 'rf') return 'Refrigerator';
  if (lower.startsWith('wash') || lower === 'wm') return 'Washing machine';
  if (lower.startsWith('tele') || lower === 'tv') return 'Television';
  if (lower.startsWith('freez') || lower === 'fz') return 'Freezer';
  if (lower.startsWith('water heat') || lower === 'wh') return 'Water heater';
  if (lower.startsWith('water disp')) return 'Water dispenser';
  if (lower === 'ac' || lower.startsWith('air cond') || lower.startsWith('air')) return 'Air conditioner';

  return trimmed;
}

export function cleanSubCategory(rawSub: string | null | undefined): string {
  if (!rawSub) return '';
  const trimmed = rawSub.trim();
  if (trimmed === '!n/a' || trimmed === '#N/A' || trimmed === 'N/A' || trimmed === 'n/a' || trimmed === '-') {
    return '';
  }
  return trimmed;
}
