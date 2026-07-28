import { useEffect, useState } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  listPublicRecords,
  PageUnavailableError,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_ORDER = [
  'tagesgericht',
  'vorspeise',
  'suppe',
  'hauptgang',
  'beilage',
  'dessert',
  'kinderteller',
  'getraenk',
];

const CATEGORY_LABELS: Record<string, string> = {
  tagesgericht: 'Tagesgerichte',
  vorspeise: 'Vorspeisen',
  suppe: 'Suppen',
  hauptgang: 'Hauptgänge',
  beilage: 'Beilagen',
  dessert: 'Desserts',
  kinderteller: 'Kinderteller',
  getraenk: 'Getränke',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MenuItem {
  id: string;
  name: string;
  kategorie: string;
  beschreibung: string | null;
  preis: number | null;
  allergene: string | null;
  saisonal: boolean;
}

function isVegan(allergene: string | null): boolean {
  return !!allergene && /vegan/i.test(allergene);
}

function isVegetarisch(allergene: string | null): boolean {
  return !!allergene && /vegetarisch/i.test(allergene);
}

function formatPreis(preis: number): string {
  return preis.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

// ---------------------------------------------------------------------------
// Dish card
// ---------------------------------------------------------------------------

function DishCard({ item }: { item: MenuItem }) {
  const vegan = isVegan(item.allergene);
  const veg = !vegan && isVegetarisch(item.allergene);

  return (
    <div className="rounded-2xl border bg-card p-4 flex flex-col gap-3 shadow-sm">
      {/* Top row: name + price */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base leading-snug">{item.name}</p>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {vegan && (
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success">
                Vegan
              </span>
            )}
            {veg && (
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
                Vegetarisch
              </span>
            )}
            {item.saisonal && (
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Saisonal
              </span>
            )}
          </div>
        </div>

        {item.preis !== null && (
          <span className="text-lg font-bold text-primary shrink-0 tabular-nums">
            {formatPreis(item.preis)}
          </span>
        )}
      </div>

      {/* Description */}
      {item.beschreibung && (
        <p className="text-sm text-muted-foreground leading-relaxed">{item.beschreibung}</p>
      )}

      {/* Allergens */}
      {item.allergene && (
        <p className="text-xs text-muted-foreground/60 border-t pt-2">
          Allergene &amp; Hinweise: {item.allergene}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Speisekarte() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const c = await loadPublicPagesConfig();
      if (!c) {
        setUnavailable(true);
        setLoading(false);
        return;
      }
      const p = c.pages['speisekarte'] ?? null;
      if (!p) {
        setUnavailable(true);
        setLoading(false);
        return;
      }
      setCfg(c);
      setPage(p);

      try {
        const listEndpoint = p.endpoints?.find(e => e.op === 'list');
        const records = await listPublicRecords(c, p, {
          appId: listEndpoint?.app_id,
          limit: 200,
        });

        const menuItems: MenuItem[] = Object.values(records).map(rec => ({
          id: rec.id,
          name: String(rec.fields.gerichtname ?? ''),
          kategorie: String(rec.fields.kategorie ?? 'hauptgang'),
          beschreibung: rec.fields.beschreibung_gericht
            ? String(rec.fields.beschreibung_gericht)
            : null,
          preis:
            rec.fields.preis !== null && rec.fields.preis !== undefined
              ? Number(rec.fields.preis)
              : null,
          allergene: rec.fields.allergene ? String(rec.fields.allergene) : null,
          saisonal: String(rec.fields.verfuegbarkeit) === 'saisonal',
        }));

        setItems(menuItems);
      } catch (err) {
        if (err instanceof PageUnavailableError) setUnavailable(true);
      }

      setLoading(false);
    })();
  }, []);

  if (loading || unavailable || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading && (unavailable || !cfg || !page)} />;
  }

  // Group by category
  const byCategory = new Map<string, MenuItem[]>();
  for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
  for (const item of items) {
    const cat = item.kategorie;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(item);
  }
  const activeCats = CATEGORY_ORDER.filter(c => (byCategory.get(c) ?? []).length > 0);
  const visibleCats = activeCategory ? [activeCategory] : activeCats;

  return (
    <PublicShell fullBleed>
      {/* ── Hero ── */}
      <div className="bg-primary text-primary-foreground py-14 px-4 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary-foreground/60 mb-2">
          {page.title ?? 'Unsere Speisekarte'}
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Was darf es sein?
        </h1>
        {page.description && (
          <p className="mt-3 text-lg text-primary-foreground/70">{page.description}</p>
        )}
      </div>

      {/* ── Category nav ── */}
      {activeCats.length > 1 && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="max-w-5xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              Alle
            </button>
            {activeCats.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Menu sections ── */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-xl font-medium">Speisekarte wird aktualisiert</p>
            <p className="text-sm mt-2">Schau bald wieder rein!</p>
          </div>
        ) : (
          visibleCats.map(cat => {
            const catItems = byCategory.get(cat) ?? [];
            if (catItems.length === 0) return null;
            return (
              <section key={cat}>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-2xl font-bold">{CATEGORY_LABELS[cat] ?? cat}</h2>
                  {cat === 'tagesgericht' && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-warning/15 text-warning">
                      Täglich wechselnd
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {catItems.map(item => (
                    <DishCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t mt-4 py-10 text-center text-xs text-muted-foreground space-y-1">
        <p>Alle Preise inklusive MwSt.</p>
        <p>Bei Allergien und Unverträglichkeiten spreche uns gerne direkt an.</p>
      </div>
    </PublicShell>
  );
}
