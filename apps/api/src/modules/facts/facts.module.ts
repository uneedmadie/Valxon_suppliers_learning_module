/**
 * Modul faktů o dodavatelích.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Fact } from './entities/fact.entity';
import { FactsController } from './facts.controller';
import { FactsService } from './facts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Fact, Supplier])],
  controllers: [FactsController],
  providers: [FactsService],
  exports: [FactsService],
})
export class FactsModule {}
