/**
 * Modul dodavatelů.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChaptersModule } from '../chapters/chapters.module';
import { Chapter } from '../chapters/entities/chapter.entity';
import { ProductsModule } from '../products/products.module';
import { Question } from '../questions/entities/question.entity';
import { SourcesModule } from '../sources/sources.module';
import { Supplier } from './entities/supplier.entity';
import { MetaController } from './meta.controller';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, Chapter, Question]), SourcesModule, ProductsModule, ChaptersModule],
  controllers: [SuppliersController, MetaController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
