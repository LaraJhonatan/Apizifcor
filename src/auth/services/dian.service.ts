import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import axios from 'axios';
import * as pdfParseLib from 'pdf-parse';

const pdfParse: (buffer: Buffer) => Promise<{ text: string }> =
  (pdfParseLib as any).default ?? pdfParseLib;

export interface DatosEmpresa {
  nit: string;
  dv: string;
  razonSocial: string;
  estado: string;
  actividadEconomicaPrincipal: string | null;
  actividadEconomicaSecundaria?: string | null;
  tipoContribuyente: string;
  direccion?: string | null;
  telefono?: string | null;
  matricula?: string | null;
  camara?: string | null;
  representanteLegal?: string | null;
  fechaMatricula?: string | null;
  fechaRenovacion?: string | null;
  ultimoAnoRenovado?: string | null;
  tipoSociedad?: string | null;
}

@Injectable()
export class DianService {
  private readonly logger = new Logger(DianService.name);
  private ciuuCache: Record<string, string> = {};

private readonly NITS_PERMITIDOS: Array<Partial<DatosEmpresa> & { nit: string }> = [
  {
    nit: '902067173',
    dv: '6',
    razonSocial: 'ZIFCOR SAS',
    estado: 'ACTIVO',
    actividadEconomicaPrincipal: '4791',
    tipoContribuyente: 'Persona Jurídica',
  },
];

  // ── 1. Consultar empresa por NIT en datos.gov.co ──────────────────────────
  async consultarPorNit(nit: string): Promise<DatosEmpresa> {
    try {
      const { data } = await axios.get(
        'https://www.datos.gov.co/resource/c82u-588k.json',
        {
          params: { nit },
          timeout: 8000,
          headers: { Accept: 'application/json' },
        },
      );

      if (!data || data.length === 0) {
        throw new NotFoundException(
          `No encontramos empresa con NIT ${nit}. Verifica el número e intenta de nuevo.`,
        );
      }

      const emp =
        data.find((r: any) => r.estado_matricula === 'ACTIVA') ?? data[0];

      return {
        nit:                          emp.numero_identificacion ?? nit,
        dv:                           emp.digito_verificacion ?? '',
        razonSocial:                  emp.razon_social,
        estado:                       emp.estado_matricula ?? 'ACTIVA',
        actividadEconomicaPrincipal:  await this.describirCiiu(emp.cod_ciiu_act_econ_pri),
        actividadEconomicaSecundaria: await this.describirCiiu(emp.cod_ciiu_act_econ_sec),
        tipoContribuyente:            emp.organizacion_juridica ?? 'Persona Jurídica',
        direccion:                    null,
        telefono:                     null,
        matricula:                    emp.matricula ?? null,
        camara:                       emp.camara_comercio ?? null,
        representanteLegal:           emp.representante_legal ?? null,
        fechaMatricula:               this.formatearFecha(emp.fecha_matricula),
        fechaRenovacion:              this.formatearFecha(emp.fecha_renovacion),
        ultimoAnoRenovado:            emp.ultimo_ano_renovado ?? null,
        tipoSociedad:                 emp.tipo_sociedad ?? null,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        // Verificar si el NIT está en la lista de permitidos
        const permitido = this.NITS_PERMITIDOS.find((e) => e.nit === nit);
        if (permitido) {
          this.logger.log(
            `NIT ${nit} no encontrado en la fuente externa, pero está en la lista de NITs permitidos.`,
          );
          return {
            nit,
            dv: '',
            razonSocial: 'Empresa por Registrar',
            estado: 'PENDIENTE',
            actividadEconomicaPrincipal: null,
            actividadEconomicaSecundaria: null,
            tipoContribuyente: 'Persona Jurídica',
            direccion: null,
            telefono: null,
            matricula: null,
            camara: null,
            representanteLegal: null,
            fechaMatricula: null,
            fechaRenovacion: null,
            ultimoAnoRenovado: null,
            tipoSociedad: null,
            ...permitido, // Sobreescribe con los campos definidos en el arreglo
          };
        }
        // NIT no encontrado y no está en la lista permitida
        throw err;
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn('datos.gov.co no disponible, usando mock: ' + errorMessage);
      return this.mockEmpresa(nit);
    }
  }

  // ── 2. Extraer correo del RUT PDF ─────────────────────────────────────────
  async extraerCorreoDeRut(pdfBuffer: Buffer, nit: string): Promise<string | null> {
    try {
      const data = await pdfParse(pdfBuffer);
      const texto = data.text;

      const emailRegex =
        /(?:correo electrónico|email|e-mail)[:\s]*([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})/i;
      const match = texto.match(emailRegex);
      if (match?.[1]) return match[1].toLowerCase();

      const emailGeneral = texto.match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);
      if (emailGeneral?.[0]) return emailGeneral[0].toLowerCase();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn('No se pudo parsear el PDF: ' + errorMessage);
    }
    return null;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async describirCiiu(codigo: string | null): Promise<string | null> {
    if (!codigo) return null;

    // Devolver desde cache si ya fue consultado
    if (this.ciuuCache[codigo]) {
      return `${codigo} — ${this.ciuuCache[codigo]}`;
    }

    // Intentar consultar la API de la CCB
    try {
      const { data } = await axios.get(
        `https://linea.ccb.org.co/descripcionciiu/Consultar?codigo=${codigo}`,
        { timeout: 3000 },
      );
      const descripcion = data?.descripcion ?? data?.Descripcion ?? null;
      if (descripcion) {
        this.ciuuCache[codigo] = descripcion;
        return `${codigo} — ${descripcion}`;
      }
    } catch {
      // Si falla la CCB, continuar con diccionario local
    }

    // Fallback — diccionario local con los más comunes
    const local: Record<string, string> = {
      '0010': 'Asalariados',
      '0020': 'Pensionados',
      '0081': 'Personas naturales sin actividad económica',
      '1011': 'Procesamiento y conservación de carne',
      '1020': 'Procesamiento y conservación de pescados',
      '1040': 'Elaboración de aceites y grasas',
      '1051': 'Elaboración de productos lácteos',
      '1061': 'Trilla de café',
      '1081': 'Elaboración de productos de panadería',
      '1090': 'Elaboración de otros productos alimenticios',
      '1101': 'Destilación, rectificación y mezcla de bebidas alcohólicas',
      '1104': 'Elaboración de bebidas no alcohólicas',
      '1311': 'Preparación e hilatura de fibras textiles',
      '1312': 'Tejeduría de productos textiles',
      '1410': 'Confección de prendas de vestir',
      '1421': 'Fabricación de artículos de piel',
      '1511': 'Curtido y recurtido de cueros',
      '1610': 'Aserrado y acepillado de la madera',
      '1701': 'Fabricación de pulpas celulósicas',
      '1702': 'Fabricación de papel y cartón ondulado',
      '1811': 'Actividades de impresión',
      '2011': 'Fabricación de sustancias y productos químicos básicos',
      '2022': 'Fabricación de pinturas y barnices',
      '2023': 'Fabricación de jabones y detergentes',
      '2100': 'Fabricación de productos farmacéuticos',
      '2211': 'Fabricación de llantas y neumáticos',
      '2310': 'Fabricación de vidrio y productos de vidrio',
      '2391': 'Fabricación de productos refractarios',
      '2410': 'Industrias básicas de hierro y acero',
      '2431': 'Fundición de hierro y acero',
      '2511': 'Fabricación de productos metálicos estructurales',
      '2591': 'Forja, prensado, estampado de metales',
      '2599': 'Fabricación de otros productos metálicos',
      '2610': 'Fabricación de componentes electrónicos',
      '2620': 'Fabricación de computadoras y equipo periférico',
      '2630': 'Fabricación de equipos de comunicación',
      '2651': 'Fabricación de equipo de medición y navegación',
      '2711': 'Fabricación de motores y transformadores eléctricos',
      '2740': 'Fabricación de lámparas y equipo de iluminación',
      '2811': 'Fabricación de motores y turbinas',
      '2910': 'Fabricación de vehículos automotores',
      '3011': 'Construcción de barcos y estructuras flotantes',
      '3230': 'Fabricación de artículos y equipo para actividad física',
      '3290': 'Otras industrias manufactureras n.c.p.',
      '3511': 'Generación de energía eléctrica',
      '3512': 'Transmisión de energía eléctrica',
      '3513': 'Distribución de energía eléctrica',
      '3600': 'Captación, tratamiento y distribución de agua',
      '3811': 'Recolección de desechos no peligrosos',
      '3900': 'Actividades de saneamiento ambiental',
      '4111': 'Construcción de edificios residenciales',
      '4112': 'Construcción de edificios no residenciales',
      '4210': 'Construcción de carreteras y vías de ferrocarril',
      '4220': 'Construcción de proyectos de servicio público',
      '4290': 'Construcción de otras obras de ingeniería civil',
      '4321': 'Instalaciones eléctricas',
      '4322': 'Instalaciones de fontanería y aire acondicionado',
      '4329': 'Otras instalaciones especializadas',
      '4390': 'Otras actividades especializadas de construcción',
      '4511': 'Comercio de vehículos automotores',
      '4530': 'Comercio de partes, piezas y accesorios para vehículos',
      '4610': 'Comercio al por mayor a cambio de una retribución',
      '4620': 'Comercio al por mayor de materias primas agropecuarias',
      '4631': 'Comercio al por mayor de productos alimenticios',
      '4632': 'Comercio al por mayor de bebidas y tabaco',
      '4641': 'Comercio al por mayor de productos textiles',
      '4649': 'Comercio al por mayor de otros enseres domésticos',
      '4651': 'Comercio al por mayor de computadoras y equipo',
      '4652': 'Comercio al por mayor de equipo electrónico',
      '4659': 'Comercio al por mayor de otro tipo de maquinaria',
      '4661': 'Comercio al por mayor de combustibles',
      '4690': 'Comercio al por mayor no especializado',
      '4711': 'Comercio al por menor en establecimientos no especializados',
      '4712': 'Comercio al por menor de alimentos en establecimientos especializados',
      '4721': 'Comercio al por menor de frutas y verduras',
      '4722': 'Comercio al por menor de leche, productos lácteos y huevos',
      '4723': 'Comercio al por menor de carnes',
      '4724': 'Comercio al por menor de bebidas y productos del tabaco',
      '4731': 'Comercio al por menor de combustibles',
      '4741': 'Comercio al por menor de computadoras y equipos',
      '4742': 'Comercio al por menor de equipos de telecomunicaciones',
      '4751': 'Comercio al por menor de productos textiles',
      '4752': 'Comercio al por menor de artículos de ferretería',
      '4753': 'Comercio al por menor de tapices y alfombras',
      '4754': 'Comercio al por menor de electrodomésticos',
      '4759': 'Comercio al por menor de otros artículos del hogar',
      '4761': 'Comercio al por menor de libros',
      '4762': 'Comercio al por menor de artículos deportivos',
      '4771': 'Comercio al por menor de prendas de vestir',
      '4772': 'Comercio al por menor de calzado',
      '4773': 'Comercio al por menor de productos farmacéuticos',
      '4774': 'Comercio al por menor de artículos médicos y ortopédicos',
      '4781': 'Comercio al por menor de alimentos en puestos móviles',
      '4789': 'Comercio al por menor en puestos móviles de otros productos',
      '4791': 'Comercio al por menor no realizado en establecimientos',
      '4799': 'Otros tipos de comercio al por menor',
      '4911': 'Transporte férreo de pasajeros',
      '4912': 'Transporte férreo de carga',
      '4921': 'Transporte de pasajeros urbano',
      '4922': 'Transporte mixto',
      '4923': 'Transporte de carga por carretera',
      '5111': 'Transporte aéreo nacional de pasajeros',
      '5112': 'Transporte aéreo internacional de pasajeros',
      '5210': 'Almacenamiento y depósito',
      '5221': 'Actividades de estaciones, vías y servicios auxiliares',
      '5310': 'Actividades postales nacionales',
      '5590': 'Otros tipos de alojamiento',
      '5611': 'Expendio a la mesa de comidas preparadas',
      '5612': 'Expendio de comidas preparadas en cafeterías',
      '5613': 'Expendio de comidas preparadas en autoservicio',
      '5619': 'Otros tipos de expendio de comidas preparadas',
      '5621': 'Catering para eventos',
      '5629': 'Actividades de otros servicios de comidas',
      '5630': 'Expendio de bebidas alcohólicas para el consumo dentro del establecimiento',
      '5813': 'Edición de periódicos, revistas y publicaciones periódicas',
      '5820': 'Edición de programas de informática',
      '5911': 'Actividades de producción de películas cinematográficas',
      '5912': 'Actividades de postproducción de películas',
      '6010': 'Actividades de radiodifusión',
      '6020': 'Actividades de televisión',
      '6110': 'Actividades de telecomunicaciones alámbricas',
      '6120': 'Actividades de telecomunicaciones inalámbricas',
      '6130': 'Actividades de telecomunicación satelital',
      '6190': 'Otras actividades de telecomunicaciones',
      '6201': 'Desarrollo de sistemas informáticos',
      '6202': 'Consultoría informática y actividades de gestión de instalaciones',
      '6209': 'Otras actividades de tecnología de la información',
      '6311': 'Procesamiento de datos, alojamiento y actividades relacionadas',
      '6312': 'Portales web',
      '6391': 'Actividades de agencias de noticias',
      '6399': 'Otras actividades de servicios de información',
      '6411': 'Banco central',
      '6412': 'Bancos comerciales',
      '6421': 'Actividades de las corporaciones financieras',
      '6422': 'Actividades de las compañías de financiamiento',
      '6424': 'Actividades de las cooperativas financieras',
      '6431': 'Fondos de inversión y fondos de pensiones',
      '6491': 'Leasing financiero',
      '6492': 'Actividades de libranza',
      '6499': 'Otras actividades de servicio financiero',
      '6511': 'Seguros de vida',
      '6512': 'Seguros generales',
      '6513': 'Seguros de salud',
      '6514': 'Seguros previsionales de riesgos laborales',
      '6531': 'Régimen de prima media',
      '6532': 'Régimen de ahorro individual',
      '6611': 'Administración de mercados financieros',
      '6614': 'Actividades de las casas de cambio',
      '6615': 'Intermediarios de valores',
      '6619': 'Otras actividades auxiliares de las actividades financieras',
      '6621': 'Actividades de agentes y corredores de seguros',
      '6810': 'Actividades inmobiliarias realizadas con bienes propios',
      '6820': 'Actividades inmobiliarias realizadas a cambio de una retribución',
      '6910': 'Actividades jurídicas',
      '6920': 'Actividades de contabilidad y auditoría',
      '7010': 'Actividades de administración empresarial',
      '7020': 'Actividades de consultoría de gestión empresarial',
      '7110': 'Actividades de arquitectura e ingeniería',
      '7120': 'Ensayos y análisis técnicos',
      '7210': 'Investigaciones y desarrollo experimental en ciencias naturales',
      '7220': 'Investigaciones y desarrollo experimental en ciencias sociales',
      '7310': 'Publicidad',
      '7320': 'Estudios de mercado y realización de encuestas',
      '7410': 'Actividades especializadas de diseño',
      '7420': 'Actividades de fotografía',
      '7490': 'Otras actividades profesionales, científicas y técnicas',
      '7500': 'Actividades veterinarias',
      '7710': 'Alquiler y arrendamiento de vehículos automotores',
      '7721': 'Alquiler y arrendamiento de equipo recreativo y deportivo',
      '7730': 'Alquiler y arrendamiento de otros tipos de maquinaria',
      '7740': 'Arrendamiento de propiedad intelectual',
      '7810': 'Actividades de agencias de empleo',
      '7820': 'Actividades de agencias de empleo temporal',
      '7830': 'Otras formas de provisión de recurso humano',
      '7911': 'Actividades de las agencias de viaje',
      '7912': 'Actividades de operadores turísticos',
      '7990': 'Otros servicios de reserva y actividades relacionadas',
      '8010': 'Actividades de seguridad privada',
      '8020': 'Actividades de servicios de sistemas de seguridad',
      '8030': 'Actividades de investigación',
      '8110': 'Actividades combinadas de apoyo a instalaciones',
      '8121': 'Limpieza general interior de edificios',
      '8129': 'Otras actividades de limpieza de edificios',
      '8130': 'Actividades de paisajismo y servicios de mantenimiento',
      '8211': 'Actividades combinadas de servicios administrativos',
      '8219': 'Fotocopiado, preparación de documentos y otras actividades',
      '8220': 'Actividades de centros de llamadas',
      '8230': 'Organización de convenciones y eventos',
      '8291': 'Actividades de cobro y calificación crediticia',
      '8292': 'Actividades de envase y empaque',
      '8299': 'Otras actividades de servicio de apoyo a las empresas',
      '8411': 'Actividades legislativas de la administración pública',
      '8412': 'Actividades ejecutivas de la administración pública',
      '8413': 'Regulación de las actividades de organismos que prestan servicios',
      '8421': 'Relaciones exteriores',
      '8422': 'Actividades de defensa',
      '8423': 'Orden público y actividades de seguridad',
      '8424': 'Actividades de la justicia',
      '8430': 'Actividades de planes de seguridad social',
      '8511': 'Educación de la primera infancia',
      '8512': 'Educación preescolar',
      '8513': 'Educación básica primaria',
      '8521': 'Educación básica secundaria',
      '8522': 'Educación media académica',
      '8523': 'Educación media técnica',
      '8530': 'Establecimientos que combinan niveles de educación',
      '8541': 'Educación técnica profesional',
      '8542': 'Educación tecnológica',
      '8543': 'Educación de instituciones universitarias',
      '8544': 'Educación de universidades',
      '8551': 'Educación para el trabajo y el desarrollo humano',
      '8552': 'Educación cultural y artística',
      '8553': 'Educación para el deporte y la recreación',
      '8559': 'Otros tipos de educación n.c.p.',
      '8560': 'Actividades de apoyo a la enseñanza',
      '8610': 'Actividades de hospitales y clínicas',
      '8621': 'Actividades de la práctica médica',
      '8622': 'Actividades de la práctica odontológica',
      '8691': 'Actividades de apoyo diagnóstico',
      '8692': 'Actividades de apoyo terapéutico',
      '8699': 'Otras actividades relacionadas con la salud humana',
      '8710': 'Actividades de atención residencial',
      '8810': 'Actividades de asistencia social sin alojamiento',
      '9001': 'Creación literaria',
      '9002': 'Creación musical',
      '9003': 'Creación teatral',
      '9004': 'Creación audiovisual',
      '9005': 'Artes plásticas y visuales',
      '9006': 'Actividades de espectáculos en vivo',
      '9007': 'Actividades de gestión y presentación de espectáculos',
      '9101': 'Actividades de bibliotecas y archivos',
      '9102': 'Actividades y funcionamiento de museos',
      '9200': 'Actividades de juegos de azar y apuestas',
      '9311': 'Gestión de instalaciones deportivas',
      '9312': 'Actividades de clubes deportivos',
      '9319': 'Otras actividades deportivas',
      '9321': 'Actividades de parques de atracciones y parques temáticos',
      '9329': 'Otras actividades recreativas y de esparcimiento',
      '9411': 'Actividades de asociaciones empresariales y de empleadores',
      '9412': 'Actividades de asociaciones profesionales',
      '9420': 'Actividades de sindicatos de empleados',
      '9491': 'Actividades de organizaciones religiosas',
      '9492': 'Actividades de organizaciones políticas',
      '9499': 'Actividades de otras asociaciones n.c.p.',
      '9511': 'Mantenimiento y reparación de computadoras',
      '9512': 'Mantenimiento y reparación de equipo de comunicaciones',
      '9521': 'Mantenimiento y reparación de aparatos electrónicos de consumo',
      '9522': 'Mantenimiento y reparación de aparatos y equipos del hogar',
      '9523': 'Reparación de calzado y artículos de cuero',
      '9524': 'Reparación de muebles y accesorios domésticos',
      '9529': 'Mantenimiento y reparación de otros efectos personales',
      '9601': 'Lavado y limpieza de prendas de tela y de piel',
      '9602': 'Peluquería y otros tratamientos de belleza',
      '9603': 'Pompas fúnebres y actividades relacionadas',
      '9609': 'Otras actividades de servicios personales n.c.p.',
      '9700': 'Actividades de los hogares individuales',
      '9900': 'Actividades de organizaciones y entidades extraterritoriales',
    };

    return local[codigo] ? `${codigo} — ${local[codigo]}` : `${codigo}`;
  }

  private formatearFecha(fecha: string | null): string | null {
    if (!fecha || fecha.length !== 8) return null;
    const y = fecha.slice(0, 4);
    const m = fecha.slice(4, 6);
    const d = fecha.slice(6, 8);
    return `${d}/${m}/${y}`;
  }

  // ── Mock fallback ─────────────────────────────────────────────────────────
  private mockEmpresa(nit: string): DatosEmpresa {
    const mocks: Record<string, DatosEmpresa> = {
      '900123456': {
        nit, dv: '7', razonSocial: 'Empresa Demo SAS', estado: 'ACTIVA',
        actividadEconomicaPrincipal: '6201 — Desarrollo de sistemas informáticos',
        actividadEconomicaSecundaria: null,
        tipoContribuyente: 'Persona Jurídica',
        direccion: 'Calle 123 # 45-67, Bogotá',
        telefono: '+57 300 123 4567',
      },
      '800456789': {
        nit, dv: '2', razonSocial: 'Industrias Norte SA', estado: 'ACTIVA',
        actividadEconomicaPrincipal: '2511 — Fabricación de productos metálicos estructurales',
        actividadEconomicaSecundaria: null,
        tipoContribuyente: 'Gran Contribuyente',
        direccion: 'Av Industrial 89, Medellín',
        telefono: '+57 604 123 4567',
      },
    };
    if (mocks[nit]) return mocks[nit];
    throw new NotFoundException(
      `NIT ${nit} no encontrado. Verifica el número e intenta de nuevo.`,
    );
  }
}