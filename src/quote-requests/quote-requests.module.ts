import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuoteRequestsController } from './quote-requests.controller';
import { QuoteRequestsService } from './quote-requests.service';
import { QuoteRequest } from './entities/quote-request.entity';
import { QuoteRequestFile } from './entities/quote-request-file.entity';
import { Product } from '../products/entities/product.entity';
import { UsuarioEntity } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuoteRequest, QuoteRequestFile, Product, UsuarioEntity])],
  controllers: [QuoteRequestsController],
  providers: [QuoteRequestsService],
})
export class QuoteRequestsModule {}
