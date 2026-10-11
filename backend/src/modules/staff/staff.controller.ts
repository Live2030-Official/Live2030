import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('api/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('catalog')
  @RequirePermissions('staff.view')
  async catalog() {
    return this.staffService.getCatalog();
  }

  @Get('list')
  @RequirePermissions('staff.view')
  async list() {
    return this.staffService.listStaff();
  }

  @Post('create')
  @RequirePermissions('staff.manage')
  async create(@Body() dto: CreateStaffDto) {
    return this.staffService.createStaff(dto);
  }

  @Put(':id')
  @RequirePermissions('staff.manage')
  async update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.updateStaff(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('staff.manage')
  async remove(@Param('id') id: string) {
    return this.staffService.deleteStaff(id);
  }
}
