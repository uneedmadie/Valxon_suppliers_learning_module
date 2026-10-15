/**
 * DTO pro úpravu profilu dodavatele správcem (hero heslo, sídlo pro mapu, typ dodavatele).
 */
import { IsIn, IsOptional, IsString, IsUrl, Length, MaxLength, ValidateIf } from 'class-validator';
import { COUNTRIES } from '../../../common/countries';
import type { SupplierType } from '../entities/supplier.entity';

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  name?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(240)
  tagline?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(120)
  hqCity?: string | null;

  /** Jen země ze slovníku – kvůli souřadnicím orientační mapy. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(COUNTRIES.map((c) => c.code), { message: 'Neznámý kód země.' })
  hqCountryCode?: string | null;

  @IsOptional()
  @IsIn(['unknown', 'specialist', 'narrow', 'generalist'])
  supplierType?: SupplierType;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  websiteUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(5000)
  adminNotes?: string | null;
}
