import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { Contact } from './entities/contact.entity';
import { SolicitudMaquinaria } from './entities/solicitud-maquinaria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, SolicitudMaquinaria])],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
