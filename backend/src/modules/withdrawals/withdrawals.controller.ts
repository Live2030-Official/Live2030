import { Controller, Get, Post, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import {
  RequestWithdrawalDto,
  ReviewWithdrawalDto,
  ApproveWithdrawalDto,
} from './dto/withdrawal.dto';
import { RequirePermissions } from '../auth/permissions.decorator';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';

@Controller('api/withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post('request')
  @UseGuards(UserAuthGuard)
  async requestWithdrawal(@Request() req: any, @Body() dto: RequestWithdrawalDto) {
    return this.withdrawalsService.requestWithdrawal(dto, req.user.id);
  }

  @Get('pending')
  @RequirePermissions('withdrawals.view')
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
