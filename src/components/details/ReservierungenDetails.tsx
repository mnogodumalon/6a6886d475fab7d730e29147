import type { Reservierungen, Tische } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';

export interface ReservierungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Reservierungen;
  /** N:1-Ziel „Tische": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  tischeList: Tische[];
  /** Klick auf die Tische-Relation → overlay.push auf dessen Detail. */
  onOpenTische?: (record: Tische) => void;
}

export function ReservierungenDetails({
  record,
  tischeList,
  onOpenTische,
}: ReservierungenDetailsProps) {
  const tischTarget = tischeList.find(r => r.record_id === extractRecordId(record.fields.tisch));
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Datum & Uhrzeit" value={record.fields.datum_uhrzeit} format="datetime" />
        <RecordField label="Anzahl Personen" value={record.fields.personenanzahl} format="text" />
        <RecordField label="Vorname" value={record.fields.gast_vorname} format="text" />
        <RecordField label="Nachname" value={record.fields.gast_nachname} format="text" />
        <RecordField label="Telefonnummer" value={record.fields.gast_telefon} format="text" />
        <RecordField label="E-Mail-Adresse" value={record.fields.gast_email} format="email" />
        <RecordField label="Anlass" value={record.fields.anlass} format="text" />
        <RecordField label="Bestätigungsstatus" value={record.fields.bestaetigung} format="pill" />
        <RecordField label="Interne Bemerkungen" value={record.fields.bemerkungen_reservierung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title="Verknüpft" cols={1}>
        <RecordRelation
          label="Tisch"
          name={tischTarget?.fields.tischnummer ?? '—'}
          meta={undefined}
          onClick={tischTarget && onOpenTische ? () => onOpenTische!(tischTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.RESERVIERUNGEN} recordId={record.record_id} />
    </>
  );
}
