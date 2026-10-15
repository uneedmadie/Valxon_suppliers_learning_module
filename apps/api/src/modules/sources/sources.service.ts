/**
 * Služba zdrojů: přidávání URL, textů a souborů, ukládání extrahovaných segmentů
 * a správa podstránek nalezených crawlerem.
 */
import { BadRequestException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppConfig } from '../../config/app-config';
import { normalizeWhitespace } from '../../common/text';
import { detectDocumentKind } from '../imports/pipeline/document-extractor';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SourceSegment } from './entities/source-segment.entity';
import { Source, SourceKind, SourceOrigin, SourceStatus } from './entities/source.entity';
import { SourceStorageService } from './source-storage.service';

/** Nahraný soubor z multer (jen pole, která potřebujeme). */
export interface UploadedDocument {
  originalname: string;
  size: number;
  buffer: Buffer;
}

/** Segment k uložení. */
export interface SegmentInput {
  location: string;
  text: string;
}

const MAX_FILES_PER_REQUEST = 10;

/** Správa zdrojů a jejich segmentů. */
@Injectable()
export class SourcesService {
  constructor(
    @InjectRepository(Source) private readonly sources: Repository<Source>,
    @InjectRepository(SourceSegment) private readonly segments: Repository<SourceSegment>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    private readonly storage: SourceStorageService,
    private readonly config: AppConfig,
  ) {}

  /** Ověří existenci dodavatele (404 jinak). */
  async assertSupplierExists(supplierId: string): Promise<void> {
    if (!(await this.suppliers.existsBy({ id: supplierId }))) throw new NotFoundException('Dodavatel nebyl nalezen.');
  }

  /** Zdroje dodavatele seřazené podle vzniku. */
  listForSupplier(supplierId: string): Promise<Source[]> {
    return this.sources.find({ where: { supplierId }, order: { createdAt: 'ASC' } });
  }

  async getOrFail(id: string): Promise<Source> {
    const source = await this.sources.findOneBy({ id });
    if (!source) throw new NotFoundException('Zdroj nebyl nalezen.');
    return source;
  }

  /** Přidá URL webu jako kořenový zdroj pro crawler (duplicitní URL znovu nepřidává). */
  async addUrl(supplierId: string, url: string, origin: Extract<SourceOrigin, 'official' | 'external'> = 'official'): Promise<Source> {
    const existing = await this.sources.findOneBy({ supplierId, kind: 'web-root', url });
    if (existing) return existing;
    return this.sources.save(
      this.sources.create({ supplierId, kind: 'web-root', origin, title: new URL(url).hostname, url, status: 'pending' }),
    );
  }

  /** Přidá ručně vložený text – segmenty vzniknou ihned, není co stahovat. */
  async addText(supplierId: string, title: string, text: string): Promise<Source> {
    const source = await this.sources.save(
      this.sources.create({ supplierId, kind: 'text', origin: 'internal', title, status: 'processed', retrievedAt: new Date() }),
    );
    const paragraphs = text.split(/\n\s*\n/).map(normalizeWhitespace).filter((p) => p.length > 0);
    await this.replaceSegments(source, paragraphs.map((p, i) => ({ location: `vložený text, odst. ${i + 1}`, text: p })));
    return this.getOrFail(source.id);
  }

  /**
   * Uloží nahrané dokumenty. Typ se ověřuje podle přípony I obsahu (magic bytes);
   * nepodporované nebo podvržené soubory se odmítnou celé (nic se neuloží napůl).
   * @throws BadRequestException / PayloadTooLargeException
   */
  async addFiles(supplierId: string, files: UploadedDocument[]): Promise<Source[]> {
    if (files.length === 0) throw new BadRequestException('Nebyl nahrán žádný soubor.');
    if (files.length > MAX_FILES_PER_REQUEST) throw new BadRequestException(`Najednou lze nahrát nejvýše ${MAX_FILES_PER_REQUEST} souborů.`);

    // Nejdřív validace všech souborů, teprve potom zápis.
    const validated = files.map((file) => {
      if (file.size > this.config.uploadMaxBytes) {
        throw new PayloadTooLargeException(`Soubor „${file.originalname}“ překračuje limit ${Math.round(this.config.uploadMaxBytes / 1048576)} MB.`);
      }
      const kind = detectDocumentKind(file.buffer, file.originalname);
      if (!kind) throw new BadRequestException(`Soubor „${file.originalname}“ není platný PDF, DOCX ani XLSX.`);
      return { file, kind };
    });

    const created: Source[] = [];
    for (const { file, kind } of validated) {
      const storedFileName = await this.storage.save(supplierId, kind, file.buffer);
      created.push(
        await this.sources.save(
          this.sources.create({
            supplierId,
            kind,
            // Nahrané podklady jsou interní materiál VALXON, i když pocházejí od dodavatele.
            origin: 'internal',
            title: file.originalname.slice(0, 300),
            originalFileName: file.originalname.slice(0, 260),
            storedFileName,
            sizeBytes: file.size,
            status: 'pending',
          }),
        ),
      );
    }
    return created;
  }

  /** Vytvoří zdroj pro podstránku/PDF nalezené crawlerem. */
  createDiscovered(input: { supplierId: string; kind: SourceKind; title: string; url: string; parentSourceId: string }): Promise<Source> {
    return this.sources.save(
      this.sources.create({ ...input, origin: 'official', status: 'processed', retrievedAt: new Date() }),
    );
  }

  /** Odstraní podstránky objevené předchozím importem (před novým crawlem), včetně segmentů. */
  async removeDiscoveredChildren(supplierId: string): Promise<void> {
    const children = await this.sources.find({ where: { supplierId, kind: In<SourceKind>(['web', 'pdf']) } });
    const crawled = children.filter((c) => c.parentSourceId !== null);
    if (crawled.length === 0) return;
    await this.segments.delete({ sourceId: In(crawled.map((c) => c.id)) });
    await this.sources.delete({ id: In(crawled.map((c) => c.id)) });
  }

  /** Nahradí segmenty zdroje a aktualizuje délku textu. */
  async replaceSegments(source: Source, items: SegmentInput[]): Promise<void> {
    await this.segments.delete({ sourceId: source.id });
    const rows = items
      .filter((s) => s.text.trim().length > 0)
      .map((s, i) => this.segments.create({ sourceId: source.id, ordinal: i, location: s.location.slice(0, 400), text: s.text }));
    // Ukládání po dávkách – SQLite má limit počtu parametrů v jednom dotazu.
    for (let i = 0; i < rows.length; i += 200) await this.segments.save(rows.slice(i, i + 200));
    source.textLength = rows.reduce((sum, r) => sum + r.text.length, 0);
    await this.sources.save(source);
  }

  /** Nastaví stav zpracování zdroje. */
  async setStatus(source: Source, status: SourceStatus, error: string | null = null, warnings: string[] | null = null): Promise<void> {
    source.status = status;
    source.error = error;
    source.warnings = warnings && warnings.length > 0 ? warnings : null;
    source.retrievedAt = new Date();
    await this.sources.save(source);
  }

  /** Všechny segmenty dodavatele spolu s původem zdroje (vstup pro extrakci faktů). */
  async segmentsForSupplier(supplierId: string): Promise<{ segment: SourceSegment; source: Source }[]> {
    const sources = await this.sources.find({ where: { supplierId } });
    if (sources.length === 0) return [];
    const byId = new Map(sources.map((s) => [s.id, s]));
    const segments = await this.segments.find({ where: { sourceId: In(sources.map((s) => s.id)) }, order: { ordinal: 'ASC' } });
    return segments.map((segment) => ({ segment, source: byId.get(segment.sourceId)! }));
  }

  /** Segmenty jednoho zdroje (náhled pro správce). */
  segmentsOf(sourceId: string): Promise<SourceSegment[]> {
    return this.segments.find({ where: { sourceId }, order: { ordinal: 'ASC' } });
  }

  /** Načte obsah nahraného souboru. */
  readFile(source: Source): Promise<Buffer> {
    if (!source.storedFileName) throw new Error('Zdroj nemá uložený soubor.');
    return this.storage.read(source.supplierId, source.storedFileName);
  }
}
