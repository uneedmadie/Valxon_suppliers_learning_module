/**
 * DTO produktů: úprava správcem, potvrzení kandidáta a odpověď pro review.
 */
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUrl, Length, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { BestsellerInputDto } from '../../suppliers/dto/create-supplier.dto';
import type { Product, ProductCandidate, ProductListType, ProductMatchStatus } from '../entities/product.entity';

/** Nahrazení seznamu bestsellerů (max. 10, pořadí = pořadí v kapitole). */
export class ReplaceBestsellersDto {
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BestsellerInputDto)
  items!: BestsellerInputDto[];
}

/** Ruční úprava produktu (např. doplnění fotografie, zařazení do lekce). */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(2, 300)
  name?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(300)
  material?: string | null;

  /** Fotografii nahrazuje správce, pokud ji nešlo bezpečně spárovat. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  showInLesson?: boolean;
}

/** Přidání produktu podle URL jeho stránky. */
export class AddProductFromUrlDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;
}

/** Potvrzení jednoho z kandidátů párování. */
export class ConfirmCandidateDto {
  @IsInt()
  @Min(0)
  index!: number;
}

/** Produkt v pohledu správce. */
export class AdminProductResponseDto {
  id!: string;
  listType!: ProductListType;
  position!: number;
  inputName!: string | null;
  inputSku!: string | null;
  inputUrl!: string | null;
  name!: string;
  sku!: string | null;
  productUrl!: string | null;
  imageUrl!: string | null;
  imageSourceUrl!: string | null;
  description!: string | null;
  material!: string | null;
  category!: string | null;
  matchStatus!: ProductMatchStatus;
  candidates!: ProductCandidate[];
  showInLesson!: boolean;
  location!: string | null;

  static from(p: Product): AdminProductResponseDto {
    return {
      id: p.id,
      listType: p.listType,
      position: p.position,
      inputName: p.inputName,
      inputSku: p.inputSku,
      inputUrl: p.inputUrl,
      name: p.name,
      sku: p.sku,
      productUrl: p.productUrl,
      imageUrl: p.imageUrl,
      imageSourceUrl: p.imageSourceUrl,
      description: p.description,
      material: p.material,
      category: p.category,
      matchStatus: p.matchStatus,
      candidates: p.candidates ?? [],
      showInLesson: p.showInLesson,
      location: p.location,
    };
  }
}
