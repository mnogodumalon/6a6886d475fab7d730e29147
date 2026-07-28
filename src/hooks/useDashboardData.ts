import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Tische, Reservierungen, Veranstaltungen, Speisekarte } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

/** Dashboard data + the OPTIMISTIC-WRITE API.
 *
 *  The per-entity setters (`set<Entity>`) are exported for exactly one job:
 *  optimistic updates on drag writes (onEventDrop / onEventResize /
 *  onCardMove). Call the setter FIRST — the bar/card lands instantly — then
 *  fire the PATCH in the background and call `fetchAll()` ONLY in the catch.
 *  Never await the PATCH before updating state (the UI freezes for the full
 *  round-trip on every drag) and never refetch after a successful write.
 *  There is no other mechanism (no `__optimistic`, no `mutate`).
 */
export function useDashboardData() {
  const [tische, setTische] = useState<Tische[]>([]);
  const [reservierungen, setReservierungen] = useState<Reservierungen[]>([]);
  const [veranstaltungen, setVeranstaltungen] = useState<Veranstaltungen[]>([]);
  const [speisekarte, setSpeisekarte] = useState<Speisekarte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [tischeData, reservierungenData, veranstaltungenData, speisekarteData] = await Promise.all([
        LivingAppsService.getTische(),
        LivingAppsService.getReservierungen(),
        LivingAppsService.getVeranstaltungen(),
        LivingAppsService.getSpeisekarte(),
      ]);
      setTische(tischeData);
      setReservierungen(reservierungenData);
      setVeranstaltungen(veranstaltungenData);
      setSpeisekarte(speisekarteData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [tischeData, reservierungenData, veranstaltungenData, speisekarteData] = await Promise.all([
          LivingAppsService.getTische(),
          LivingAppsService.getReservierungen(),
          LivingAppsService.getVeranstaltungen(),
          LivingAppsService.getSpeisekarte(),
        ]);
        setTische(tischeData);
        setReservierungen(reservierungenData);
        setVeranstaltungen(veranstaltungenData);
        setSpeisekarte(speisekarteData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const tischeMap = useMemo(() => {
    const m = new Map<string, Tische>();
    tische.forEach(r => m.set(r.record_id, r));
    return m;
  }, [tische]);

  return { tische, setTische, reservierungen, setReservierungen, veranstaltungen, setVeranstaltungen, speisekarte, setSpeisekarte, loading, error, fetchAll, tischeMap };
}