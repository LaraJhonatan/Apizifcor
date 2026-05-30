import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { SolicitudMaquinaria } from './entities/solicitud-maquinaria.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateSolicitudMaquinariaDto } from './dto/create-solicitud-maquinaria.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(SolicitudMaquinaria)
    private readonly solicitudRepository: Repository<SolicitudMaquinaria>,
  ) {}

  async createContact(dto: CreateContactDto): Promise<Contact> {
    const contact = this.contactRepository.create(dto);
    return this.contactRepository.save(contact);
  }

  async findAllContacts(): Promise<Contact[]> {
    return this.contactRepository.find({ order: { createdAt: 'DESC' } });
  }

  async createSolicitudMaquinaria(dto: CreateSolicitudMaquinariaDto): Promise<SolicitudMaquinaria> {
    const solicitud = this.solicitudRepository.create(dto);
    return this.solicitudRepository.save(solicitud);
  }

  async findAllSolicitudes(): Promise<SolicitudMaquinaria[]> {
    return this.solicitudRepository.find({ order: { createdAt: 'DESC' } });
  }
}
