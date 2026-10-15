/**
 * Správcovské REST endpointy zdrojů: přidání URL/textu, nahrání dokumentů, náhled segmentů.
 */
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/auth.decorators';
import { AddTextSourceDto, AddUrlSourceDto, SourceResponseDto, SourceSegmentResponseDto } from './dto/source.dto';
import { SourcesService, UploadedDocument } from './sources.service';

/** Tvrdý limit multeru (25 MB/soubor, 10 souborů) – detailní validaci dělá služba. */
const UPLOAD_LIMITS = { fileSize: 25 * 1024 * 1024, files: 10 };

@Controller('admin')
@Roles('admin')
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  @Get('suppliers/:supplierId/sources')
  async list(@Param('supplierId', ParseUUIDPipe) supplierId: string): Promise<SourceResponseDto[]> {
    await this.sources.assertSupplierExists(supplierId);
    return (await this.sources.listForSupplier(supplierId)).map((s) => SourceResponseDto.from(s));
  }

  @Post('suppliers/:supplierId/sources/url')
  async addUrl(@Param('supplierId', ParseUUIDPipe) supplierId: string, @Body() dto: AddUrlSourceDto): Promise<SourceResponseDto> {
    await this.sources.assertSupplierExists(supplierId);
    return SourceResponseDto.from(await this.sources.addUrl(supplierId, dto.url, dto.origin));
  }

  @Post('suppliers/:supplierId/sources/text')
  async addText(@Param('supplierId', ParseUUIDPipe) supplierId: string, @Body() dto: AddTextSourceDto): Promise<SourceResponseDto> {
    await this.sources.assertSupplierExists(supplierId);
    return SourceResponseDto.from(await this.sources.addText(supplierId, dto.title, dto.text));
  }

  /** Nahrání PDF/DOCX/XLSX (multipart pole `files`). */
  @Post('suppliers/:supplierId/sources/files')
  @UseInterceptors(FilesInterceptor('files', UPLOAD_LIMITS.files, { limits: UPLOAD_LIMITS }))
  async addFiles(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @UploadedFiles() files: UploadedDocument[] | undefined,
  ): Promise<SourceResponseDto[]> {
    await this.sources.assertSupplierExists(supplierId);
    return (await this.sources.addFiles(supplierId, files ?? [])).map((s) => SourceResponseDto.from(s));
  }

  @Get('sources/:sourceId/segments')
  async segments(@Param('sourceId', ParseUUIDPipe) sourceId: string): Promise<SourceSegmentResponseDto[]> {
    await this.sources.getOrFail(sourceId);
    return (await this.sources.segmentsOf(sourceId)).map((s) => SourceSegmentResponseDto.from(s));
  }
}
