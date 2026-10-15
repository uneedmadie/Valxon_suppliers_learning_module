/**
 * DTO pro založení dodavatele správcem: název, web a volitelný seznam bestsellerů.
 * Bestsellery vždy zadává člověk – systém je nikdy nevybírá sám.
 */
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUrl, Length, MaxLength, ValidateNested } from 'class-validator';

/** Jedna položka seznamu bestsellerů od správce (název povinný, SKU/URL doporučené). */
export class BestsellerInputDto {
  @IsString()
  @Length(2, 300)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sku?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'URL bestselleru musí začínat http(s)://' })
  @MaxLength(2048)
  url?: string;
}

/** Založení nového dodavatele. */
export class CreateSupplierDto {
  @IsString()
  @Length(2, 160)
  name!: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'Web dodavatele musí být platná URL začínající http(s)://' })
  @MaxLength(2048)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  adminNotes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Seznam bestsellerů může mít nejvýše 10 položek.' })
  @ValidateNested({ each: true })
  @Type(() => BestsellerInputDto)
  bestsellers?: BestsellerInputDto[];
}
