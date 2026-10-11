import { Module, forwardRef } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SignalingModule } from '../signaling/signaling.module';

@Module({
  imports: [forwardRef(() => SignalingModule)],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
