/**
 * Správcovské REST endpointy kapitol: výpis s otázkami, úprava, schválení, přegenerování návrhů.
 */
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { QuestionsService } from '../questions/questions.service';
import { ChaptersService } from './chapters.service';
import { AdminChapterResponseDto, UpdateChapterDto } from './dto/chapter.dto';

@Controller('admin')
@Roles('admin')
export class ChaptersController {
  constructor(
    private readonly chapters: ChaptersService,
    private readonly questions: QuestionsService,
  ) {}

  @Get('suppliers/:supplierId/chapters')
  async list(@Param('supplierId', ParseUUIDPipe) supplierId: string): Promise<AdminChapterResponseDto[]> {
    return (await this.chapters.listWithQuestions(supplierId)).map(({ chapter, question }) => AdminChapterResponseDto.from(chapter, question));
  }

  @Post('suppliers/:supplierId/drafts')
  @HttpCode(200)
  async regenerate(@Param('supplierId', ParseUUIDPipe) supplierId: string): Promise<AdminChapterResponseDto[]> {
    await this.chapters.regenerateDrafts(supplierId);
    return this.list(supplierId);
  }

  @Patch('chapters/:id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateChapterDto): Promise<AdminChapterResponseDto> {
    const chapter = await this.chapters.update(id, dto);
    return AdminChapterResponseDto.from(chapter, await this.questions.findByChapter(chapter.id));
  }

  @Post('chapters/:id/approve')
  @HttpCode(200)
  async approve(@Param('id', ParseUUIDPipe) id: string): Promise<AdminChapterResponseDto> {
    const chapter = await this.chapters.approve(id);
    return AdminChapterResponseDto.from(chapter, await this.questions.findByChapter(chapter.id));
  }
}
