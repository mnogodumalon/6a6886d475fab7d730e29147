import { useMemo, useState } from 'react';
import { format, parseISO, isToday, isFuture, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichReservierungen } from '@/lib/enrich';
import type { EnrichedReservierungen } from '@/types/enriched';
import type { Tische, Reservierungen, Veranstaltungen } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDateTime, formatDate, lookupKey } from '@/lib/formatters';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  CalendarWidget,
  type CalendarEvent,
  type CalendarTone,
} from '@/components/widgets/CalendarWidget';
import {
  useRecordOverlayStack,
  RecordOverlayHost,
  RecordHeader,
  RecordOverlay,
} from '@/components/widgets/RecordView';
import { ReservierungenDetails } from '@/components/details/ReservierungenDetails';
import { VeranstaltungenDetails } from '@/components/details/VeranstaltungenDetails';
import { TischeDetails } from '@/components/details/TischeDetails';
import { ReservierungenDialog, type ReservierungenDialogDefaults } from '@/components/dialogs/ReservierungenDialog';
import { VeranstaltungenDialog, type VeranstaltungenDialogDefaults } from '@/components/dialogs/VeranstaltungenDialog';
import {
  IconCalendar,
  IconClock,
  IconUsers,
  IconAlertTriangle,
  IconPlus,
  IconCheck,
} from '@tabler/icons-react';

type OverlayItem =
  | { type: 'reservierung'; id: string }
  | { type: 'veranstaltung'; id: string }
  | { type: 'tisch'; id: string };

export default function DashboardOverview() {
  const clock = useClock();
  const {
    tische, setTische,
    reservierungen, setReservierungen,
    veranstaltungen, setVeranstaltungen,
    speisekarte,
    tischeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedReservierungen = enrichReservierungen(reservierungen, { tischeMap });

  // Dialog state
  const [resDialogOpen, setResDialogOpen] = useState(false);
  const [resDefaults, setResDefaults] = useState<ReservierungenDialogDefaults | undefined>(undefined);
  const [editingRes, setEditingRes] = useState<EnrichedReservierungen | null>(null);
  const [veranstDialogOpen, setVeranstDialogOpen] = useState(false);
  const [veranstDefaults, setVeranstDefaults] = useState<VeranstaltungenDialogDefaults | undefined>(undefined);
  const [editingVeranst, setEditingVeranst] = useState<Veranstaltungen | null>(null);
  const [addResTischId, setAddResTischId] = useState<string | undefined>(undefined);

  const overlay = useRecordOverlayStack<OverlayItem>();

  // All hooks before early returns
  const todayStr = format(clock, 'yyyy-MM-dd');

  const heuteRes = useMemo(() =>
    enrichedReservierungen.filter(r => {
      if (!r.fields.datum_uhrzeit) return false;
      return r.fields.datum_uhrzeit.startsWith(todayStr);
    }),
    [enrichedReservierungen, todayStr]
  );

  const unbestaetigt = useMemo(() =>
    enrichedReservierungen.filter(r =>
      lookupKey(r.fields.bestaetigung) === 'nicht_bestaetigt' &&
      r.fields.datum_uhrzeit &&
      isFuture(parseISO(r.fields.datum_uhrzeit))
    ),
    [enrichedReservierungen]
  );

  const kommendeTage = useMemo(() =>
    enrichedReservierungen.filter(r => {
      if (!r.fields.datum_uhrzeit) return false;
      const d = parseISO(r.fields.datum_uhrzeit);
      return isFuture(startOfDay(d)) && !isToday(d);
    }).sort((a, b) => (a.fields.datum_uhrzeit ?? '').localeCompare(b.fields.datum_uhrzeit ?? '')),
    [enrichedReservierungen]
  );

  const naechsteVeranstaltung = useMemo(() =>
    veranstaltungen
      .filter(v => v.fields.start_datum && (isFuture(parseISO(v.fields.start_datum)) || isToday(parseISO(v.fields.start_datum))))
      .sort((a, b) => (a.fields.start_datum ?? '').localeCompare(b.fields.start_datum ?? ''))[0],
    [veranstaltungen]
  );

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const resEvents: CalendarEvent[] = enrichedReservierungen
      .filter(r => !!r.fields.datum_uhrzeit)
      .map(r => {
        const key = lookupKey(r.fields.bestaetigung);
        const tone: CalendarTone =
          key === 'storniert' ? 'default' :
          key === 'nicht_bestaetigt' ? 'warning' :
          'primary';
        return {
          id: `reservierung:${r.record_id}`,
          start: r.fields.datum_uhrzeit!,
          title: `${r.fields.gast_vorname ?? ''} ${r.fields.gast_nachname ?? ''}`.trim() || 'Gast',
          subtitle: r.tischName ? `Tisch ${r.tischName}` : undefined,
          tone,
        };
      });

    const veranstEvents: CalendarEvent[] = veranstaltungen
      .filter(v => !!v.fields.start_datum)
      .map(v => {
        const key = lookupKey(v.fields.veranstaltung_status);
        const tone: CalendarTone =
          key === 'abgesagt' ? 'default' :
          key === 'bestaetigt' ? 'success' :
          'warning';
        return {
          id: `veranstaltung:${v.record_id}`,
          start: v.fields.start_datum!,
          end: v.fields.ende_datum,
          title: v.fields.veranstaltungsname ?? 'Veranstaltung',
          subtitle: v.fields.verantwortliche_person,
          tone,
        };
      });

    return [...resEvents, ...veranstEvents];
  }, [enrichedReservierungen, veranstaltungen]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Confirm a reservation optimistically
  const bestaetigeReservierung = async (r: EnrichedReservierungen) => {
    const prev = reservierungen.map(x => x);
    setReservierungen(reservierungen.map(x =>
      x.record_id === r.record_id
        ? { ...x, fields: { ...x.fields, bestaetigung: { key: 'bestaetigt', label: 'Bestätigt' } } }
        : x
    ));
    undoToast(
      `${r.fields.gast_vorname} ${r.fields.gast_nachname} bestätigt`,
      async () => {
        setReservierungen(prev);
        await LivingAppsService.updateReservierungenEntry(r.record_id, { bestaetigung: 'nicht_bestaetigt' });
      }
    );
    try {
      await LivingAppsService.updateReservierungenEntry(r.record_id, { bestaetigung: 'bestaetigt' });
    } catch {
      fetchAll();
    }
  };

  const openResCreate = (defaults?: ReservierungenDialogDefaults) => {
    setEditingRes(null);
    setResDefaults(defaults);
    setResDialogOpen(true);
  };

  const openResEdit = (r: EnrichedReservierungen) => {
    setEditingRes(r);
    setResDefaults(r.fields as ReservierungenDialogDefaults);
    setResDialogOpen(true);
  };

  // Reschedule reservation via drag
  const rescheduleRes = async (eventId: string, newStart: string, _newEnd?: string) => {
    const id = eventId.split(':')[1];
    if (!id) return;
    setReservierungen(reservierungen.map(r =>
      r.record_id === id
        ? { ...r, fields: { ...r.fields, datum_uhrzeit: newStart } }
        : r
    ));
    undoToast('Reservierung verschoben', async () => {
      const original = reservierungen.find(r => r.record_id === id);
      if (original) {
        setReservierungen(reservierungen.map(r =>
          r.record_id === id
            ? { ...r, fields: { ...r.fields, datum_uhrzeit: original.fields.datum_uhrzeit } }
            : r
        ));
        await LivingAppsService.updateReservierungenEntry(id, { datum_uhrzeit: original.fields.datum_uhrzeit });
      }
    });
    try {
      await LivingAppsService.updateReservierungenEntry(id, { datum_uhrzeit: newStart });
    } catch {
      fetchAll();
    }
  };

  // Reschedule Veranstaltung via drag
  const rescheduleVeranst = async (eventId: string, newStart: string, newEnd?: string) => {
    const id = eventId.split(':')[1];
    if (!id) return;
    setVeranstaltungen(veranstaltungen.map(v =>
      v.record_id === id
        ? { ...v, fields: { ...v.fields, start_datum: newStart, ...(newEnd ? { ende_datum: newEnd } : {}) } }
        : v
    ));
    undoToast('Veranstaltung verschoben', async () => {
      const original = veranstaltungen.find(v => v.record_id === id);
      if (original) {
        setVeranstaltungen(veranstaltungen.map(v =>
          v.record_id === id
            ? { ...v, fields: { ...v.fields, start_datum: original.fields.start_datum, ende_datum: original.fields.ende_datum } }
            : v
        ));
        await LivingAppsService.updateVeranstaltungenEntry(id, { start_datum: original.fields.start_datum, ende_datum: original.fields.ende_datum });
      }
    });
    try {
      await LivingAppsService.updateVeranstaltungenEntry(id, { start_datum: newStart, ...(newEnd ? { ende_datum: newEnd } : {}) });
    } catch {
      fetchAll();
    }
  };

  const onEventDrop = async (eventId: string, newStart: string, newEnd?: string) => {
    if (eventId.startsWith('reservierung:')) return rescheduleRes(eventId, newStart, newEnd);
    if (eventId.startsWith('veranstaltung:')) return rescheduleVeranst(eventId, newStart, newEnd);
  };

  const onEventResize = async (eventId: string, newStart: string, newEnd: string) => {
    if (eventId.startsWith('veranstaltung:')) return rescheduleVeranst(eventId, newStart, newEnd);
  };

  const contextLine = (() => {
    if (heuteRes.length === 0) {
      const next = kommendeTage[0];
      if (next) {
        const gast = `${next.fields.gast_vorname ?? ''} ${next.fields.gast_nachname ?? ''}`.trim();
        return `Heute keine Reservierungen — nächste Reservierung: ${gast}, ${formatDate(next.fields.datum_uhrzeit)}`;
      }
      return 'Heute keine Reservierungen eingetragen.';
    }
    const gaeste = heuteRes.map(r => `${r.fields.gast_vorname ?? ''} ${r.fields.gast_nachname ?? ''}`.trim()).filter(Boolean);
    return `Heute ${heuteRes.length} ${heuteRes.length === 1 ? 'Reservierung' : 'Reservierungen'} — ${namen(gaeste)}`;
  })();

  const heroRes = unbestaetigt.slice(0, 3);

  // Overlay helpers
  const getResById = (id: string) => enrichedReservierungen.find(r => r.record_id === id);
  const getVeranstById = (id: string) => veranstaltungen.find(v => v.record_id === id);
  const getTischById = (id: string) => tische.find(t => t.record_id === id);

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{contextLine}</p>
        </div>
        <Button onClick={() => openResCreate()} className="shrink-0">
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Reservierung
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroRes.length > 0 && (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{
              label: `Alle ${heroRes.length} bestätigen`,
              onClick: async () => {
                for (const r of heroRes) await bestaetigeReservierung(r);
              }
            }}
          >
            <b>{namen(heroRes.map(r => `${r.fields.gast_vorname ?? ''} ${r.fields.gast_nachname ?? ''}`.trim()))}</b>
            {' '}
            {heroRes.length === 1 ? 'wartet noch auf Bestätigung' : 'warten noch auf Bestätigung'}.
          </HeroBanner>
        )}
        kpis={
          <StatStrip>
            <StatStripItem
              title="Heute"
              value={heuteRes.length}
              icon={<IconCalendar size={16} />}
              tone={heuteRes.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title="Unbestätigt"
              value={unbestaetigt.length}
              icon={<IconClock size={16} />}
              tone={unbestaetigt.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title="Tische verfügbar"
              value={tische.filter(t => lookupKey(t.fields.status) === 'verfuegbar').length}
              icon={<IconUsers size={16} />}
              tone={tische.filter(t => lookupKey(t.fields.status) === 'verfuegbar').length === 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title="Nächste Veranstaltung"
              value={naechsteVeranstaltung ? naechsteVeranstaltung.fields.veranstaltungsname ?? '—' : '—'}
              icon={<IconCalendar size={16} />}
              tone={naechsteVeranstaltung ? 'success' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={calendarEvents}
            locale={de}
            defaultView="week"
            onEventClick={ev => {
              const [type, id] = ev.id.split(':');
              if (type === 'reservierung' && id) overlay.replace({ type: 'reservierung', id });
              if (type === 'veranstaltung' && id) overlay.replace({ type: 'veranstaltung', id });
            }}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
            onEmptyClick={date => {
              openResCreate({ datum_uhrzeit: format(date, "yyyy-MM-dd'T'HH:mm") });
            }}
            onRangeCreate={(start, end) => {
              // Veranstaltungen have start+end; Reservierungen have single datetime.
              // Range-create opens Veranstaltung dialog with start+end prefilled.
              setEditingVeranst(null);
              setVeranstDefaults({
                start_datum: format(start, "yyyy-MM-dd'T'HH:mm"),
                ende_datum: format(end, "yyyy-MM-dd'T'HH:mm"),
              });
              setVeranstDialogOpen(true);
            }}
          />
        }
        aside={
          <>
            <WorkList
              title="Unbestätigt"
              items={unbestaetigt.slice(0, 8).map(r => ({
                id: r.record_id,
                title: `${r.fields.gast_vorname ?? ''} ${r.fields.gast_nachname ?? ''}`.trim() || 'Gast',
                secondLine: (
                  <>
                    <span className="font-medium text-warning">{r.fields.personenanzahl} Pers.</span>
                    <span className="text-muted-foreground"> · {formatDateTime(r.fields.datum_uhrzeit)}</span>
                    {r.tischName && <span className="text-muted-foreground"> · Tisch {r.tischName}</span>}
                  </>
                ),
                action: {
                  label: '✓',
                  onClick: () => bestaetigeReservierung(r),
                },
              }))}
              onItemClick={id => overlay.replace({ type: 'reservierung', id })}
              empty={{
                text: 'Alle Reservierungen bestätigt',
                action: { label: 'Neue Reservierung', onClick: () => openResCreate() },
              }}
            />
            <WorkList
              title="Kommende Reservierungen"
              items={kommendeTage.slice(0, 6).map(r => ({
                id: r.record_id,
                title: `${r.fields.gast_vorname ?? ''} ${r.fields.gast_nachname ?? ''}`.trim() || 'Gast',
                secondLine: (
                  <>
                    <span className="font-medium text-foreground">{r.fields.personenanzahl} Pers.</span>
                    <span className="text-muted-foreground"> · {formatDateTime(r.fields.datum_uhrzeit)}</span>
                  </>
                ),
              }))}
              onItemClick={id => overlay.replace({ type: 'reservierung', id })}
              empty={{
                text: kommendeTage.length === 0 ? 'Keine weiteren Reservierungen — neue anlegen' : 'Alles angezeigt',
                action: { label: 'Reservierung anlegen', onClick: () => openResCreate() },
              }}
            />
          </>
        }
      />

      {/* Overlay stack */}
      <RecordOverlayHost
        overlay={overlay}
        render={top => {
          if (top.type === 'reservierung') {
            const r = getResById(top.id);
            if (!r) return null;
            const gast = `${r.fields.gast_vorname ?? ''} ${r.fields.gast_nachname ?? ''}`.trim() || 'Gast';
            return (
              <>
                <RecordHeader
                  title={gast}
                  subtitle={r.tischName ? `Tisch ${r.tischName}` : undefined}
                  meta={formatDateTime(r.fields.datum_uhrzeit)}
                  badges={
                    r.fields.bestaetigung ? (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        lookupKey(r.fields.bestaetigung) === 'bestaetigt' ? 'bg-success/15 text-success' :
                        lookupKey(r.fields.bestaetigung) === 'storniert' ? 'bg-muted text-muted-foreground' :
                        'bg-warning/15 text-warning'
                      }`}>
                        {r.fields.bestaetigung.label}
                      </span>
                    ) : undefined
                  }
                />
                <ReservierungenDetails
                  record={r}
                  tischeList={tische}
                  onOpenTische={t => overlay.push({ type: 'tisch', id: t.record_id })}
                />
              </>
            );
          }
          if (top.type === 'veranstaltung') {
            const v = getVeranstById(top.id);
            if (!v) return null;
            return (
              <>
                <RecordHeader
                  title={v.fields.veranstaltungsname ?? 'Veranstaltung'}
                  subtitle={v.fields.verantwortliche_person}
                  meta={`${formatDateTime(v.fields.start_datum)}${v.fields.ende_datum ? ` – ${formatDateTime(v.fields.ende_datum)}` : ''}`}
                />
                <VeranstaltungenDetails record={v} />
              </>
            );
          }
          if (top.type === 'tisch') {
            const t = getTischById(top.id);
            if (!t) return null;
            return (
              <>
                <RecordHeader
                  title={`Tisch ${t.fields.tischnummer ?? ''}`}
                  subtitle={t.fields.bereich?.label}
                  meta={`${t.fields.kapazitaet ?? '?'} Sitzplätze`}
                />
                <TischeDetails
                  record={t}
                  reservierungenList={reservierungen}
                  onOpenReservierungen={r => overlay.push({ type: 'reservierung', id: r.record_id })}
                  onAddReservierungen={() => {
                    overlay.close();
                    openResCreate({ tisch: t.record_id });
                  }}
                />
              </>
            );
          }
          return null;
        }}
        footer={top => {
          if (top.type === 'reservierung') {
            const r = getResById(top.id);
            if (!r) return null;
            const key = lookupKey(r.fields.bestaetigung);
            if (key === 'nicht_bestaetigt') {
              return {
                label: '✓ Bestätigen',
                onClick: () => {
                  bestaetigeReservierung(r);
                  overlay.close();
                },
              };
            }
            return {
              label: 'Bearbeiten',
              onClick: () => {
                overlay.close();
                openResEdit(r);
              },
            };
          }
          if (top.type === 'veranstaltung') {
            const v = getVeranstById(top.id);
            if (!v) return null;
            const key = lookupKey(v.fields.veranstaltung_status);
            if (key === 'geplant') {
              return {
                label: 'Veranstaltung bestätigen',
                onClick: async () => {
                  const prev = veranstaltungen.map(x => x);
                  setVeranstaltungen(veranstaltungen.map(x =>
                    x.record_id === v.record_id
                      ? { ...x, fields: { ...x.fields, veranstaltung_status: { key: 'bestaetigt', label: 'Bestätigt' } } }
                      : x
                  ));
                  undoToast('Veranstaltung bestätigt', async () => {
                    setVeranstaltungen(prev);
                    await LivingAppsService.updateVeranstaltungenEntry(v.record_id, { veranstaltung_status: 'geplant' });
                  });
                  try {
                    await LivingAppsService.updateVeranstaltungenEntry(v.record_id, { veranstaltung_status: 'bestaetigt' });
                  } catch {
                    fetchAll();
                  }
                  overlay.close();
                },
              };
            }
          }
          return undefined;
        }}
        onEdit={top => {
          if (top.type === 'reservierung') {
            const r = getResById(top.id);
            if (r) { overlay.close(); openResEdit(r); }
          }
          if (top.type === 'veranstaltung') {
            const v = getVeranstById(top.id);
            if (v) {
              overlay.close();
              setEditingVeranst(v);
              setVeranstDefaults(v.fields as VeranstaltungenDialogDefaults);
              setVeranstDialogOpen(true);
            }
          }
        }}
      />

      {/* Dialogs */}
      <ReservierungenDialog
        open={resDialogOpen}
        onClose={() => { setResDialogOpen(false); setEditingRes(null); setResDefaults(undefined); setAddResTischId(undefined); }}
        onSubmit={async fields => {
          if (editingRes) {
            await LivingAppsService.updateReservierungenEntry(editingRes.record_id, fields);
          } else {
            await LivingAppsService.createReservierungenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={resDefaults}
        recordId={editingRes?.record_id}
        tischeList={tische}
        enablePhotoScan={AI_PHOTO_SCAN['Reservierungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Reservierungen']}
      />

      <VeranstaltungenDialog
        open={veranstDialogOpen}
        onClose={() => { setVeranstDialogOpen(false); setEditingVeranst(null); setVeranstDefaults(undefined); }}
        onSubmit={async fields => {
          if (editingVeranst) {
            await LivingAppsService.updateVeranstaltungenEntry(editingVeranst.record_id, fields);
          } else {
            await LivingAppsService.createVeranstaltungenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={veranstDefaults}
        recordId={editingVeranst?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Veranstaltungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Veranstaltungen']}
      />
    </>
  );
}
