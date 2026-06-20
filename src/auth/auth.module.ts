import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { USER_REPOSITORY } from 'src/user/user.repo.token';
import { UserPrismaRepository } from 'src/user/infrastructure/prisma/user.prisma.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [
    MailerModule,
    JwtModule.register({
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    {
      provide: USER_REPOSITORY,

      useClass: UserPrismaRepository,
    },
  ],
})
export class AuthModule {}
