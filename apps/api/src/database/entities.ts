/**
 * Centrální seznam TypeORM entit – sdílí ho runtime konfigurace i CLI data source pro migrace.
 */
import { ChapterAnswer } from '../modules/progress/entities/chapter-answer.entity';
import { Chapter } from '../modules/chapters/entities/chapter.entity';
import { Fact } from '../modules/facts/entities/fact.entity';
import { ImportJob } from '../modules/imports/entities/import-job.entity';
import { Product } from '../modules/products/entities/product.entity';
import { Question } from '../modules/questions/entities/question.entity';
import { SourceSegment } from '../modules/sources/entities/source-segment.entity';
import { Source } from '../modules/sources/entities/source.entity';
import { Supplier } from '../modules/suppliers/entities/supplier.entity';
import { User } from '../modules/users/entities/user.entity';

export const ENTITIES = [User, Supplier, Source, SourceSegment, ImportJob, Fact, Chapter, Question, Product, ChapterAnswer];
