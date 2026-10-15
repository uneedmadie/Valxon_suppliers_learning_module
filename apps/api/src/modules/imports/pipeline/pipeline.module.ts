/**
 * Modul síťové a extrakční infrastruktury importu (bezpečný HTTP klient, crawler, stav AI).
 * Sdílí ho import i párování produktů.
 */
import { Module } from '@nestjs/common';
import { AiExtractionService } from './ai-extraction.service';
import { SafeHttpClient } from './safe-http.client';
import { SiteCrawlerService } from './site-crawler.service';

@Module({
  providers: [SafeHttpClient, SiteCrawlerService, AiExtractionService],
  exports: [SafeHttpClient, SiteCrawlerService, AiExtractionService],
})
export class PipelineModule {}
