/**
 * Správcovské REST endpointy dodavatelů: seznam, založení, úprava, kontrola a publikace.
 */
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { AdminSupplierResponseDto, PublishCheck } from './dto/supplier-response.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('admin/suppliers')
@Roles('admin')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  async list(): Promise<AdminSupplierResponseDto[]> {
    return (await this.suppliers.list()).map((s) => AdminSupplierResponseDto.from(s));
  }

  @Post()
  async create(@Body() dto: CreateSupplierDto): Promise<AdminSupplierResponseDto> {
    return AdminSupplierResponseDto.from(await this.suppliers.create(dto));
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<AdminSupplierResponseDto> {
    return AdminSupplierResponseDto.from(await this.suppliers.getOrFail(id));
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto): Promise<AdminSupplierResponseDto> {
    return AdminSupplierResponseDto.from(await this.suppliers.update(id, dto));
  }

  @Get(':id/publish-check')
  publishCheck(@Param('id', ParseUUIDPipe) id: string): Promise<PublishCheck> {
    return this.suppliers.publishCheck(id);
  }

  @Post(':id/publish')
  @HttpCode(200)
  async publish(@Param('id', ParseUUIDPipe) id: string): Promise<AdminSupplierResponseDto> {
    return AdminSupplierResponseDto.from(await this.suppliers.publish(id));
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  async unpublish(@Param('id', ParseUUIDPipe) id: string): Promise<AdminSupplierResponseDto> {
    return AdminSupplierResponseDto.from(await this.suppliers.unpublish(id));
  }
}
