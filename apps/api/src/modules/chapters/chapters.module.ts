/**
 * Modul kapitol výukové prezentace.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FactsModule } from '../facts/facts.module';
import { Product } from '../products/entities/product.entity';
import { Question } from '../questions/entities/question.entity';
import { QuestionsModule } from '../questions/questions.module';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ChaptersController } from './chapters.controller';
import { ChaptersService } from './chapters.service';
import { Chapter } from './entities/chapter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chapter, Question, Supplier, Product]), FactsModule, QuestionsModule],
  controllers: [ChaptersController],
  providers: [ChaptersService],
  exports: [ChaptersService],
})
export class ChaptersModule {}
