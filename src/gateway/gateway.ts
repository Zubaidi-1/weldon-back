// gateway/socket.gateway.ts
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(@ConnectedSocket() socket: Socket) {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.ACCESS_TOKEN,
      });

      const userId = payload.sub ?? payload.userId;
      const roleName = payload.roleName ?? payload.role;

      socket.data.userId = userId;
      socket.data.roleName = roleName;

      await socket.join(`user:${userId}`);
      if (roleName === 'ADMIN') {
        await socket.join('admins');
      }

      console.log(`User ${userId} connected`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() socket: Socket) {
    console.log(`Socket disconnected: ${socket.id}`);
  }

  emitNotificationToUser(userId: string | number, notification: unknown) {
    this.server.to(`user:${userId}`).emit('notification.created', notification);
  }

  emitNotificationToAdmins(notification: unknown) {
    this.server.to('admins').emit('notification.created', notification);
  }

  emitNotificationToAll(notification: unknown) {
    this.server.emit('notification.created', notification);
  }
}
