import { Controller, Get, Put, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { SupportService } from './support.service';
import { UpdateSupportContactDto } from './dto/support.dto';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('api/support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Public endpoint for mobile application to fetch support details
   */
  @Get('contact')
  getContactDetails() {
    return this.supportService.getContactDetails();
  }

  /**
   * Admin endpoint to dynamically update support & helpline details
   */
  @Put('admin/contact')
  @RequirePermissions('support.manage')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  updateContactDetails(@Body() dto: UpdateSupportContactDto) {
    return this.supportService.updateContactDetails(dto);
  }
}
