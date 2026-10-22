import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserStatusDto, AdjustWalletDto, UpdateProfileDto, CreateReportDto, ReportActionDto, SetVerificationDto, AdminSetCustomIdDto } from './dto/user.dto';
import { RequirePermissions } from '../auth/permissions.decorator';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';

@Controller('api')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/admin/list')
  @RequirePermissions('users.view')
  async getAdminUsersList(
    @Query('search') search: string,
    @Query('role') role: string,
    @Query('status') status: string,
  ) {
    return this.usersService.getAdminUsersList(search, role, status);
  }

  @Post('users/admin/create')
  @RequirePermissions('users.edit')
  async createAdminUser(@Body() dto: any) {
    return this.usersService.createAdminUser(dto);
  }

  @Put('users/admin/:id/details')
  @RequirePermissions('users.edit')
  async updateAdminUser(@Param('id') id: string, @Body() dto: any) {
    return this.usersService.updateAdminUser(id, dto);
  }

  @Delete('users/admin/:id')
  @RequirePermissions('users.edit')
  async deleteAdminUser(@Param('id') id: string) {
    return this.usersService.deleteAdminUser(id);
  }

  @Delete('users/account')
  @UseGuards(UserAuthGuard)
  async deleteMyAccount(@Request() req: any) {
    return this.usersService.deleteAccount(req.user.id);
  }

  @Delete('users/:id')
  @RequirePermissions('users.edit')
  async deleteUserAccount(@Param('id') id: string) {
    return this.usersService.deleteAccount(id);
  }

  @Get('users/admin/financial-report')
  @RequirePermissions('financial.view')
  async getAdminFinancialReport() {
    return this.usersService.getAdminFinancialReport();
  }

  @Get('users/:id/earnings-report')
  @UseGuards(UserAuthGuard)
  async getUserEarningsReport(@Param('id') id: string, @Request() req: any) {
    const isStaff = req.user?.isStaff === true || ['SUPER_ADMIN', 'AGENCY_ADMIN'].includes(req.user?.role);
    if (!isStaff && id !== req.user?.id) {
      throw new ForbiddenException('You can only view your own earnings report.');
    }
    return this.usersService.getUserEarningsReport(id);
  }

  @Get('users/:id')
  @UseGuards(UserAuthGuard)
  async getUserById(@Param('id') id: string, @Request() req: any) {
    return this.usersService.getUserById(id, req.user);
  }

  @Put('users/admin/:id/status')
  @RequirePermissions('users.ban')
  async updateUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateUserStatus(id, dto);
  }

  @Put('users/admin/:id/verification')
  @RequirePermissions('users.verify')
  async setUserVerification(@Param('id') id: string, @Body() dto: SetVerificationDto) {
    return this.usersService.setUserVerification(id, dto);
  }

  @Put('users/admin/:id/custom-id')
  @RequirePermissions('users.edit')
  async setUserCustomId(@Param('id') id: string, @Body() dto: AdminSetCustomIdDto) {
    return this.usersService.setAdminUserCustomId(id, dto);
  }

  @Post('users/admin/:id/adjust-wallet')
  @RequirePermissions('users.wallet')
  async adjustUserWallet(@Param('id') id: string, @Body() dto: AdjustWalletDto) {
    return this.usersService.adjustUserWallet(id, dto);
  }

  @Put('users/profile')
  @UseGuards(UserAuthGuard)
  async updateUserProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateUserProfile(req.user.id, dto);
  }

  @Post('reports/create')
  @UseGuards(UserAuthGuard)
  async createReport(@Request() req: any, @Body() dto: CreateReportDto) {
    return this.usersService.createReport(req.user.id, dto);
  }

  @Get('reports/admin/list')
  @RequirePermissions('support.view')
  async getReportsList(@Query('status') status?: string) {
    return this.usersService.getReportsList(status);
  }

  @Post('reports/admin/:id/action')
  @RequirePermissions('support.manage')
  async actionReport(
    @Param('id') id: string,
    @Body() dto: ReportActionDto,
    @Request() req: any,
  ) {
    const ipAddress =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || null;
    return this.usersService.actionReport(id, dto, req.user?.id, ipAddress);
  }
}
