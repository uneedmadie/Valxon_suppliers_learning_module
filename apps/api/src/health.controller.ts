/**
 * Health endpoint – ověření, že API běží a databáze odpovídá; uvádí i pravdivý stav AI.
 */
import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from './modules/auth/auth.decorators';
import { AiExtractionService } from './modules/imports/pipeline/ai-extraction.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ai: AiExtractionService,
  ) {}

  @Public()
  @Get()
  async health(): Promise<{ status: 'ok'; database: 'ok'; ai: string; time: string }> {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', database: 'ok', ai: this.ai.status().status, time: new Date().toISOString() };
  }
}
