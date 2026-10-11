import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto, BindHostDto } from './dto/agency.dto';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('api/agencies')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Get()
  @RequirePermissions('agencies.view')
  async getAgencies() {
    return this.agenciesService.getAgencies();
  }

  @Get(':id/hosts')
  @RequirePermissions('agencies.view')
  async getAgencyHosts(@Param('id') id: string) {
    return this.agenciesService.getAgencyHosts(id);
  }

  @Post('register')
  async registerAgency(@Body() dto: CreateAgencyDto) {
    return this.agenciesService.registerAgency(dto);
  }

  @Put('admin/:id')
  @RequirePermissions('agencies.manage')
  async updateAgency(@Param('id') id: string, @Body() dto: Partial<CreateAgencyDto>) {
    return this.agenciesService.updateAgency(id, dto);
  }

  @Put('admin/:id/revenue')
  @RequirePermissions('agencies.manage')
  async updateAgencyRevenue(
    @Param('id') id: string,
    @Body('revenueUSD') revenueUSD: number,
    @Body('notes') notes?: string,
  ) {
    return this.agenciesService.updateAgencyRevenue(id, Number(revenueUSD), notes);
  }

  @Delete('admin/:id')
  @RequirePermissions('agencies.manage')
  async deleteAgency(@Param('id') id: string) {
    return this.agenciesService.deleteAgency(id);
  }

  @Post('bind-host')
  async bindHost(@Body() dto: BindHostDto) {
    return this.agenciesService.bindHost(dto);
  }

  @Post('login')
  async loginAgency(
    @Body('codeOrEmail') codeOrEmail: string,
    @Body('password') password: string,
  ) {
    return this.agenciesService.loginAgency(codeOrEmail, password);
  }

  @Post('admin/:id/coins/recharge')
  @RequirePermissions('agencies.manage')
  async rechargeAgencyCoins(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('notes') notes?: string,
  ) {
    return this.agenciesService.rechargeAgencyCoins(id, Number(amount), notes);
  }

  @Put('admin/:id/password')
  @RequirePermissions('agencies.manage')
  async updateAgencyPassword(
    @Param('id') id: string,
    @Body('password') password: string,
  ) {
    return this.agenciesService.updateAgencyPassword(id, password);
  }

  @Post(':id/transfer-coins')
  async transferCoinsToUser(
    @Param('id') agencyId: string,
    @Body('targetUserIdOrUsername') targetUserIdOrUsername: string,
    @Body('amount') amount: number,
    @Body('notes') notes?: string,
  ) {
    return this.agenciesService.transferCoinsToUser(
      agencyId,
      targetUserIdOrUsername,
      Number(amount),
      notes,
    );
  }

  @Get(':id/coin-transfers')
  async getAgencyTransfers(@Param('id') agencyId: string) {
    return this.agenciesService.getAgencyTransfers(agencyId);
  }

  @Get('host-status/:hostId')
  async getHostAgencyStatus(@Param('hostId') hostId: string) {
    return this.agenciesService.getHostAgencyStatus(hostId);
  }
}
