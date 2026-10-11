import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import {
  RequestWithdrawalDto,
  ReviewWithdrawalDto,
  ApproveWithdrawalDto,
} from './dto/withdrawal.dto';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('api/withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post('request')
  async requestWithdrawal(@Body() dto: RequestWithdrawalDto) {
    return this.withdrawalsService.requestWithdrawal(dto);
  }

  @Get('pending')
  async getPendingWithdrawals() {
    return this.withdrawalsService.getPendingWithdrawals();
  }

  @Get('admin/all')
  @RequirePermissions('financial.view')
  async getAllWithdrawals(@Query('status') status?: string) {
    return this.withdrawalsService.getAllWithdrawals(status);
  }

  @Post(':id/approve')
  @RequirePermissions('withdrawals.manage')
  async approveWithdrawal(@Param('id') id: string, @Body() dto: ApproveWithdrawalDto) {
    return this.withdrawalsService.approveWithdrawal(id, dto);
  }

  @Post(':id/reject')
  @RequirePermissions('withdrawals.manage')
  async rejectWithdrawal(@Param('id') id: string, @Body() dto: ReviewWithdrawalDto) {
    return this.withdrawalsService.rejectWithdrawal(id, dto);
  }
}
