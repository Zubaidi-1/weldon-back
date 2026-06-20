import { Injectable, OnModuleInit } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

@Injectable()
export default class SocketClient implements OnModuleInit {
  public socketClient: Socket;
  onModuleInit() {}
  constructor() {
    this.socketClient = io('http://localhost:3001');
  }
}
