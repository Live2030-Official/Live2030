import { Controller, Get, Post, Put, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CoinPackagesService } from './coin-packages.service';
import { CreateCoinPackageDto, UpdateCoinPackageDto } from './dto/coin-package.dto';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Coin Packages')
@Controller('api/coin-packages')
export class CoinPackagesController {
  constructor(private readonly coinPackagesService: CoinPackagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get active coin packages for the recharge website & mobile checkout' })
  async getActivePackages() {
    return this.coinPackagesService.getActivePackages();
  }

  @Get('admin/all')
  @RequirePermissions('coin_packages.view')
  @ApiOperation({ summary: 'Super Admin: Get all coin packages (including disabled)' })
  async getAllPackages() {
    return this.coinPackagesService.getAllPackages();
  }

  @Post('admin/create')
  @RequirePermissions('coin_packages.manage')
  @ApiOperation({ summary: 'Super Admin: Add a new coin package' })
  async createPackage(@Body() dto: CreateCoinPackageDto) {
    return this.coinPackagesService.createPackage(dto);
  }

  @Put('admin/:id')
  @RequirePermissions('coin_packages.manage')
  @ApiOperation({ summary: 'Super Admin: Edit a coin package (price/coins/badge/status)' })
  async updatePackage(@Param('id') id: string, @Body() dto: UpdateCoinPackageDto) {
    return this.coinPackagesService.updatePackage(id, dto);
  }

  @Patch('admin/:id/toggle')
  @RequirePermissions('coin_packages.manage')
  @ApiOperation({ summary: 'Super Admin: Enable or disable a coin package' })
  async togglePackage(@Param('id') id: string, @Body('isActive') isActive?: boolean) {
    return this.coinPackagesService.togglePackage(id, isActive);
  }

  @Delete('admin/:id')
  @RequirePermissions('coin_packages.manage')
  @ApiOperation({ summary: 'Super Admin: Delete a coin package' })
  async deletePackage(@Param('id') id: string) {
    return this.coinPackagesService.deletePackage(id);
  }
}
