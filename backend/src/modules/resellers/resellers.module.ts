import { Module, forwardRef } from '@nestjs/common';
import { ResellersController } from './resellers.controller';
import { ResellersService } from './resellers.service';
import { AgenciesModule } from '../agencies/agencies.module';

@Module({
  imports: [forwardRef(() => AgenciesModule)],
  controllers: [ResellersController],
  providers: [ResellersService],
  exports: [ResellersService],
})
export class ResellersModule {}

