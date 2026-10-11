import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SignalingModule } from '../signaling/signaling.module';
import { AuditService } from './audit.service';
import { NotificationsService } from './notifications.service';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { AdminModerationController } from './admin-moderation.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => SignalingModule)],
  controllers: [ModerationController, AdminModerationController],
  providers: [AuditService, NotificationsService, ModerationService],
  exports: [AuditService, NotificationsService, ModerationService],
})
export class ModerationModule {}
