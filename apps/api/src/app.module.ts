/**
 * Kořenový modul API – skládá doménové moduly VALXON Academy.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigModule } from './config/app-config';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { ChaptersModule } from './modules/chapters/chapters.module';
import { FactsModule } from './modules/facts/facts.module';
import { ImportsModule } from './modules/imports/imports.module';
import { PipelineModule } from './modules/imports/pipeline/pipeline.module';
import { LearningModule } from './modules/learning/learning.module';
import { ProductsModule } from './modules/products/products.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { SourcesModule } from './modules/sources/sources.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    // `.env` se načte do process.env dříve, než AppConfig čte hodnoty.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    AppConfigModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    SuppliersModule,
    SourcesModule,
    ImportsModule,
    FactsModule,
    ChaptersModule,
    QuestionsModule,
    ProductsModule,
    LearningModule,
    PipelineModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
