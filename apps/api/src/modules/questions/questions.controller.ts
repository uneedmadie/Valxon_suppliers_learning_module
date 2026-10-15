/**
 * Správcovské REST endpointy kontrolních otázek.
 */
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { AdminQuestionResponseDto, UpsertQuestionDto } from './dto/question.dto';
import { QuestionsService } from './questions.service';

@Controller('admin/chapters/:chapterId/question')
@Roles('admin')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Put()
  async upsert(@Param('chapterId', ParseUUIDPipe) chapterId: string, @Body() dto: UpsertQuestionDto): Promise<AdminQuestionResponseDto> {
    return AdminQuestionResponseDto.from(await this.questions.upsert(chapterId, dto));
  }

  @Post('approve')
  @HttpCode(200)
  async approve(@Param('chapterId', ParseUUIDPipe) chapterId: string): Promise<AdminQuestionResponseDto> {
    return AdminQuestionResponseDto.from(await this.questions.approve(chapterId));
  }
}
