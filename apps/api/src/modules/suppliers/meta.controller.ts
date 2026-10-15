/**
 * Číselníky pro správcovské formuláře (země sídla pro mapu), aby frontend nedržel kopii dat.
 */
import { Controller, Get } from '@nestjs/common';
import { COUNTRIES } from '../../common/countries';
import { Roles } from '../auth/auth.decorators';

@Controller('admin/meta')
@Roles('admin')
export class MetaController {
  @Get('countries')
  countries(): { code: string; name: string }[] {
    return COUNTRIES.map((c) => ({ code: c.code, name: c.nameCs })).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  }
}
