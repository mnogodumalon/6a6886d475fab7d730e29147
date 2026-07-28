// Auto-generated. Per-entity form-enhancements config for "Veranstaltungen".
// The sandbox sub-agent (Step 0) may overwrite this file with a richer config.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ['veranstaltungsname', 'start_datum', 'ende_datum', 'verantwortliche_person', 'max_teilnehmer', 'angemeldete_teilnehmer', 'veranstaltung_status', 'beschreibung', 'bemerkungen_veranstaltung'],
  defaults: {
    'start_datum': { kind: 'today', withTime: true },
    'ende_datum': { kind: 'todayOffset', days: 1, withTime: true },
    'veranstaltung_status': { kind: 'lookup', key: 'geplant', label: 'Geplant' },
    'max_teilnehmer': { kind: 'literal', value: 1 },
    'angemeldete_teilnehmer': { kind: 'literal', value: 0 },
  },
  computed: {
    '_veranstaltung_dauer_stunden': { kind: 'dateDiff', from: 'start_datum', to: 'ende_datum', unit: 'hours' },
  },
};

// Build-time-populated field dependencies for MODUS-2 arrow functions in
// `computed`. The sub-agent leaves this empty; scripts/parse-formulas.mjs
// fills it after Step 0 by regex-extracting ctx.* calls from each function
// body. The dialog feeds these into classifyComputed so MODUS-2 entries get
// inline anchors instead of always landing in the aggregate section.
export const computedDeps: Record<string, string[]> = {};

// Build-time-populated applookup (ownKey → lookupKey) pairs found in MODUS-2
// arrow functions. Filled by scripts/parse-formulas.mjs from regex matches
// on `ctx.applookup('x','y')` and `ctx.applookupAny('x','y')`. The dialog
// merges this with MODUS-1 refs extracted at render time, so every numeric
// field the formula pulls from a selected lookup is surfaced as an inline
// hint next to the lookup combobox.
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
