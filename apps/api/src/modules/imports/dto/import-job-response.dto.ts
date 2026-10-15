/**
 * Odpovědní DTO importní úlohy (průběh, log a report pro správce).
 */
import type { ImportJob, ImportJobStatus, ImportLogEntry, ImportReport } from '../entities/import-job.entity';

export class ImportJobResponseDto {
  id!: string;
  supplierId!: string;
  status!: ImportJobStatus;
  log!: ImportLogEntry[];
  report!: ImportReport | null;
  startedAt!: string | null;
  finishedAt!: string | null;
  createdAt!: string;

  static from(job: ImportJob): ImportJobResponseDto {
    return {
      id: job.id,
      supplierId: job.supplierId,
      status: job.status,
      log: job.log,
      report: job.report,
      startedAt: job.startedAt ? job.startedAt.toISOString() : null,
      finishedAt: job.finishedAt ? job.finishedAt.toISOString() : null,
      createdAt: job.createdAt.toISOString(),
    };
  }
}
