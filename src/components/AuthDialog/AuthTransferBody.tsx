import { AuthTransferBackup } from "./AuthTransferBackup";
import { AuthTransferImport } from "./AuthTransferImport";

export function AuthTransferBody() {
  return (
    <div id="auth-data-tools" className="authDialog__transferBody">
      <AuthTransferImport />
      <AuthTransferBackup />
    </div>
  );
}
