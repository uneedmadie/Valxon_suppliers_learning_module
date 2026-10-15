/**
 * Modul studentské části (výuková prezentace a odpovědi).
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Fact } from '../facts/entities/fact.entity';
import { Product } from '../products/entities/product.entity';
import { ProgressModule } from '../progress/progress.module';
import { Question } from '../questions/entities/question.entity';
import { Source } from '../sources/entities/source.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, Chapter, Question, Fact, Product, Source]), ProgressModule],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
