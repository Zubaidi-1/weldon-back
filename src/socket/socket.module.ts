import { Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { SocketController } from './socket.controller';
import SocketClient from './socket-client';

@Module({
  controllers: [SocketController],
  providers: [SocketService, SocketClient],
})
export class SocketModule {}
