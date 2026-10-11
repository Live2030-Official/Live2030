import { Module, forwardRef } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SignalingModule } from '../signaling/signaling.module';

@Module({
  imports: [PrismaModule, forwardRef(() => SignalingModule)],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
