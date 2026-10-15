/**
 * Odpovědní DTO dodavatele pro správce (obsahuje interní poznámky a stav – nikdy pro studenta).
 */
import type { Supplier, SupplierStatus, SupplierType } from '../entities/supplier.entity';

/** Výsledek kontroly připravenosti k publikaci. */
export interface PublishCheck {
  ready: boolean;
  problems: string[];
}

export class AdminSupplierResponseDto {
  id!: string;
  slug!: string;
  name!: string;
  status!: SupplierStatus;
  supplierType!: SupplierType;
  websiteUrl!: string | null;
  tagline!: string | null;
  hqCity!: string | null;
  hqCountryCode!: string | null;
  adminNotes!: string | null;
  contentVersion!: number;
  publishedAt!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static from(s: Supplier): AdminSupplierResponseDto {
    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      status: s.status,
      supplierType: s.supplierType,
      websiteUrl: s.websiteUrl,
      tagline: s.tagline,
      hqCity: s.hqCity,
      hqCountryCode: s.hqCountryCode,
      adminNotes: s.adminNotes,
      contentVersion: s.contentVersion,
      publishedAt: s.publishedAt ? s.publishedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
