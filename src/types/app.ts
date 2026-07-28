// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Tische {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    tischnummer?: string;
    bereich?: LookupValue;
    kapazitaet?: number;
    status?: LookupValue;
    bemerkungen_tisch?: string;
  };
}

export interface Reservierungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    datum_uhrzeit?: string; // Format: YYYY-MM-DD oder ISO String
    personenanzahl?: number;
    tisch?: string; // applookup -> URL zu 'Tische' Record
    gast_vorname?: string;
    gast_nachname?: string;
    gast_telefon?: string;
    gast_email?: string;
    anlass?: string;
    bestaetigung?: LookupValue;
    bemerkungen_reservierung?: string;
  };
}

export interface Veranstaltungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    veranstaltungsname?: string;
    start_datum?: string; // Format: YYYY-MM-DD oder ISO String
    ende_datum?: string; // Format: YYYY-MM-DD oder ISO String
    beschreibung?: string;
    verantwortliche_person?: string;
    max_teilnehmer?: number;
    angemeldete_teilnehmer?: number;
    veranstaltung_status?: LookupValue;
    bemerkungen_veranstaltung?: string;
  };
}

export interface Speisekarte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    gerichtname?: string;
    kategorie?: LookupValue;
    beschreibung_gericht?: string;
    preis?: number;
    allergene?: string;
    verfuegbarkeit?: LookupValue;
    bild_gericht?: string;
  };
}

export const APP_IDS = {
  TISCHE: '6a6886b2b5b3e9bd695c106a',
  RESERVIERUNGEN: '6a6886b557520753fe5f8835',
  VERANSTALTUNGEN: '6a6886b632d279e92f7c14a3',
  SPEISEKARTE: '6a6886b62d4efc5e6eddb88c',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'tische': {
    bereich: [{ key: "innenraum", label: "Innenraum" }, { key: "terrasse", label: "Terrasse" }, { key: "bar", label: "Bar" }, { key: "privatraum", label: "Privatraum" }, { key: "garten", label: "Garten" }],
    status: [{ key: "verfuegbar", label: "Verfügbar" }, { key: "reserviert", label: "Reserviert" }, { key: "gesperrt", label: "Gesperrt" }],
  },
  'reservierungen': {
    bestaetigung: [{ key: "bestaetigt", label: "Bestätigt" }, { key: "nicht_bestaetigt", label: "Nicht bestätigt" }, { key: "storniert", label: "Storniert" }],
  },
  'veranstaltungen': {
    veranstaltung_status: [{ key: "geplant", label: "Geplant" }, { key: "bestaetigt", label: "Bestätigt" }, { key: "abgesagt", label: "Abgesagt" }],
  },
  'speisekarte': {
    kategorie: [{ key: "vorspeise", label: "Vorspeise" }, { key: "suppe", label: "Suppe" }, { key: "hauptgang", label: "Hauptgang" }, { key: "beilage", label: "Beilage" }, { key: "dessert", label: "Dessert" }, { key: "getraenk", label: "Getränk" }, { key: "tagesgericht", label: "Tagesgericht" }, { key: "kinderteller", label: "Kinderteller" }],
    verfuegbarkeit: [{ key: "verfuegbar", label: "Verfügbar" }, { key: "nicht_verfuegbar", label: "Nicht verfügbar" }, { key: "saisonal", label: "Saisonal" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'tische': {
    'tischnummer': 'string/text',
    'bereich': 'lookup/select',
    'kapazitaet': 'number',
    'status': 'lookup/radio',
    'bemerkungen_tisch': 'string/textarea',
  },
  'reservierungen': {
    'datum_uhrzeit': 'date/datetimeminute',
    'personenanzahl': 'number',
    'tisch': 'applookup/select',
    'gast_vorname': 'string/text',
    'gast_nachname': 'string/text',
    'gast_telefon': 'string/tel',
    'gast_email': 'string/email',
    'anlass': 'string/text',
    'bestaetigung': 'lookup/radio',
    'bemerkungen_reservierung': 'string/textarea',
  },
  'veranstaltungen': {
    'veranstaltungsname': 'string/text',
    'start_datum': 'date/datetimeminute',
    'ende_datum': 'date/datetimeminute',
    'beschreibung': 'string/textarea',
    'verantwortliche_person': 'string/text',
    'max_teilnehmer': 'number',
    'angemeldete_teilnehmer': 'number',
    'veranstaltung_status': 'lookup/radio',
    'bemerkungen_veranstaltung': 'string/textarea',
  },
  'speisekarte': {
    'gerichtname': 'string/text',
    'kategorie': 'lookup/select',
    'beschreibung_gericht': 'string/textarea',
    'preis': 'number',
    'allergene': 'string/textarea',
    'verfuegbarkeit': 'lookup/radio',
    'bild_gericht': 'file',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateTische = StripLookup<Tische['fields']>;
export type CreateReservierungen = StripLookup<Reservierungen['fields']>;
export type CreateVeranstaltungen = StripLookup<Veranstaltungen['fields']>;
export type CreateSpeisekarte = StripLookup<Speisekarte['fields']>;