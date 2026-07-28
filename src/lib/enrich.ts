import type { EnrichedReservierungen } from '@/types/enriched';
import type { Reservierungen, Tische } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface ReservierungenMaps {
  tischeMap: Map<string, Tische>;
}

export function enrichReservierungen(
  reservierungen: Reservierungen[],
  maps: ReservierungenMaps
): EnrichedReservierungen[] {
  return reservierungen.map(r => ({
    ...r,
    tischName: resolveDisplay(r.fields.tisch, maps.tischeMap, 'tischnummer'),
  }));
}
