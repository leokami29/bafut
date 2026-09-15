import Link from "next/link";
import { CancelAccountDeletionButton } from "@/components/CancelAccountDeletionButton";
import { formatPurgeDate } from "@/lib/account-deletion";

type Props = {
  purgeAt: string;
};

export function AccountDeletionBanner({ purgeAt }: Props) {
  const purgeLabel = formatPurgeDate(purgeAt);

  return (
    <div className="account-deletion-banner" role="status">
      <p className="account-deletion-banner-text">
        Tu cuenta se eliminará el <strong>{purgeLabel}</strong>. Hasta entonces podés seguir
        usando BaFut con normalidad.{" "}
        <Link href="/perfil#perfil-danger-panel">Ver opciones</Link>
      </p>
      <CancelAccountDeletionButton />
    </div>
  );
}
