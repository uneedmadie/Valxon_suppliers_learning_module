/**
 * Správcovské REST endpointy faktů: výpis s citacemi, ruční doplnění, úprava a ověření.
 */
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../auth/auth.decorators';
import { BulkFactStatusDto, CreateFactDto, FactResponseDto, UpdateFactDto } from './dto/fact.dto';
import { FactsService } from './facts.service';

@Controller('admin')
@Roles('admin')
export class FactsController {
  constructor(private readonly facts: FactsService) {}

  @Get('suppliers/:supplierId/facts')
  async list(@Param('supplierId', ParseUUIDPipe) supplierId: string): Promise<FactResponseDto[]> {
    return (await this.facts.listForSupplier(supplierId)).map((f) => FactResponseDto.from(f));
  }

  @Post('suppliers/:supplierId/facts')
  async create(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Body() dto: CreateFactDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FactResponseDto> {
    return FactResponseDto.from(await this.facts.createManual(supplierId, dto, user.id));
  }

  @Patch('facts/bulk-status')
  async bulk(@Body() dto: BulkFactStatusDto, @CurrentUser() user: AuthUser): Promise<FactResponseDto[]> {
    return (await this.facts.bulkStatus(dto.ids, dto.status, user.id)).map((f) => FactResponseDto.from(f));
  }

  @Patch('facts/:id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFactDto, @CurrentUser() user: AuthUser): Promise<FactResponseDto> {
    return FactResponseDto.from(await this.facts.update(id, dto, user.id));
  }
}
