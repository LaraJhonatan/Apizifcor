import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';
import { Category } from '../categories/entities/category.entity';

/** Un producto detectado en el documento, aún sin guardar. */
export interface ProductoDetectado {
  nombre: string;
  descripcion?: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  categoriaSugerida?: string;
  precioBase?: number | null;
  moneda?: string;
  sku?: string;
  marca?: string;
  pagableEnLinea?: boolean;
}

const MODEL = 'claude-sonnet-5';
const MAX_TEXTO = 120_000;

@Injectable()
export class ProductImportService {
  private readonly logger = new Logger(ProductImportService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  /** Extrae el texto plano de un .docx o .pdf. */
  async extraerTexto(file: Express.Multer.File): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('El archivo llegó vacío.');
    }

    const nombre = (file.originalname || '').toLowerCase();
    let texto = '';

    try {
      if (nombre.endsWith('.docx')) {
        const { value } = await mammoth.extractRawText({ buffer: file.buffer });
        texto = value;
      } else if (nombre.endsWith('.pdf')) {
        const data = await pdfParse(file.buffer);
        texto = data.text;
      } else {
        throw new BadRequestException(
          'Formato no soportado. Sube un archivo .docx o .pdf. (Los .doc antiguos hay que guardarlos como .docx primero.)',
        );
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.error(`Error extrayendo texto de ${nombre}: ${e.message}`);
      throw new BadRequestException('No se pudo leer el archivo. ¿Está dañado o protegido con contraseña?');
    }

    texto = texto.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();

    if (texto.length < 40) {
      throw new BadRequestException(
        'El documento no tiene texto legible. Si es un PDF escaneado (una foto del documento), no se puede leer automáticamente.',
      );
    }

    return texto.slice(0, MAX_TEXTO);
  }

  /** Árbol de categorías aplanado, para que la IA elija de las que ya existen. */
  private async categoriasPlanas() {
    const raices = await this.categoryRepo.find({
      where: { parentId: IsNull(), activo: true },
      relations: ['hijos'],
      order: { orden: 'ASC' },
    });

    const plano: { id: string; parentId: string | null; ruta: string }[] = [];
    for (const cat of raices) {
      plano.push({ id: cat.id, parentId: null, ruta: cat.nombre });
      for (const sub of cat.hijos || []) {
        if (sub.activo === false) continue;
        plano.push({ id: sub.id, parentId: cat.id, ruta: `${cat.nombre} > ${sub.nombre}` });
      }
    }
    return plano;
  }

  /** Lee el documento y devuelve los productos detectados (NO los guarda). */
  async analizar(file: Express.Multer.File): Promise<{ productos: ProductoDetectado[]; caracteres: number }> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new BadRequestException(
        'La lectura automática de documentos no está configurada todavía. Falta la variable ANTHROPIC_API_KEY en el servidor.',
      );
    }

    const texto = await this.extraerTexto(file);
    const categorias = await this.categoriasPlanas();

    const listaCategorias = categorias.map((c) => `${c.id} | ${c.ruta}`).join('\n');

    const client = new Anthropic({ apiKey });

    let respuesta;
    try {
      respuesta = await client.messages.create({
        model: MODEL,
        max_tokens: 8000,
        tools: [
          {
            name: 'registrar_productos',
            description: 'Registra los productos o servicios encontrados en el documento.',
            input_schema: {
              type: 'object',
              properties: {
                productos: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      nombre: { type: 'string', description: 'Nombre del producto o servicio. Obligatorio.' },
                      descripcion: { type: 'string', description: 'Descripción detallada si el documento la trae.' },
                      categoryId: {
                        type: 'string',
                        description: 'El id EXACTO de la lista de categorías existentes. Si ninguna encaja, omite este campo.',
                      },
                      categoriaSugerida: {
                        type: 'string',
                        description: 'Solo si no encontraste una categoría existente que encaje: el nombre de la categoría que se debería crear.',
                      },
                      precioBase: { type: 'number', description: 'Precio numérico sin símbolos ni puntos de miles. Omite si el documento no lo dice.' },
                      moneda: { type: 'string', description: 'COP, USD o EUR. Por defecto COP.' },
                      sku: { type: 'string', description: 'Código o referencia interna si aparece.' },
                      marca: { type: 'string', description: 'Marca o fabricante si aparece.' },
                      pagableEnLinea: {
                        type: 'boolean',
                        description: 'true si es un producto físico con precio fijo. false si es un servicio o su precio depende de cada caso.',
                      },
                    },
                    required: ['nombre'],
                  },
                },
              },
              required: ['productos'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'registrar_productos' },
        messages: [
          {
            role: 'user',
            content: `Eres un asistente que ayuda a un vendedor de un marketplace industrial B2B colombiano a cargar su catálogo.

A continuación está el texto de un documento del vendedor. Identifica CADA producto o servicio distinto que se ofrece y regístralo.

REGLAS IMPORTANTES:
- Un producto por cada cosa que se vende por separado. Si el documento lista 20 servicios, son 20 productos, NO uno solo.
- NO inventes productos que no estén en el documento. NO inventes precios ni características.
- Si un dato no aparece en el documento, omite ese campo. Es mejor dejarlo vacío que adivinar.
- Para la categoría, elige el id EXACTO de la lista de abajo. Solo si de verdad ninguna encaja, usa "categoriaSugerida" con un nombre nuevo.
- Ignora encabezados, pies de página, datos de contacto, términos y condiciones: esos no son productos.

CATEGORÍAS EXISTENTES (id | ruta):
${listaCategorias}

--- TEXTO DEL DOCUMENTO ---
${texto}
--- FIN DEL DOCUMENTO ---`,
          },
        ],
      });
    } catch (e) {
      this.logger.error(`Error llamando a la IA: ${e.message}`);
      if (e?.status === 401) {
        throw new BadRequestException('La API key de IA configurada no es válida.');
      }
      if (e?.status === 429) {
        throw new BadRequestException('El servicio de IA está saturado en este momento. Intenta de nuevo en unos minutos.');
      }
      throw new BadRequestException('No se pudo analizar el documento con la IA. Intenta de nuevo.');
    }

    const bloque = respuesta.content.find((c) => c.type === 'tool_use');
    if (!bloque || bloque.type !== 'tool_use') {
      throw new BadRequestException('La IA no logró identificar productos en este documento.');
    }

    const detectados = ((bloque.input as { productos?: ProductoDetectado[] })?.productos || [])
      .filter((p) => p?.nombre?.trim());

    if (!detectados.length) {
      throw new BadRequestException(
        'No se encontraron productos en el documento. Revisa que sea un catálogo, cotización o lista de precios.',
      );
    }

    // Normaliza: valida que el categoryId exista de verdad y resuelve padre/hijo.
    const porId = new Map(categorias.map((c) => [c.id.toUpperCase(), c]));
    const productos = detectados.map((p) => {
      const match = p.categoryId ? porId.get(String(p.categoryId).toUpperCase()) : null;
      return {
        nombre: p.nombre.trim(),
        descripcion: p.descripcion?.trim() || '',
        categoryId: match ? (match.parentId ?? match.id) : null,
        subcategoryId: match?.parentId ? match.id : null,
        categoriaSugerida: match ? '' : (p.categoriaSugerida?.trim() || ''),
        precioBase: typeof p.precioBase === 'number' && p.precioBase > 0 ? p.precioBase : null,
        moneda: ['COP', 'USD', 'EUR'].includes(p.moneda) ? p.moneda : 'COP',
        sku: p.sku?.trim() || '',
        marca: p.marca?.trim() || '',
        pagableEnLinea: p.pagableEnLinea !== false,
      };
    });

    return { productos, caracteres: texto.length };
  }
}
