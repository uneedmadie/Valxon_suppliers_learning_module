/**
 * Správcovské REST endpointy produktů: seznam, bestsellery, párování a ruční potvrzení.
 */
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { AdminProductResponseDto, ConfirmCandidateDto, ReplaceBestsellersDto, UpdateProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@Controller('admin')
@Roles('admin')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('suppliers/:supplierId/products')
  async list(@Param('supplierId', ParseUUIDPipe) supplierId: string): Promise<AdminProductResponseDto[]> {
    return (await this.products.list(supplierId)).map((p) => AdminProductResponseDto.from(p));
  }

  /** Nahradí seznam bestsellerů a hned je zkusí spárovat s podklady. */
  @Put('suppliers/:supplierId/bestsellers')
  async replaceBestsellers(@Param('supplierId', ParseUUIDPipe) supplierId: string, @Body() dto: ReplaceBestsellersDto): Promise<AdminProductResponseDto[]> {
    await this.products.replaceBestsellers(supplierId, dto.items);
    await this.products.matchBestsellers(supplierId);
    return (await this.products.list(supplierId)).map((p) => AdminProductResponseDto.from(p));
  }

  @Post('suppliers/:supplierId/products/match')
  @HttpCode(200)
  async match(@Param('supplierId', ParseUUIDPipe) supplierId: string): Promise<AdminProductResponseDto[]> {
    await this.products.matchBestsellers(supplierId);
    return (await this.products.list(supplierId)).map((p) => AdminProductResponseDto.from(p));
  }

  @Patch('products/:id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto): Promise<AdminProductResponseDto> {
    return AdminProductResponseDto.from(await this.products.update(id, dto));
  }

  @Post('products/:id/confirm-candidate')
  @HttpCode(200)
  async confirm(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConfirmCandidateDto): Promise<AdminProductResponseDto> {
    return AdminProductResponseDto.from(await this.products.confirmCandidate(id, dto.index));
  }
}
