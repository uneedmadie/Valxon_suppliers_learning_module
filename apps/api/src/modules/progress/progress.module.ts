/**
 * Modul progresu studia.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Question } from '../questions/entities/question.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ChapterAnswer } from './entities/chapter-answer.entity';
import { ProgressService } from './progress.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChapterAnswer, Chapter, Question, Supplier])],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
