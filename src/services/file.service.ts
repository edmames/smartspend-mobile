/**
 * Platform file IO for export / import.
 *
 * Writes JSON to the cache directory and hands it to the OS share sheet, and
 * reads a user-picked JSON file back. Kept separate from `export.service.ts`
 * (which is pure) so the business rules stay unit-testable on Node.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import type { BackupPayload, MutationResult, Transaction, YearMonth } from '../types';
import {
  backupFileName,
  buildMonthlyReport,
  reportFileName,
  validateBackupPayload,
  type BackupValidationResult,
} from './export.service';

export type ShareOutcome = { ok: true; uri?: string } | { ok: false; error: string };

/* -------------------------------------------------------------------------- */
/*                                  Writing                                   */
/* -------------------------------------------------------------------------- */

/** Downloads the payload in a browser (used by the web build). */
function downloadInBrowser(fileName: string, contents: string): ShareOutcome {
  const scope = globalThis as unknown as {
    document?: { createElement: (tag: string) => { href: string; download: string; click: () => void } };
    URL?: { createObjectURL: (blob: unknown) => string; revokeObjectURL: (url: string) => void };
    Blob?: new (parts: string[], options: { type: string }) => unknown;
  };

  const doc = scope.document;
  const urlApi = scope.URL;
  const BlobCtor = scope.Blob;
  if (!doc || !urlApi || !BlobCtor) return { ok: false, error: 'export_failed' };

  const objectUrl = urlApi.createObjectURL(new BlobCtor([contents], { type: 'application/json' }));
  const anchor = doc.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  urlApi.revokeObjectURL(objectUrl);
  return { ok: true };
}

/**
 * Writes `contents` to a cache file and opens the share sheet.
 * Returns the file URI so the caller can display where it went.
 */
export async function writeAndShare(fileName: string, contents: string): Promise<ShareOutcome> {
  if (Platform.OS === 'web') {
    try {
      return downloadInBrowser(fileName, contents);
    } catch {
      return { ok: false, error: 'export_failed' };
    }
  }

  try {
    const file = new File(Paths.cache, fileName);
    try {
      file.write(contents);
    } catch {
      // The file may already exist from a previous export.
      file.create({ overwrite: true });
      file.write(contents);
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: fileName,
        UTI: 'public.json',
      });
    }
    return { ok: true, uri: file.uri };
  } catch {
    return { ok: false, error: 'export_failed' };
  }
}

export async function exportMonthlyReportJSON(
  transactions: Transaction[],
  monthYear: YearMonth,
): Promise<ShareOutcome> {
  const report = buildMonthlyReport(transactions, monthYear);
  return writeAndShare(reportFileName(monthYear), JSON.stringify(report, null, 2));
}

export async function exportBackupJSON(payload: BackupPayload): Promise<ShareOutcome> {
  return writeAndShare(backupFileName(), JSON.stringify(payload, null, 2));
}

/* -------------------------------------------------------------------------- */
/*                                  Reading                                   */
/* -------------------------------------------------------------------------- */

export interface PickedFile {
  name: string;
  contents: string;
}

export async function pickJSONFile(): Promise<MutationResult<PickedFile>> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.length) {
      return { ok: false, error: 'cancelled' };
    }

    const asset = result.assets[0];
    const file = new File(asset.uri);
    const contents = await file.text();
    return { ok: true, data: { name: asset.name ?? file.name ?? 'backup.json', contents } };
  } catch {
    return { ok: false, error: 'import_invalid' };
  }
}

/** Picks + validates a backup file in one step. */
export async function importBackupFile(): Promise<MutationResult<BackupValidationResult>> {
  const picked = await pickJSONFile();
  if (!picked.ok) return picked;

  const validation = validateBackupPayload(picked.data.contents);
  if (!validation.ok || !validation.payload) {
    return { ok: false, error: validation.error ?? 'import_invalid' };
  }
  return { ok: true, data: validation };
}

export const fileService = {
  writeAndShare,
  exportMonthlyReportJSON,
  exportBackupJSON,
  pickJSONFile,
  importBackupFile,
};

export type FileService = typeof fileService;
