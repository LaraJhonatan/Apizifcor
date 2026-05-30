import { Controller, Post, Get, Body } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateSolicitudMaquinariaDto } from './dto/create-solicitud-maquinaria.dto';

@Controller('public')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // Formulario de contacto general
  @Post('contacto')
  createContact(@Body() dto: CreateContactDto) {
    return this.contactService.createContact(dto);
  }

  @Get('contacto')
  findAllContacts() {
    return this.contactService.findAllContacts();
  }

  // Formulario de solicitud de maquinaria
  @Post('maquinaria')
  createSolicitud(@Body() dto: CreateSolicitudMaquinariaDto) {
    return this.contactService.createSolicitudMaquinaria(dto);
  }

  @Get('maquinaria')
  findAllSolicitudes() {
    return this.contactService.findAllSolicitudes();
  }
}
