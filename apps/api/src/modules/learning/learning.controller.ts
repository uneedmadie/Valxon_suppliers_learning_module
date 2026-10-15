/**
 * REST endpointy studia: katalog publikovaných dodavatelů, výuková prezentace,
 * odeslání odpovědi a náhled správce.
 */
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../auth/auth.decorators';
import { SubmitAnswerDto, SubmitAnswerResponseDto } from '../progress/dto/progress.dto';
import { ProgressService } from '../progress/progress.service';
import { LearnSupplierDto, LearnSupplierSummaryDto } from './dto/learning.dto';
import { LearningService } from './learning.service';

@Controller()
export class LearningController {
  constructor(
    private readonly learning: LearningService,
    private readonly progress: ProgressService,
  ) {}

  @Get('learn/suppliers')
  list(@CurrentUser() user: AuthUser): Promise<LearnSupplierSummaryDto[]> {
    return this.learning.listPublished(user.id);
  }

  @Get('learn/suppliers/:slug')
  get(@Param('slug') slug: string, @CurrentUser() user: AuthUser): Promise<LearnSupplierDto> {
    return this.learning.getPublished(slug, user.id);
  }

  /** Odeslání odpovědi – jediná akce, která dokončuje kapitolu (pravidlo B). */
  @Post('learn/chapters/:chapterId/answer')
  @HttpCode(200)
  answer(
    @Param('chapterId', ParseUUIDPipe) chapterId: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SubmitAnswerResponseDto> {
    return this.progress.submit(user.id, chapterId, dto);
  }

  /** Studentský náhled před publikací (jen správce). */
  @Get('admin/suppliers/:id/preview')
  @Roles('admin')
  preview(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<LearnSupplierDto> {
    return this.learning.preview(id, user.id);
  }
}
