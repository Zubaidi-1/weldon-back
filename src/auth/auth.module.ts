import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { USER_REPOSITORY } from 'src/user/user.repo.token';
import { UserPrismaRepository } from 'src/user/infrastructure/prisma/user.prisma.repository';

@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: USER_REPOSITORY,
      useClass: UserPrismaRepository,
    },
  ],
})
export class AuthModule {}
