import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNativeApp } from "../lib/nativePlatform";

type BackupDownloadInput = {
  contents: string;
  filename: string;
};

function isShareCancellation(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function shareNativeBackup({
  contents,
  filename,
}: BackupDownloadInput) {
  const writtenFile = await Filesystem.writeFile({
    path: filename,
    data: contents,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  try {
    await Share.share({
      title: "Plink backup",
      text: "Backup file for Plink sessions and players.",
      files: [writtenFile.uri],
      dialogTitle: "Save Plink backup",
    });
  } finally {
    await Filesystem.deleteFile({
      path: filename,
      directory: Directory.Cache,
    }).catch(() => undefined);
  }
}

function downloadBackupInBrowser({
  contents,
  filename,
}: BackupDownloadInput) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  try {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } catch {
    throw new Error(
      "Your browser blocked the backup download. Allow downloads and try again.",
    );
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
}

export async function shareOrDownloadBackup(input: BackupDownloadInput) {
  if (isNativeApp()) {
    await shareNativeBackup(input);
    return;
  }

  const file =
    typeof File === "function"
      ? new File([input.contents], input.filename, {
          type: "application/json",
        })
      : null;
  const canShareFile =
    !!file &&
    typeof navigator.canShare === "function" &&
    typeof navigator.share === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFile) {
    try {
      await navigator.share({
        files: [file!],
        title: "Plink backup",
        text: "Backup file for Plink sessions and players.",
      });
      return;
    } catch (error) {
      if (isShareCancellation(error)) return;
      // Some WebViews report file sharing as supported and then reject it.
      // Continue with a regular browser download in that case.
    }
  }

  downloadBackupInBrowser(input);
}
