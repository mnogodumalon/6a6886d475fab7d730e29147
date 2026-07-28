import { useEffect, useRef, useState } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  createPublicRecord,
  prepareChallenge,
  PageUnavailableError,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function localMinDate() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function formatDateTime(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return format(d, "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'");
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Success screen
// ---------------------------------------------------------------------------

function SuccessScreen({
  vorname,
  telefon,
  datumUhrzeit,
  personenanzahl,
  onReset,
}: {
  vorname: string;
  telefon: string;
  datumUhrzeit: string;
  personenanzahl: number;
  onReset: () => void;
}) {
  return (
    <PublicShell title="Tisch reservieren">
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        {/* Check circle */}
        <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-success"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Anfrage eingegangen!</h1>
          <p className="text-muted-foreground max-w-xs">
            Danke, {vorname}! Wir melden uns kurz unter{' '}
            <strong className="text-foreground">{telefon}</strong> zur Bestätigung.
          </p>
        </div>

        {/* Summary card */}
        <div className="w-full rounded-2xl border bg-muted/40 p-5 text-left space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0 mt-0.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div>
              <p className="font-medium">{datumUhrzeit ? formatDateTime(datumUhrzeit) : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p className="font-medium">{personenanzahl} {personenanzahl === 1 ? 'Person' : 'Personen'}</p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
        >
          Neue Reservierung
        </button>
      </div>
    </PublicShell>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Reservierungen() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  // Form fields
  const [datumUhrzeit, setDatumUhrzeit] = useState('');
  const [personenanzahl, setPersonenanzahl] = useState(2);
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [telefon, setTelefon] = useState('');
  const [email, setEmail] = useState('');
  const [anlass, setAnlass] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const challengeReady = useRef(false);

  useEffect(() => {
    (async () => {
      const c = await loadPublicPagesConfig();
      if (!c) {
        setUnavailable(true);
        setLoading(false);
        return;
      }
      const p = c.pages['reservierungen'] ?? null;
      if (!p) {
        setUnavailable(true);
        setLoading(false);
        return;
      }
      setCfg(c);
      setPage(p);
      setLoading(false);
    })();
  }, []);

  function handleFirstInteraction() {
    if (!cfg || !page || challengeReady.current) return;
    challengeReady.current = true;
    const ep = page.endpoints?.find(e => e.op === 'create');
    if (ep?.app_id) {
      prepareChallenge(cfg, page, 'POST', `/apps/${ep.app_id}/records`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg || !page) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const fields: Record<string, unknown> = {
        datum_uhrzeit: datumUhrzeit,
        personenanzahl,
        gast_vorname: vorname.trim(),
        gast_nachname: nachname.trim(),
        gast_telefon: telefon.trim(),
      };
      if (email.trim()) fields.gast_email = email.trim();
      if (anlass.trim()) fields.anlass = anlass.trim();

      await createPublicRecord(cfg, page, fields);
      setSuccess(true);
    } catch (err) {
      if (err instanceof PageUnavailableError) {
        setUnavailable(true);
      } else {
        setSubmitError(
          'Die Reservierung konnte leider nicht gespeichert werden. Bitte versuche es erneut oder ruf uns an.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSuccess(false);
    setDatumUhrzeit('');
    setPersonenanzahl(2);
    setVorname('');
    setNachname('');
    setTelefon('');
    setEmail('');
    setAnlass('');
    setSubmitError(null);
  }

  if (loading || unavailable || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading && (unavailable || !cfg || !page)} />;
  }

  if (success) {
    return (
      <SuccessScreen
        vorname={vorname}
        telefon={telefon}
        datumUhrzeit={datumUhrzeit}
        personenanzahl={personenanzahl}
        onReset={handleReset}
      />
    );
  }

  const inputClass =
    'w-full border rounded-xl px-4 py-3 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow';

  return (
    <PublicShell
      title={page.title ?? 'Tisch reservieren'}
      description={page.description}
    >
      <form
        onSubmit={handleSubmit}
        onFocus={handleFirstInteraction}
        className="flex flex-col gap-5"
      >
        {/* Datum & Uhrzeit */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">
            Datum &amp; Uhrzeit <span className="text-destructive">*</span>
          </label>
          <input
            type="datetime-local"
            required
            value={datumUhrzeit}
            min={localMinDate()}
            onChange={e => setDatumUhrzeit(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Personenanzahl */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">
            Anzahl Personen <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPersonenanzahl(p => Math.max(1, p - 1))}
              aria-label="Weniger Personen"
              className="w-11 h-11 rounded-xl border bg-muted font-bold text-xl flex items-center justify-center select-none"
            >
              −
            </button>
            <span className="text-2xl font-bold w-8 text-center tabular-nums">
              {personenanzahl}
            </span>
            <button
              type="button"
              onClick={() => setPersonenanzahl(p => Math.min(20, p + 1))}
              aria-label="Mehr Personen"
              className="w-11 h-11 rounded-xl border bg-muted font-bold text-xl flex items-center justify-center select-none"
            >
              +
            </button>
            <span className="text-sm text-muted-foreground">
              {personenanzahl === 1 ? 'Person' : 'Personen'}
            </span>
          </div>
        </div>

        {/* Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">
              Vorname <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={vorname}
              onChange={e => setVorname(e.target.value)}
              placeholder="Max"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">
              Nachname <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={nachname}
              onChange={e => setNachname(e.target.value)}
              placeholder="Mustermann"
              className={inputClass}
            />
          </div>
        </div>

        {/* Telefon */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">
            Telefonnummer <span className="text-destructive">*</span>
          </label>
          <input
            type="tel"
            required
            value={telefon}
            onChange={e => setTelefon(e.target.value)}
            placeholder="+49 123 456789"
            className={inputClass}
          />
          <p className="text-xs text-muted-foreground">
            Wir rufen kurz an, um die Reservierung zu bestätigen.
          </p>
        </div>

        {/* E-Mail (optional) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">
            E-Mail{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="max@beispiel.de"
            className={inputClass}
          />
        </div>

        {/* Anlass (optional) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">
            Anlass{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={anlass}
            onChange={e => setAnlass(e.target.value)}
            placeholder="z. B. Geburtstag, Jubiläum …"
            className={inputClass}
          />
        </div>

        {/* Error message */}
        {submitError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {submitError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-60 transition-opacity mt-1"
        >
          {submitting ? 'Wird gesendet …' : 'Tisch reservieren'}
        </button>

        <p className="text-xs text-center text-muted-foreground pb-2">
          Unverbindliche Anfrage — wir bestätigen telefonisch.
        </p>
      </form>
    </PublicShell>
  );
}
