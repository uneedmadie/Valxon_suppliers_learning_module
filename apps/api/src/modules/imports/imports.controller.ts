/**
 * Správcovské REST endpointy importu: spuštění a sledování průběhu.
 */
import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { ImportJobResponseDto } from './dto/import-job-response.dto';
import { ImportsService } from './imports.service';

@Controller('admin')
@Roles('admin')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  /** Spustí import („Načíst a vytvořit návrh“); vrací úlohu, jejíž stav se dotazuje průběžně. */
  @Post('suppliers/:supplierId/imports')
  async start(@Param('supplierId', ParseUUIDPipe) supplierId: string): Promise<ImportJobResponseDto> {
    return ImportJobResponseDto.from(await this.imports.start(supplierId));
  }

  @Get('suppliers/:supplierId/imports/latest')
  async latest(@Param('supplierId', ParseUUIDPipe) supplierId: string): Promise<ImportJobResponseDto> {
    const job = await this.imports.latestForSupplier(supplierId);
    if (!job) throw new NotFoundException('Dodavatel zatím nemá žádný import.');
    return ImportJobResponseDto.from(job);
  }

  @Get('imports/:jobId')
  async get(@Param('jobId', ParseUUIDPipe) jobId: string): Promise<ImportJobResponseDto> {
    return ImportJobResponseDto.from(await this.imports.getOrFail(jobId));
  }
}
