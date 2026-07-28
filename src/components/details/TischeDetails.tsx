import type { Tische, Reservierungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface TischeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Tische;
  /** 1:N „Reservierungen": VOLLE Liste — der Block filtert auf diesen Record. */
  reservierungenList: Reservierungen[];
  /** Zeilen-Klick → overlay.push auf das Reservierungen-Detail (nie der Edit-Dialog). */
  onOpenReservierungen: (record: Reservierungen) => void;
  /** Kontextuelles „+": öffnet den Reservierungen-Dialog mit diesem Record vorgesetzt. */
  onAddReservierungen: () => void;
}

export function TischeDetails({
  record,
  reservierungenList,
  onOpenReservierungen,
  onAddReservierungen,
}: TischeDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Tischnummer" value={record.fields.tischnummer} format="text" />
        <RecordField label="Bereich" value={record.fields.bereich} format="pill" />
        <RecordField label="Kapazität (Sitzplätze)" value={record.fields.kapazitaet} format="text" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
        <RecordField label="Bemerkungen" value={record.fields.bemerkungen_tisch} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title="Reservierungen"
        items={reservierungenList.filter(r => extractRecordId(r.fields.tisch) === record.record_id)}
        map={r => ({ name: r.fields.gast_vorname ?? 'Reservierungen', meta: r.fields.datum_uhrzeit })}
        onOpen={onOpenReservierungen}
        onAdd={onAddReservierungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.TISCHE} recordId={record.record_id} />
    </>
  );
}
