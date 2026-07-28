import type { Speisekarte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';

export interface SpeisekarteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Speisekarte;
}

export function SpeisekarteDetails({
  record,
}: SpeisekarteDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Gerichtname" value={record.fields.gerichtname} format="text" />
        <RecordField label="Kategorie" value={record.fields.kategorie} format="pill" />
        <RecordField label="Beschreibung" value={record.fields.beschreibung_gericht} format="longtext" className="md:col-span-2" />
        <RecordField label="Preis (€)" value={record.fields.preis} format="text" />
        <RecordField label="Allergene & Hinweise" value={record.fields.allergene} format="longtext" className="md:col-span-2" />
        <RecordField label="Verfügbarkeit" value={record.fields.verfuegbarkeit} format="pill" />
        <RecordField label="Bild des Gerichts" className="md:col-span-2">
          {record.fields.bild_gericht ? (
            <MediaThumbnail src={record.fields.bild_gericht as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
      </RecordSection>

      <RecordAttachments appId={APP_IDS.SPEISEKARTE} recordId={record.record_id} />
    </>
  );
}
