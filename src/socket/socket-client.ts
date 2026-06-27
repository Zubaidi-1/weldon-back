import { Injectable, OnModuleInit } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

@Injectable()
export default class SocketClient implements OnModuleInit {
  public socketClient: Socket;
  onModuleInit() {}
  constructor() {
    const backendUrl =
      process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:3001';

    this.socketClient = io(backendUrl);
  }
}
