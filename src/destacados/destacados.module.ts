import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestacadosController } from './destacados.controller';
import { DestacadosService } from './destacados.service';
import { SeccionDestacadoEntity } from './entities/seccion-destacado.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SeccionDestacadoEntity])],
  controllers: [DestacadosController],
  providers: [DestacadosService],
  exports: [DestacadosService],
})
export class DestacadosModule {}