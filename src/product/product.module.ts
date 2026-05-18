import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PRODUCT_REPOSITORY } from './product.repo.token';
import { ProductPrismaRepository } from './infrastructure/prisma/product.prisma.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [ProductController],
  imports: [PrismaModule],
  providers: [
    ProductService,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductPrismaRepository,
    },
  ],
})
export class ProductModule {}
