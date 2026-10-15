/**
 * Entita produktu. Rozlišuje bestsellery zadané správcem (`bestseller`) a produkty
 * objevené v podkladech (`discovered`). Systém nikdy sám neoznačí produkt za bestseller.
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Původ záznamu produktu. */
export type ProductListType = 'bestseller' | 'discovered';

/** Stav párování produktu s podklady. */
export type ProductMatchStatus = 'pending' | 'matched' | 'ambiguous' | 'not_found' | 'confirmed';

/** Kandidát nalezený při párování (pro ruční výběr správcem). */
export interface ProductCandidate {
  name: string;
  url: string | null;
  sku: string | null;
  imageUrl: string | null;
  score: number;
  location: string;
}

/** Produkt dodavatele použitý v kapitole 4. */
@Entity('products')
@Index(['supplierId'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  supplierId!: string;

  @Column({ type: 'varchar', length: 16 })
  listType!: ProductListType;

  /** Pořadí v seznamu bestsellerů zadaném správcem. */
  @Column({ type: 'integer', default: 0 })
  position!: number;

  /** Vstup správce – název, SKU a URL přesně tak, jak byly zadány. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  inputName!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  inputSku!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  inputUrl!: string | null;

  /** Ověřené/spárované údaje. */
  @Column({ type: 'varchar', length: 300 })
  name!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  sku!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  productUrl!: string | null;

  /** Originální fotografie spárovaného produktu (vzdálená URL). */
  @Column({ type: 'varchar', length: 2048, nullable: true })
  imageUrl!: string | null;

  /** Stránka, ze které fotografie pochází – evidence původu. */
  @Column({ type: 'varchar', length: 2048, nullable: true })
  imageSourceUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  material!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  matchStatus!: ProductMatchStatus;

  @Column({ type: 'simple-json', nullable: true })
  candidates!: ProductCandidate[] | null;

  /** Správce zařadil produkt do výukové kapitoly (reprezentativní výběr / potvrzený bestseller). */
  @Column({ type: 'boolean', default: false })
  showInLesson!: boolean;

  @Column({ type: 'varchar', length: 36, nullable: true })
  sourceId!: string | null;

  @Column({ type: 'varchar', length: 400, nullable: true })
  location!: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
