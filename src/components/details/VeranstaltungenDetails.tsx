import type { Veranstaltungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';

export interface VeranstaltungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Veranstaltungen;
}

export function VeranstaltungenDetails({
  record,
}: VeranstaltungenDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Veranstaltungsname" value={record.fields.veranstaltungsname} format="text" />
        <RecordField label="Beginn (Datum & Uhrzeit)" value={record.fields.start_datum} format="datetime" />
        <RecordField label="Ende (Datum & Uhrzeit)" value={record.fields.ende_datum} format="datetime" />
        <RecordField label="Beschreibung" value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label="Verantwortliche Person" value={record.fields.verantwortliche_person} format="text" />
        <RecordField label="Maximale Teilnehmerzahl" value={record.fields.max_teilnehmer} format="text" />
        <RecordField label="Aktuell angemeldete Teilnehmer" value={record.fields.angemeldete_teilnehmer} format="text" />
        <RecordField label="Status" value={record.fields.veranstaltung_status} format="pill" />
        <RecordField label="Bemerkungen" value={record.fields.bemerkungen_veranstaltung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.VERANSTALTUNGEN} recordId={record.record_id} />
    </>
  );
}
