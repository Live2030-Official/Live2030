import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ResellersService } from './resellers.service';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Coin Resellers & Merchants')
@Controller('api/resellers')
export class ResellersController {
  constructor(private readonly resellersService: ResellersService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of verified coin vendors for in-app recharge directory' })
  async getVerifiedResellers() {
    return this.resellersService.getVerifiedResellers();
  }

  @Post('admin/create')
  @RequirePermissions('resellers.manage')
  @ApiOperation({ summary: 'Super Admin: Register new coin reseller merchant' })
  async createReseller(@Body() dto: any) {
    return this.resellersService.createReseller(dto);
  }

  @Put('admin/:id')
  @RequirePermissions('resellers.manage')
  @ApiOperation({ summary: 'Super Admin: Edit coin vendor details' })
  async updateReseller(@Param('id') id: string, @Body() dto: any) {
    return this.resellersService.updateReseller(id, dto);
  }

  @Delete('admin/:id')
  @RequirePermissions('resellers.manage')
  @ApiOperation({ summary: 'Super Admin: Remove coin vendor' })
  async deleteReseller(@Param('id') id: string) {
    return this.resellersService.deleteReseller(id);
  }

  @Post('admin/:id/topup')
  @RequirePermissions('resellers.manage')
  @ApiOperation({ summary: 'Super Admin: Top up vendor coin inventory' })
  async topUpStock(@Param('id') id: string, @Body('amount') amount: number) {
    return this.resellersService.topUpStock(id, amount);
  }
}
