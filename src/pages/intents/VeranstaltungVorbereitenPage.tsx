/**
 * Veranstaltung vorbereiten — 3-Schritt-Wizard.
 * Steps: 1) Veranstaltung wählen → 2) Tische zuordnen → 3) Status setzen & abschließen.
 * Reads: veranstaltungen, tische. Writes: veranstaltungen (updateVeranstaltungenEntry), tische (updateTischeEntry).
 * Composes: IntentWizardShell, EntitySelectStep, StatusBadge.
 * Note: BudgetTracker not used (it's currency-oriented); capacity progress rendered inline.
 * Tisch status keys from LOOKUP_OPTIONS: verfuegbar | reserviert | gesperrt (NOT 'belegt').
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import type { Veranstaltungen, Tische } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  IconCalendarEvent,
  IconArmchair2,
  IconUsers,
  IconCheck,
  IconAlertTriangle,
} from '@tabler/icons-react';

// ---- helpers ----------------------------------------------------------------

function formatDatum(raw: string | undefined): string {
  if (!raw) return '—';
  try {
    return format(parseISO(raw), 'dd.MM.yyyy HH:mm');
  } catch {
    return raw;
  }
}

// Safe capacity percent (capped at 100)
function capacityPercent(booked: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.round((booked / max) * 100), 100);
}

// ---- component --------------------------------------------------------------

export default function VeranstaltungVorbereitenPage() {
  const { veranstaltungen, tische, loading, error, fetchAll } = useDashboardData();
  const [searchParams] = useSearchParams();

  // Wizard step — initialized from ?step= URL param
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 3 ? s : 1;
  })();
  const [step, setStep] = useState(initialStep);

  // Step 1 state
  const [selectedVeranstaltung, setSelectedVeranstaltung] = useState<Veranstaltungen | null>(null);

  // Step 2 state — set of selected table record_ids
  const [selectedTischIds, setSelectedTischIds] = useState<Set<string>>(new Set());

  // Step 3 state
  const statusOptions = LOOKUP_OPTIONS['veranstaltungen']?.['veranstaltung_status'] ?? [];
  const [newStatus, setNewStatus] = useState<string>('');
  const [notizen, setNotizen] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Deep-link: if ?veranstaltungId=xxx is present, pre-select and jump to step 2
  useEffect(() => {
    const preId = searchParams.get('veranstaltungId');
    if (!preId || veranstaltungen.length === 0) return;
    if (selectedVeranstaltung?.record_id === preId) return;
    const found = veranstaltungen.find(v => v.record_id === preId);
    if (found) {
      setSelectedVeranstaltung(found);
      // Only auto-advance if step wasn't explicitly set via URL
      const urlStep = parseInt(searchParams.get('step') ?? '', 10);
      if (!(urlStep >= 2)) setStep(2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veranstaltungen]);

  // Initialize notes/status when veranstaltung is selected
  useEffect(() => {
    if (!selectedVeranstaltung) return;
    setNewStatus(selectedVeranstaltung.fields.veranstaltung_status?.key ?? statusOptions[0]?.key ?? '');
    setNotizen(selectedVeranstaltung.fields.bemerkungen_veranstaltung ?? '');
  }, [selectedVeranstaltung, statusOptions]);

  // Computed live totals for step 2
  const selectedTische = useMemo(
    () => tische.filter(t => selectedTischIds.has(t.record_id)),
    [tische, selectedTischIds]
  );
  const totalKapazitaet = useMemo(
    () => selectedTische.reduce((sum, t) => sum + (t.fields.kapazitaet ?? 0), 0),
    [selectedTische]
  );
  const maxTeilnehmer = selectedVeranstaltung?.fields.max_teilnehmer ?? 0;
  const kapazitaetOk = totalKapazitaet >= maxTeilnehmer;

  // Lookup key for "reserviert" — safe check from LOOKUP_OPTIONS
  const tischStatusKeys = LOOKUP_OPTIONS['tische']?.['status'] ?? [];
  const reserviertKey = tischStatusKeys.find(o => o.key === 'reserviert')?.key ?? tischStatusKeys[0]?.key ?? 'reserviert';

  // ---- handlers ---------------------------------------------------------------

  function handleVeranstaltungSelect(id: string) {
    const v = veranstaltungen.find(v => v.record_id === id) ?? null;
    setSelectedVeranstaltung(v);
    setSelectedTischIds(new Set());
    setSuccess(false);
    setSaveError(null);
    setStep(2);
  }

  function toggleTisch(tischId: string) {
    setSelectedTischIds(prev => {
      const next = new Set(prev);
      if (next.has(tischId)) next.delete(tischId);
      else next.add(tischId);
      return next;
    });
  }

  async function handleAbschliessen() {
    if (!selectedVeranstaltung) return;
    setSaving(true);
    setSaveError(null);
    try {
      // 1. Update Veranstaltung status + notes
      await LivingAppsService.updateVeranstaltungenEntry(selectedVeranstaltung.record_id, {
        veranstaltung_status: newStatus,
        bemerkungen_veranstaltung: notizen,
      });

      // 2. Update each selected table to "reserviert"
      await Promise.all(
        Array.from(selectedTischIds).map(tischId =>
          LivingAppsService.updateTischeEntry(tischId, { status: reserviertKey })
        )
      );

      await fetchAll();
      setSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setStep(1);
    setSelectedVeranstaltung(null);
    setSelectedTischIds(new Set());
    setNewStatus('');
    setNotizen('');
    setSuccess(false);
    setSaveError(null);
  }

  // ---- render -----------------------------------------------------------------

  return (
    <IntentWizardShell
      title="Veranstaltung vorbereiten"
      subtitle="Wähle eine Veranstaltung, ordne Tische zu und aktualisiere den Status."
      steps={[
        { label: 'Veranstaltung' },
        { label: 'Tische' },
        { label: 'Abschließen' },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ------------------------------------------------------------------ */}
      {/* STEP 1 — Veranstaltung wählen                                       */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Wähle die Veranstaltung aus, die du vorbereiten möchtest.
          </p>
          <EntitySelectStep
            items={veranstaltungen.map(v => ({
              id: v.record_id,
              title: v.fields.veranstaltungsname ?? '(Unbenannte Veranstaltung)',
              subtitle: v.fields.start_datum
                ? `${formatDatum(v.fields.start_datum)}${v.fields.verantwortliche_person ? ' · ' + v.fields.verantwortliche_person : ''}`
                : v.fields.verantwortliche_person ?? '',
              status: v.fields.veranstaltung_status
                ? { key: v.fields.veranstaltung_status.key, label: v.fields.veranstaltung_status.label }
                : undefined,
              stats: [
                { label: 'Max. Teilnehmer', value: v.fields.max_teilnehmer ?? 0 },
                { label: 'Angemeldet', value: v.fields.angemeldete_teilnehmer ?? 0 },
              ],
              icon: <IconCalendarEvent size={20} className="text-primary" />,
            }))}
            onSelect={handleVeranstaltungSelect}
            searchPlaceholder="Veranstaltung suchen..."
            emptyIcon={<IconCalendarEvent size={32} />}
            emptyText="Keine Veranstaltungen gefunden."
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 2 — Tische zuordnen                                            */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && selectedVeranstaltung && (
        <div className="space-y-4">
          {/* Context banner */}
          <div className="rounded-xl border bg-card p-4 flex items-start gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <IconCalendarEvent size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {selectedVeranstaltung.fields.veranstaltungsname ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDatum(selectedVeranstaltung.fields.start_datum)}
                {selectedVeranstaltung.fields.verantwortliche_person
                  ? ' · ' + selectedVeranstaltung.fields.verantwortliche_person
                  : ''}
              </p>
            </div>
          </div>

          {/* Live counter + capacity bar */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <IconArmchair2 size={15} />
                Ausgewählte Tische
              </span>
              <span className="font-semibold">{selectedTischIds.size} Tische · {totalKapazitaet} Personen</span>
            </div>

            {/* Capacity progress bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Kapazitätsabdeckung</span>
                <span>{totalKapazitaet} / {maxTeilnehmer} Personen</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${kapazitaetOk ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${capacityPercent(totalKapazitaet, maxTeilnehmer)}%` }}
                />
              </div>
            </div>

            {/* Status indicator */}
            {maxTeilnehmer > 0 && (
              <div className={`flex items-center gap-1.5 text-xs font-medium ${kapazitaetOk ? 'text-green-600' : 'text-amber-600'}`}>
                {kapazitaetOk ? (
                  <>
                    <IconCheck size={13} stroke={2.5} />
                    Kapazität ausreichend für alle Teilnehmer
                  </>
                ) : (
                  <>
                    <IconAlertTriangle size={13} />
                    Kapazität deckt nur {totalKapazitaet} von {maxTeilnehmer} Teilnehmern ab
                  </>
                )}
              </div>
            )}
          </div>

          {/* Table tile grid */}
          <p className="text-sm text-muted-foreground">
            Wähle die Tische aus, die für diese Veranstaltung reserviert werden sollen.
          </p>
          {tische.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mb-3 flex justify-center opacity-40">
                <IconArmchair2 size={32} />
              </div>
              <p className="text-sm">Keine Tische vorhanden.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tische.map((tisch: Tische) => {
                const isSelected = selectedTischIds.has(tisch.record_id);
                return (
                  <button
                    key={tisch.record_id}
                    onClick={() => toggleTisch(tisch.record_id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all overflow-hidden ${
                      isSelected
                        ? 'bg-primary/5 border-primary ring-2 ring-primary/20'
                        : 'bg-card border-border hover:border-primary/30 hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xl font-bold text-foreground">
                        {tisch.fields.tischnummer ?? '—'}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <IconCheck size={11} stroke={3} className="text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      {tisch.fields.bereich && (
                        <p className="text-xs text-muted-foreground">{tisch.fields.bereich.label}</p>
                      )}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <IconUsers size={12} />
                          {tisch.fields.kapazitaet ?? 0} Personen
                        </span>
                        <StatusBadge
                          statusKey={tisch.fields.status?.key}
                          label={tisch.fields.status?.label}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Zurück
            </Button>
            <div className="flex items-center gap-2">
              {!kapazitaetOk && selectedTischIds.size > 0 && maxTeilnehmer > 0 && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <IconAlertTriangle size={13} />
                  Kapazität nicht ausreichend
                </span>
              )}
              <Button onClick={() => setStep(3)}>
                Weiter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 3 — Status setzen & abschließen                                */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && selectedVeranstaltung && !success && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="rounded-xl border bg-card p-5 space-y-4 overflow-hidden">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Zusammenfassung
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Veranstaltung</p>
                <p className="font-semibold text-sm truncate">
                  {selectedVeranstaltung.fields.veranstaltungsname ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Datum</p>
                <p className="font-semibold text-sm">
                  {formatDatum(selectedVeranstaltung.fields.start_datum)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Verantwortliche Person</p>
                <p className="font-semibold text-sm truncate">
                  {selectedVeranstaltung.fields.verantwortliche_person ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Max. Teilnehmer</p>
                <p className="font-semibold text-sm">
                  {selectedVeranstaltung.fields.max_teilnehmer ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Ausgewählte Tische</p>
                <p className="font-semibold text-sm">
                  {selectedTischIds.size} Tisch{selectedTischIds.size !== 1 ? 'e' : ''}
                  {' '}· {totalKapazitaet} Personen Kapazität
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Auslastung</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">
                    {selectedVeranstaltung.fields.max_teilnehmer && selectedVeranstaltung.fields.max_teilnehmer > 0
                      ? Math.round(((selectedVeranstaltung.fields.angemeldete_teilnehmer ?? 0) / selectedVeranstaltung.fields.max_teilnehmer) * 100)
                      : 0}%
                  </p>
                  <span className="text-xs text-muted-foreground">
                    ({selectedVeranstaltung.fields.angemeldete_teilnehmer ?? 0} / {selectedVeranstaltung.fields.max_teilnehmer ?? 0} Teilnehmer)
                  </span>
                </div>
              </div>
            </div>

            {/* Capacity warning */}
            {!kapazitaetOk && maxTeilnehmer > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                <IconAlertTriangle size={15} className="shrink-0 mt-0.5" />
                <p className="text-xs">
                  Die ausgewählte Tischkapazität ({totalKapazitaet}) deckt nicht alle Teilnehmer ab ({maxTeilnehmer}).
                  Du kannst trotzdem fortfahren.
                </p>
              </div>
            )}
            {kapazitaetOk && maxTeilnehmer > 0 && selectedTischIds.size > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
                <IconCheck size={15} className="shrink-0 mt-0.5" stroke={2.5} />
                <p className="text-xs">
                  Genug Kapazität für alle {maxTeilnehmer} Teilnehmer.
                </p>
              </div>
            )}
          </div>

          {/* Status selector */}
          <div className="rounded-xl border bg-card p-5 space-y-3 overflow-hidden">
            <h3 className="font-semibold text-sm">Neuer Status der Veranstaltung</h3>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setNewStatus(opt.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    newStatus === opt.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border hover:border-primary/40 hover:bg-accent text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border bg-card p-5 space-y-2 overflow-hidden">
            <h3 className="font-semibold text-sm">Bemerkungen (optional)</h3>
            <Textarea
              value={notizen}
              onChange={e => setNotizen(e.target.value)}
              placeholder="Notizen zur Veranstaltungsvorbereitung..."
              className="w-full min-h-[80px] resize-none"
            />
          </div>

          {/* Error */}
          {saveError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <IconAlertTriangle size={15} className="shrink-0 mt-0.5" />
              <p className="text-xs">{saveError}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)} disabled={saving}>
              Zurück
            </Button>
            <Button onClick={handleAbschliessen} disabled={saving || !newStatus}>
              {saving ? 'Wird gespeichert…' : 'Veranstaltung aktualisieren'}
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUCCESS STATE                                                        */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && success && (
        <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
            <IconCheck size={28} className="text-green-600" stroke={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              Veranstaltung erfolgreich aktualisiert
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Der Status wurde gesetzt
              {selectedTischIds.size > 0
                ? ` und ${selectedTischIds.size} Tisch${selectedTischIds.size !== 1 ? 'e wurden' : ' wurde'} als reserviert markiert`
                : ''}.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleReset}>
              Weitere Veranstaltung vorbereiten
            </Button>
            <Button asChild>
              <a href="#/">Zurück zum Dashboard</a>
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
