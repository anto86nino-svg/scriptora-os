import { useEffect, useState } from "react";
import { OsShell } from "@/components/os/OsShell";
import { AuthorIdentityHomeCard } from "@/components/one-flow/AuthorIdentityHomeCard";
import { AuthorIdentityDialog } from "@/components/AuthorIdentityDialog";
import {
  AUTHOR_IDENTITY_CHANGED_EVENT,
  generateAuthorIdentityDraft,
  getSelectedAuthorIdentity,
} from "@/lib/author-identity";
import type { AuthorIdentity } from "@/types/book";

export default function IdentityOsPage() {
  const [identity, setIdentity] = useState<AuthorIdentity>(() => getSelectedAuthorIdentity());
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<AuthorIdentity | null>(null);

  useEffect(() => {
    const sync = () => setIdentity(getSelectedAuthorIdentity());
    window.addEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, sync);
  }, [setIdentity]);

  const openEditor = (draft?: AuthorIdentity | null) => {
    setPrefill(draft || null);
    setOpen(true);
  };

  return (
    <OsShell title="Author Identity" subtitle="Branding autore per front matter, export e voce editoriale" badge="👤 Identità">
      <AuthorIdentityHomeCard
        identity={identity}
        onConfigure={() => openEditor()}
        onGenerateWithAi={() => {
          const now = new Date().toISOString();
          openEditor({
            id: `custom-${crypto.randomUUID()}`,
            name: "Il mio profilo autore",
            realName: "",
            penName: "",
            copyrightName: "",
            language: "Italian",
            createdAt: now,
            updatedAt: now,
            ...generateAuthorIdentityDraft(),
          } as AuthorIdentity);
        }}
        onEdit={() => openEditor(identity)}
      />
      <AuthorIdentityDialog open={open} onClose={() => { setOpen(false); setPrefill(null); }} prefillDraft={prefill} />
    </OsShell>
  );
}
