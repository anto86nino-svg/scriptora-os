import { useEffect, useMemo, useState } from "react";
import { Download, Search, Trash2 } from "lucide-react";
import { downloadStudyCertificate } from "@/lib/study-certificate";
import {
  deleteStudyCertificate,
  listStudyCertificates,
  STUDY_CERTIFICATES_CHANGE_EVENT,
  type StudyCertificateRecord,
} from "@/lib/study-certificate-storage";

export function StudyCertificatesPanel() {
  const [records, setRecords] = useState<StudyCertificateRecord[]>(() => listStudyCertificates());
  const [query, setQuery] = useState("");

  useEffect(() => {
    const refresh = () => setRecords(listStudyCertificates());
    window.addEventListener(STUDY_CERTIFICATES_CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(STUDY_CERTIFICATES_CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((record) =>
      `${record.subject} ${record.studentName} ${record.level} ${record.judgement || ""}`.toLowerCase().includes(q),
    );
  }, [records, query]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">I miei attestati</h3>
            <p className="mt-1 text-sm text-muted-foreground">{records.length} attestati salvati in questo browser.</p>
          </div>
          <label className="flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-background/45 px-3 text-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtra"
              className="min-w-0 bg-transparent outline-none"
            />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
          Nessun attestato trovato. Completa una simulazione esame con punteggio sufficiente per salvarne uno.
        </p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((record) => (
            <div key={record.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{record.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.studentName} · {record.date} · {record.level}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void downloadStudyCertificate(record, `scriptora-attestato-${record.subject.replace(/\W+/g, "-").toLowerCase()}.pdf`)}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-100"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteStudyCertificate(record.id)}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 text-xs font-semibold text-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Elimina
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Percentuale</p>
                  <p className="font-bold">{record.score}/100</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Decimi</p>
                  <p className="font-bold">{record.grade10 ?? "-"}/10</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Trentesimi</p>
                  <p className="font-bold">{record.grade30 ?? "-"}/30</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Giudizio</p>
                  <p className="font-bold">{record.judgement || record.level}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
