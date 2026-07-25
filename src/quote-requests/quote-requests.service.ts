import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { QuoteRequest } from './entities/quote-request.entity';
import { QuoteRequestFile } from './entities/quote-request-file.entity';
import { Product } from '../products/entities/product.entity';
import { UsuarioEntity } from '../users/entities/user.entity';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { QuoteRequestStatus } from '../common/enums/quote-request-status.enum';

@Injectable()
export class QuoteRequestsService {
  constructor(
    @InjectRepository(QuoteRequest)
    private readonly quoteRepo: Repository<QuoteRequest>,
    @InjectRepository(QuoteRequestFile)
    private readonly fileRepo: Repository<QuoteRequestFile>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(UsuarioEntity)
    private readonly usuarioRepo: Repository<UsuarioEntity>,
  ) {}

  async create(usuarioId: number, dto: CreateQuoteRequestDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId, eliminado: false },
    });
    if (!product) throw new NotFoundException('Producto no encontrado.');

    const quote = await this.quoteRepo.save(
      this.quoteRepo.create({
        productId: product.id,
        empresaId: product.empresaId,
        usuarioId,
        productoNombre: product.nombre,
        productoSlug: product.slug || null,
        mensaje: dto.mensaje?.trim() || null,
        estado: QuoteRequestStatus.PENDING,
      }),
    );

    if (dto.archivos?.length) {
      const archivos = dto.archivos.map((a) =>
        this.fileRepo.create({
          quoteRequestId: quote.id,
          url: a.url,
          nombreOriginal: a.nombreOriginal,
          mimeType: a.mimeType || null,
          tamanoBytes: a.tamanoBytes ?? null,
        }),
      );
      await this.fileRepo.save(archivos);
    }

    return this.findOne(quote.id);
  }

  async findOne(id: string) {
    const quote = await this.quoteRepo.findOne({ where: { id }, relations: ['archivos'] });
    if (!quote) throw new NotFoundException('Solicitud no encontrada.');
    return quote;
  }

  async findMine(usuarioId: number) {
    return this.quoteRepo.find({
      where: { usuarioId },
      relations: ['archivos'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Listado para el dashboard de la empresa, con datos del solicitante. */
  async findForEmpresa(empresaId: string) {
    const quotes = await this.quoteRepo.find({
      where: { empresaId },
      relations: ['archivos'],
      order: { createdAt: 'DESC' },
    });
    if (!quotes.length) return [];

    const usuarioIds = [...new Set(quotes.map((q) => q.usuarioId))];
    const usuarios = await this.usuarioRepo.findBy({ id: In(usuarioIds) });
    const porId = new Map(usuarios.map((u) => [u.id, u]));

    return quotes.map((q) => ({
      ...q,
      solicitante: {
        nombre: porId.get(q.usuarioId)?.nombreCompleto || 'Usuario ZIFCOR',
        email: porId.get(q.usuarioId)?.email || null,
      },
    }));
  }

  async marcarAtendida(id: string, empresaId: string) {
    const quote = await this.quoteRepo.findOne({ where: { id, empresaId } });
    if (!quote) throw new NotFoundException('Solicitud no encontrada.');
    quote.estado = QuoteRequestStatus.ATENDIDA;
    await this.quoteRepo.save(quote);
    return quote;
  }
}
