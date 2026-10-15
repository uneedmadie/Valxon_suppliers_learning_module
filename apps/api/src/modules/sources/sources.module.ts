/**
 * Modul zdrojů podkladů dodavatele.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SourceSegment } from './entities/source-segment.entity';
import { Source } from './entities/source.entity';
import { SourceStorageService } from './source-storage.service';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';

@Module({
  imports: [TypeOrmModule.forFeature([Source, SourceSegment, Supplier])],
  controllers: [SourcesController],
  providers: [SourcesService, SourceStorageService],
  exports: [SourcesService],
})
export class SourcesModule {}
