import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GiftsService } from './gifts.service';
import { SendGiftDto, CreateGiftDto } from './dto/gift.dto';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Virtual Gifting & Economy')
@Controller('api/gifts')
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active gift catalogue for mobile gift tray and admin' })
  async getGifts() {
    return this.giftsService.getGifts();
  }

  @Get('economics')
  @RequirePermissions('economics.manage')
  @ApiOperation({ summary: 'Super Admin: Get platform revenue distribution split matrix' })
  async getEconomics() {
    return this.giftsService.getEconomics();
  }

  @Put('economics')
  @RequirePermissions('economics.manage')
  @ApiOperation({ summary: 'Super Admin: Update platform revenue distribution split matrix' })
  async updateEconomics(@Body() dto: any) {
    return this.giftsService.updateEconomics(dto);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send virtual gift in live room' })
  async sendGift(@Body() dto: SendGiftDto) {
    const senderId = dto.senderId || 'user-supporter';
    return this.giftsService.sendGift(senderId, dto);
  }

  @Post('admin/create')
  @RequirePermissions('gifts.manage')
  @ApiOperation({ summary: 'Super Admin: Add new gift to catalog' })
  async createGift(@Body() dto: CreateGiftDto) {
    return this.giftsService.createGift(dto);
  }

  @Put('admin/:id')
  @RequirePermissions('gifts.manage')
  @ApiOperation({ summary: 'Super Admin: Update existing gift' })
  async updateGift(@Param('id') id: string, @Body() dto: Partial<CreateGiftDto>) {
    return this.giftsService.updateGift(id, dto);
  }

  @Delete('admin/:id')
  @RequirePermissions('gifts.manage')
  @ApiOperation({ summary: 'Super Admin: Delete gift from catalog' })
  async deleteGift(@Param('id') id: string) {
    return this.giftsService.deleteGift(id);
  }
}
