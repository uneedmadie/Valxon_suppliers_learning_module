/**
 * Služba faktů: ukládání návrhů z importu, ruční doplnění, ověřování a zamítání správcem.
 * Ověření provádí vždy člověk – import ukládá jen stav `proposed`.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { findCountryInText } from '../../common/countries';
import { normalizeForMatch } from '../../common/text';
import type { FactCandidate } from '../imports/pipeline/fact-extractor';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { CreateFactDto, UpdateFactDto } from './dto/fact.dto';
import { Fact, FactStatus } from './entities/fact.entity';

/** Správa faktů dodavatele. */
@Injectable()
export class FactsService {
  constructor(
    @InjectRepository(Fact) private readonly facts: Repository<Fact>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
  ) {}

  /** Všechna fakta dodavatele (pro review), seřazená podle kapitoly. */
  listForSupplier(supplierId: string): Promise<Fact[]> {
    return this.facts.find({ where: { supplierId }, order: { chapter: 'ASC', kind: 'ASC', createdAt: 'ASC' } });
  }

  /** Fakta, která nebyla zamítnuta (podklad pro návrhy kapitol a otázek). */
  listUsable(supplierId: string): Promise<Fact[]> {
    return this.facts.find({ where: { supplierId, status: Not<FactStatus>('rejected') }, order: { chapter: 'ASC', createdAt: 'ASC' } });
  }

  /** Pouze ověřená fakta – jediná, která smí vidět student. */
  listVerified(supplierId: string): Promise<Fact[]> {
    return this.facts.find({ where: { supplierId, status: 'verified' }, order: { chapter: 'ASC', createdAt: 'ASC' } });
  }

  async getOrFail(id: string): Promise<Fact> {
    const fact = await this.facts.findOneBy({ id });
    if (!fact) throw new NotFoundException('Fakt nebyl nalezen.');
    return fact;
  }

  /**
   * Nahradí neověřené návrhy z předchozího importu novými kandidáty.
   * Ověřená, zamítnutá a ručně zadaná fakta zůstávají; kandidát se stejnou hodnotou
   * jako už posouzený fakt se znovu nevytváří (správce nemusí rozhodovat dvakrát).
   */
  async replaceProposed(supplierId: string, candidates: FactCandidate[]): Promise<number> {
    await this.facts.delete({ supplierId, status: 'proposed', origin: In(['official', 'external']) });
    const reviewed = await this.facts.find({ where: { supplierId } });
    const known = new Set(reviewed.map((f) => `${f.kind}|${normalizeForMatch(f.value)}`));

    const rows = candidates
      .filter((c) => !known.has(`${c.kind}|${normalizeForMatch(c.value)}`))
      .map((c) => this.facts.create({ ...c, supplierId, status: 'proposed' }));
    for (let i = 0; i < rows.length; i += 100) await this.facts.save(rows.slice(i, i + 100));
    return rows.length;
  }

  /** Ruční fakt správce – je rovnou ověřený, protože ho zadal odpovědný člověk. */
  createManual(supplierId: string, dto: CreateFactDto, userId: string): Promise<Fact> {
    return this.facts.save(
      this.facts.create({
        supplierId,
        chapter: dto.chapter,
        kind: dto.kind,
        label: dto.label,
        value: dto.value,
        location: dto.location ?? 'Ruční zadání správcem',
        quote: null,
        sourceId: null,
        origin: 'manual',
        status: 'verified',
        confidence: 'high',
        verifiedBy: userId,
        verifiedAt: new Date(),
      }),
    );
  }

  /** Úprava faktu; změna stavu zapisuje auditní stopu ověření. */
  async update(id: string, dto: UpdateFactDto, userId: string): Promise<Fact> {
    const fact = await this.getOrFail(id);
    if (dto.chapter !== undefined) fact.chapter = dto.chapter;
    if (dto.kind !== undefined) fact.kind = dto.kind;
    if (dto.label !== undefined) fact.label = dto.label;
    if (dto.value !== undefined) fact.value = dto.value;
    if (dto.status !== undefined) this.applyStatus(fact, dto.status, userId);
    const saved = await this.facts.save(fact);
    if (saved.status === 'verified') await this.syncSupplierProfile(saved);
    return saved;
  }

  /** Hromadná změna stavu faktů jednoho dodavatele. */
  async bulkStatus(ids: string[], status: FactStatus, userId: string): Promise<Fact[]> {
    const facts = await this.facts.findBy({ id: In(ids) });
    for (const fact of facts) this.applyStatus(fact, status, userId);
    const saved = await this.facts.save(facts);
    for (const fact of saved) if (fact.status === 'verified') await this.syncSupplierProfile(fact);
    return saved;
  }

  private applyStatus(fact: Fact, status: FactStatus, userId: string): void {
    fact.status = status;
    fact.verifiedBy = status === 'verified' ? userId : null;
    fact.verifiedAt = status === 'verified' ? new Date() : null;
  }

  /**
   * Po ověření faktu o sídle doplní zemi do profilu dodavatele (pro mapu),
   * ale jen pokud ji správce ještě nevyplnil ručně – ruční volba má přednost.
   */
  private async syncSupplierProfile(fact: Fact): Promise<void> {
    if (fact.kind !== 'headquarters') return;
    const supplier = await this.suppliers.findOneBy({ id: fact.supplierId });
    if (!supplier || supplier.hqCountryCode) return;
    const country = findCountryInText(fact.value);
    if (!country) return;
    supplier.hqCountryCode = country.code;
    const city = fact.value.split(',')[0]?.trim();
    if (!supplier.hqCity && city && city !== country.nameCs) supplier.hqCity = city;
    await this.suppliers.save(supplier);
  }
}
