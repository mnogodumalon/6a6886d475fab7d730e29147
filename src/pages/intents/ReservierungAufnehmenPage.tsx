/**
 * Reservierung aufnehmen — 3-Schritt-Wizard.
 * Steps: 1) Datum & Gäste wählen → 2) Tisch auswählen → 3) Gastdaten & Bestätigung.
 * Reads: tische (via useDashboardData). Writes: reservierungen (createReservierungenEntry).
 * Composes: IntentWizardShell, StatusBadge.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Tische } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import {
  IconCalendarPlus,
  IconUsers,
  IconArmchair2,
  IconCheck,
  IconMapPin,
  IconAlertCircle,
  IconRefresh,
} from '@tabler/icons-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTimeDisplay(dt: string): string {
  if (!dt) return '—';
  try {
    const d = new Date(dt);
    return d.toLocaleString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

// Default datetime: tomorrow at 19:00
function defaultDatetime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Step 1: Datum & Gäste ────────────────────────────────────────────────────

interface Step1Props {
  datumUhrzeit: string;
  personenanzahl: number;
  onDatumChange: (v: string) => void;
  onPersonenChange: (v: number) => void;
  onWeiter: () => void;
}

function Step1DatumGaeste({ datumUhrzeit, personenanzahl, onDatumChange, onPersonenChange, onWeiter }: Step1Props) {
  const isValid = datumUhrzeit.trim().length > 0 && personenanzahl >= 1;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-foreground">Wann & Wieviele?</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Wähle Datum, Uhrzeit und Gästezahl.</p>
        </div>
        <div className="p-5 space-y-5">
          {/* Datum & Uhrzeit */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="datum-input">
              Datum &amp; Uhrzeit
            </label>
            <input
              id="datum-input"
              type="datetime-local"
              value={datumUhrzeit}
              onChange={e => onDatumChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground"
            />
          </div>

          {/* Personenanzahl */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="personen-input">
              Anzahl Gäste
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onPersonenChange(Math.max(1, personenanzahl - 1))}
                className="w-10 h-10 rounded-lg border border-input bg-background flex items-center justify-center text-lg font-semibold text-foreground hover:bg-secondary transition-colors"
                aria-label="Weniger"
              >
                −
              </button>
              <Input
                id="personen-input"
                type="number"
                min={1}
                max={50}
                value={personenanzahl}
                onChange={e => onPersonenChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 text-center font-semibold text-lg"
              />
              <button
                type="button"
                onClick={() => onPersonenChange(personenanzahl + 1)}
                className="w-10 h-10 rounded-lg border border-input bg-background flex items-center justify-center text-lg font-semibold text-foreground hover:bg-secondary transition-colors"
                aria-label="Mehr"
              >
                +
              </button>
              <span className="text-sm text-muted-foreground">
                {personenanzahl === 1 ? 'Person' : 'Personen'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live summary */}
      {isValid && (
        <div className="rounded-2xl border bg-secondary/50 overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconCalendarPlus size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{formatDateTimeDisplay(datumUhrzeit)}</p>
              <p className="text-xs text-muted-foreground">{personenanzahl} {personenanzahl === 1 ? 'Person' : 'Personen'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onWeiter} disabled={!isValid} size="lg" className="w-full sm:w-auto">
          Weiter zur Tischauswahl
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: Tischauswahl ─────────────────────────────────────────────────────

interface Step2Props {
  tische: Tische[];
  personenanzahl: number;
  selectedTischId: string | null;
  onSelectTisch: (id: string) => void;
  onZurueck: () => void;
  onWeiter: () => void;
}

function Step2Tischauswahl({ tische, personenanzahl, selectedTischId, onSelectTisch, onZurueck, onWeiter }: Step2Props) {
  const [search, setSearch] = useState('');

  const passendeTische = tische.filter(t => (t.fields.kapazitaet ?? 0) >= personenanzahl);
  const gefiltert = passendeTische.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (t.fields.tischnummer ?? '').toLowerCase().includes(q) ||
      (t.fields.bereich?.label ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-5 border-b">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-foreground">Tisch wählen</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {passendeTische.length} von {tische.length} {tische.length === 1 ? 'Tisch' : 'Tischen'} verfügbar für {personenanzahl} {personenanzahl === 1 ? 'Person' : 'Personen'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <IconUsers size={14} />
              <span>mind. {personenanzahl} Plätze</span>
            </div>
          </div>
        </div>
        <div className="p-3">
          <Input
            type="search"
            placeholder="Tisch suchen …"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* No matching tables */}
      {passendeTische.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <IconAlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Kein passender Tisch</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Es gibt keinen Tisch mit mindestens {personenanzahl} Plätzen. Bitte gehe zurück und passe die Gästezahl an oder füge über die Tischverwaltung einen Tisch hinzu.
            </p>
          </div>
        </div>
      )}

      {/* Table grid */}
      {gefiltert.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {gefiltert.map(tisch => {
            const isSelected = selectedTischId === tisch.record_id;
            return (
              <button
                key={tisch.record_id}
                type="button"
                onClick={() => onSelectTisch(tisch.record_id)}
                className={`rounded-2xl border p-4 text-left transition-all overflow-hidden ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                    : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {isSelected ? <IconCheck size={16} stroke={2.5} /> : <IconArmchair2 size={16} />}
                    </div>
                    <span className="text-xl font-bold text-foreground truncate">{tisch.fields.tischnummer ?? '—'}</span>
                  </div>
                  <StatusBadge statusKey={tisch.fields.status?.key} label={tisch.fields.status?.label} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <IconMapPin size={12} />
                  <span className="truncate">{tisch.fields.bereich?.label ?? '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconUsers size={12} />
                  <span>{tisch.fields.kapazitaet ?? '?'} Plätze</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {gefiltert.length === 0 && passendeTische.length > 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Keine Tische für diese Suche gefunden.</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={onZurueck}>
          Zurück
        </Button>
        <Button onClick={onWeiter} disabled={!selectedTischId} size="lg" className="flex-1 sm:flex-none sm:w-auto">
          Weiter zu Gastdaten
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Gastdaten & Bestätigung ─────────────────────────────────────────

interface GastFormData {
  gast_vorname: string;
  gast_nachname: string;
  gast_telefon: string;
  gast_email: string;
  anlass: string;
  bemerkungen_reservierung: string;
}

interface Step3Props {
  datumUhrzeit: string;
  personenanzahl: number;
  selectedTisch: Tische | null;
  onZurueck: () => void;
  onSuccess: (reservierungId: string, gastForm: GastFormData) => void;
}

function Step3Gastdaten({ datumUhrzeit, personenanzahl, selectedTisch, onZurueck, onSuccess }: Step3Props) {
  const [form, setForm] = useState<GastFormData>({
    gast_vorname: '',
    gast_nachname: '',
    gast_telefon: '',
    gast_email: '',
    anlass: '',
    bemerkungen_reservierung: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = (key: keyof GastFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const isValid = form.gast_vorname.trim().length > 0 && form.gast_nachname.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || !selectedTisch) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await LivingAppsService.createReservierungenEntry({
        datum_uhrzeit: datumUhrzeit,
        personenanzahl,
        tisch: createRecordUrl(APP_IDS.TISCHE, selectedTisch.record_id),
        gast_vorname: form.gast_vorname.trim(),
        gast_nachname: form.gast_nachname.trim(),
        gast_telefon: form.gast_telefon.trim() || undefined,
        gast_email: form.gast_email.trim() || undefined,
        anlass: form.anlass.trim() || undefined,
        bestaetigung: 'nicht_bestaetigt',
        bemerkungen_reservierung: form.bemerkungen_reservierung.trim() || undefined,
      });
      // Extract new record id from response (object, not array)
      const entries = Object.entries(result as Record<string, unknown>);
      const newId = entries.length > 0 ? (entries[0][0] as string) : 'unbekannt';
      onSuccess(newId, form);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Anlegen der Reservierung.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 rounded-2xl border bg-card overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-foreground">Gastdaten</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Pflichtfelder: Vor- und Nachname</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="vorname">
                  Vorname <span className="text-destructive">*</span>
                </label>
                <Input
                  id="vorname"
                  value={form.gast_vorname}
                  onChange={update('gast_vorname')}
                  placeholder="z. B. Maria"
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="nachname">
                  Nachname <span className="text-destructive">*</span>
                </label>
                <Input
                  id="nachname"
                  value={form.gast_nachname}
                  onChange={update('gast_nachname')}
                  placeholder="z. B. Müller"
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="telefon">
                  Telefon
                </label>
                <Input
                  id="telefon"
                  type="tel"
                  value={form.gast_telefon}
                  onChange={update('gast_telefon')}
                  placeholder="z. B. 0151 23456789"
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  E-Mail
                </label>
                <Input
                  id="email"
                  type="email"
                  value={form.gast_email}
                  onChange={update('gast_email')}
                  placeholder="z. B. maria@beispiel.de"
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="anlass">
                Anlass <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <Input
                id="anlass"
                value={form.anlass}
                onChange={update('anlass')}
                placeholder="z. B. Geburtstag, Geschäftsessen …"
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="bemerkungen">
                Bemerkungen <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <textarea
                id="bemerkungen"
                value={form.bemerkungen_reservierung}
                onChange={update('bemerkungen_reservierung')}
                placeholder="Besondere Wünsche, Allergien, Hinweise …"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-3">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold text-foreground">Zusammenfassung</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconCalendarPlus size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Datum &amp; Uhrzeit</p>
                  <p className="text-sm font-medium text-foreground truncate">{formatDateTimeDisplay(datumUhrzeit)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconUsers size={16} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Personen</p>
                  <p className="text-sm font-medium text-foreground">{personenanzahl} {personenanzahl === 1 ? 'Person' : 'Personen'}</p>
                </div>
              </div>
              {selectedTisch && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconArmchair2 size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Tisch</p>
                    <p className="text-sm font-medium text-foreground truncate">
                      Tisch {selectedTisch.fields.tischnummer ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedTisch.fields.bereich?.label ?? '—'} · {selectedTisch.fields.kapazitaet ?? '?'} Plätze
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {submitError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2">
              <IconAlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{submitError}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={onZurueck} disabled={submitting}>
          Zurück
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          size="lg"
          className="flex-1 sm:flex-none sm:w-auto"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <IconRefresh size={16} className="animate-spin" />
              Reservierung wird angelegt …
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <IconCheck size={16} />
              Reservierung anlegen
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Success State ────────────────────────────────────────────────────────────

interface SuccessProps {
  datumUhrzeit: string;
  personenanzahl: number;
  selectedTisch: Tische | null;
  gastForm: GastFormData;
  onNeu: () => void;
}

function SuccessPanel({ datumUhrzeit, personenanzahl, selectedTisch, gastForm, onNeu }: SuccessProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-green-200 bg-green-50 overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-100 border border-green-200 flex items-center justify-center mx-auto mb-4">
            <IconCheck size={28} className="text-green-600" stroke={2.5} />
          </div>
          <h2 className="text-xl font-bold text-green-900 mb-1">Reservierung angelegt!</h2>
          <p className="text-sm text-green-700">
            Die Reservierung für {gastForm.gast_vorname} {gastForm.gast_nachname} wurde erfolgreich gespeichert.
          </p>
        </div>
        <div className="border-t border-green-200 bg-green-50/80 p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-green-700 font-medium uppercase tracking-wide mb-0.5">Datum &amp; Uhrzeit</p>
              <p className="text-green-900 font-medium">{formatDateTimeDisplay(datumUhrzeit)}</p>
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium uppercase tracking-wide mb-0.5">Personen</p>
              <p className="text-green-900 font-medium">{personenanzahl} {personenanzahl === 1 ? 'Person' : 'Personen'}</p>
            </div>
            {selectedTisch && (
              <div>
                <p className="text-xs text-green-700 font-medium uppercase tracking-wide mb-0.5">Tisch</p>
                <p className="text-green-900 font-medium">
                  Tisch {selectedTisch.fields.tischnummer ?? '—'} · {selectedTisch.fields.bereich?.label ?? '—'}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-green-700 font-medium uppercase tracking-wide mb-0.5">Gast</p>
              <p className="text-green-900 font-medium">{gastForm.gast_vorname} {gastForm.gast_nachname}</p>
              {gastForm.gast_telefon && <p className="text-green-700 text-xs">{gastForm.gast_telefon}</p>}
              {gastForm.gast_email && <p className="text-green-700 text-xs">{gastForm.gast_email}</p>}
            </div>
            {gastForm.anlass && (
              <div className="sm:col-span-2">
                <p className="text-xs text-green-700 font-medium uppercase tracking-wide mb-0.5">Anlass</p>
                <p className="text-green-900 font-medium">{gastForm.anlass}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onNeu} size="lg" className="flex-1 sm:flex-none">
          <IconCalendarPlus size={16} className="mr-2" />
          Neue Reservierung anlegen
        </Button>
        <a
          href="#/"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-6 transition-colors"
        >
          Zurück zum Dashboard
        </a>
      </div>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────

export default function ReservierungAufnehmenPage() {
  const { tische, loading, error, fetchAll } = useDashboardData();
  const [searchParams] = useSearchParams();

  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [datumUhrzeit, setDatumUhrzeit] = useState<string>(defaultDatetime());
  const [personenanzahl, setPersonenanzahl] = useState<number>(2);
  const [selectedTischId, setSelectedTischId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successGastForm, setSuccessGastForm] = useState<GastFormData | null>(null);

  // Deep-linking: pre-select tischId from URL, step from URL
  useEffect(() => {
    const tischIdParam = searchParams.get('tischId');
    if (tischIdParam) {
      setSelectedTischId(tischIdParam);
    }
    const stepParam = parseInt(searchParams.get('step') ?? '', 10);
    if (stepParam >= 1 && stepParam <= 3) {
      setStep(stepParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ALL hooks before early returns (Rules of Hooks satisfied above)

  const selectedTisch = tische.find(t => t.record_id === selectedTischId) ?? null;

  const handleReset = () => {
    setStep(1);
    setDatumUhrzeit(defaultDatetime());
    setPersonenanzahl(2);
    setSelectedTischId(null);
    setSuccess(false);
    setSuccessGastForm(null);
  };

  if (success && successGastForm) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6 px-4">
        <div>
          <a href="#/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            ← Zurück zum Dashboard
          </a>
          <h1 className="text-2xl font-bold tracking-tight">Reservierung aufnehmen</h1>
        </div>
        <SuccessPanel
          datumUhrzeit={datumUhrzeit}
          personenanzahl={personenanzahl}
          selectedTisch={selectedTisch}
          gastForm={successGastForm}
          onNeu={handleReset}
        />
      </div>
    );
  }

  return (
    <IntentWizardShell
      title="Reservierung aufnehmen"
      subtitle="Tisch in 3 Schritten reservieren"
      steps={[
        { label: 'Datum & Gäste' },
        { label: 'Tisch wählen' },
        { label: 'Gastdaten' },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {step === 1 && (
        <Step1DatumGaeste
          datumUhrzeit={datumUhrzeit}
          personenanzahl={personenanzahl}
          onDatumChange={setDatumUhrzeit}
          onPersonenChange={setPersonenanzahl}
          onWeiter={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Step2Tischauswahl
          tische={tische}
          personenanzahl={personenanzahl}
          selectedTischId={selectedTischId}
          onSelectTisch={setSelectedTischId}
          onZurueck={() => setStep(1)}
          onWeiter={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <Step3Gastdaten
          datumUhrzeit={datumUhrzeit}
          personenanzahl={personenanzahl}
          selectedTisch={selectedTisch}
          onZurueck={() => setStep(2)}
          onSuccess={(_id, gastForm) => {
            setSuccessGastForm(gastForm);
            setSuccess(true);
            fetchAll();
          }}
        />
      )}
    </IntentWizardShell>
  );
}
