import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { GatewayController } from './gateway.controller';
import { SocketGateway } from './gateway';

@Module({
  controllers: [GatewayController],
  providers: [GatewayService, SocketGateway],
  exports: [SocketGateway],
})
export class GatewayModule {}
