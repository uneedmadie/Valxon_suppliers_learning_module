/**
 * Modul importu podkladů dodavatele.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChaptersModule } from '../chapters/chapters.module';
import { FactsModule } from '../facts/facts.module';
import { ProductsModule } from '../products/products.module';
import { SourcesModule } from '../sources/sources.module';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ImportJob } from './entities/import-job.entity';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { PipelineModule } from './pipeline/pipeline.module';

@Module({
  imports: [TypeOrmModule.forFeature([ImportJob, Supplier]), PipelineModule, SourcesModule, FactsModule, ProductsModule, ChaptersModule],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
