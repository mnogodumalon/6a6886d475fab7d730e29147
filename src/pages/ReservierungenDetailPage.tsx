import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Reservierungen, Tische } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { ReservierungenDialog } from '@/components/dialogs/ReservierungenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Reservierungen';
import { evalComputed } from '@/config/form-enhancements/types';

export default function ReservierungenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Reservierungen | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tischeList, setTischeList] = useState<Tische[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, tischeData] = await Promise.all([
        LivingAppsService.getReservierungen(),
        LivingAppsService.getTische(),
      ]);
      setTischeList(tischeData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Reservierungen['fields']) {
    if (!record) return;
    await LivingAppsService.updateReservierungenEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteReservierungenEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/reservierungen');
  }

  function getTischeDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return tischeList.find(r => r.record_id === refId)?.fields.tischnummer ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/reservierungen')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/reservierungen')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={record.fields.gast_vorname ?? 'Reservierungen'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          tisch: tischeList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Datum & Uhrzeit" value={record.fields.datum_uhrzeit} format="datetime" />
        <RecordField label="Anzahl Personen" value={record.fields.personenanzahl} format="text" />
        <RecordField label="Tisch" value={getTischeDisplayName(record.fields.tisch)} format="text" />
        <RecordField label="Vorname" value={record.fields.gast_vorname} format="text" />
        <RecordField label="Nachname" value={record.fields.gast_nachname} format="text" />
        <RecordField label="Telefonnummer" value={record.fields.gast_telefon} format="text" />
        <RecordField label="E-Mail-Adresse" value={record.fields.gast_email} format="email" />
        <RecordField label="Anlass" value={record.fields.anlass} format="text" />
        <RecordField label="Bestätigungsstatus" value={record.fields.bestaetigung} format="pill" />
        <RecordField label="Interne Bemerkungen" value={record.fields.bemerkungen_reservierung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.RESERVIERUNGEN} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <ReservierungenDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        tischeList={tischeList}
        enablePhotoScan={AI_PHOTO_SCAN['Reservierungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Reservierungen']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Reservierungen löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
