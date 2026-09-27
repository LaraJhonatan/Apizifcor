/**
 * Datos iniciales tomados del Excel de tarifas (sept 2026). Solo se cargan si las tablas
 * están vacías; después todo se edita desde el dashboard de logística.
 *
 * Correcciones sobre el Excel original (erratas evidentes):
 *  - T1 alto "0.08 m" → 0.8 m
 *  - T4 ancho "23.0 m" → 2.3 m
 *  - T6 sin alto y T7/T8 solo con largo: se completan con el espacio estándar de furgón/semirremolque
 *    (ancho 2,45 m, alto 2,6 m). Verificar con el transportador y ajustar en el panel.
 */

export const SEED_ORIGEN = 'Bogotá';

export const SEED_VEHICULOS = [
  { codigo: 'T1', imagenUrl: '/logistica/vehiculos/T1.jpg', nombre: 'Carry / moto carro', pesoMinKg: 500, pesoMaxKg: 700, volumenMinM3: 2, volumenMaxM3: 3, largoM: 2.0, anchoM: 1.2, altoM: 0.8, tipoCarroceria: 'Estacas / furgón pequeño' },
  { codigo: 'T2', imagenUrl: '/logistica/vehiculos/T2.jpg', nombre: 'Turbo 1', pesoMinKg: 1000, pesoMaxKg: 1300, volumenMinM3: 6, volumenMaxM3: 8, largoM: 2.5, anchoM: 1.8, altoM: 1.0, tipoCarroceria: 'Furgón / estacas' },
  { codigo: 'T3', imagenUrl: '/logistica/vehiculos/T3.jpg', nombre: 'Turbo NHR', pesoMinKg: 1500, pesoMaxKg: 2200, volumenMinM3: 10, volumenMaxM3: 14, largoM: 3.0, anchoM: 1.8, altoM: 1.7, tipoCarroceria: 'Furgón / estacas' },
  { codigo: 'T4', imagenUrl: '/logistica/vehiculos/T4.jpg', nombre: 'Turbo NKR', pesoMinKg: 2500, pesoMaxKg: 3500, volumenMinM3: 18, volumenMaxM3: 22, largoM: 4.2, anchoM: 2.3, altoM: 2.0, tipoCarroceria: 'Furgón / estacas' },
  { codigo: 'T5', imagenUrl: '/logistica/vehiculos/T5.jpg', nombre: 'Turbo NPR', pesoMinKg: 3500, pesoMaxKg: 4500, volumenMinM3: 24, volumenMaxM3: 28, largoM: 5.0, anchoM: 2.1, altoM: 2.1, tipoCarroceria: 'Furgón / estacas' },
  { codigo: 'T6', imagenUrl: '/logistica/vehiculos/T6.jpg', nombre: 'Sencillo', pesoMinKg: 5500, pesoMaxKg: 8000, volumenMinM3: 32, volumenMaxM3: 38, largoM: 6.0, anchoM: 2.3, altoM: 2.6, tipoCarroceria: 'Furgón / estacas' },
  { codigo: 'T7', imagenUrl: '/logistica/vehiculos/T7.jpg', nombre: 'Mini mula', pesoMinKg: null, pesoMaxKg: 23000, volumenMinM3: null, volumenMaxM3: null, largoM: 16, anchoM: 2.45, altoM: 2.6, tipoCarroceria: 'Tractocamión' },
  { codigo: 'T8', imagenUrl: '/logistica/vehiculos/T8.jpg', nombre: 'Tractomula', pesoMinKg: null, pesoMaxKg: 50000, volumenMinM3: null, volumenMaxM3: null, largoM: 18, anchoM: 2.45, altoM: 2.6, tipoCarroceria: 'Tractocamión' },
];

/** Valores base por vehículo, en el orden T1..T8 (null = no se presta ese vehículo en la ruta). */
export const SEED_RUTAS: {
  destino: string;
  tipo: 'nacional' | 'urbano';
  entregasIncluidas: number;
  tarifas: (number | null)[];
}[] = [
  { destino: 'Barranquilla', tipo: 'nacional', entregasIncluidas: 1, tarifas: [null, 3_600_000, 3_600_000, 3_800_000, 4_000_000, 4_300_000, 6_325_000, 6_825_000] },
  { destino: 'Cartagena', tipo: 'nacional', entregasIncluidas: 1, tarifas: [null, 3_800_000, 3_800_000, 4_000_000, 4_200_000, 4_450_000, 5_973_000, 6_473_000] },
  { destino: 'Santa Marta', tipo: 'nacional', entregasIncluidas: 1, tarifas: [null, 3_900_000, 3_900_000, 4_100_000, 4_300_000, 4_500_000, 5_370_000, 5_870_000] },
  { destino: 'Bogotá', tipo: 'urbano', entregasIncluidas: 5, tarifas: [250_000, 350_000, 400_000, 500_000, 550_000, 650_000, 727_000, 827_000] },
  { destino: 'Medellín', tipo: 'nacional', entregasIncluidas: 1, tarifas: [null, 1_900_000, 2_000_000, 2_100_000, 2_300_000, 2_500_000, 3_187_000, 3_687_000] },
  { destino: 'Cali', tipo: 'nacional', entregasIncluidas: 1, tarifas: [null, 2_000_000, 2_100_000, 2_300_000, 2_400_000, 2_550_000, 3_328_000, 3_828_000] },
  { destino: 'Pereira', tipo: 'nacional', entregasIncluidas: 1, tarifas: [null, 1_900_000, 2_000_000, 2_100_000, 2_300_000, 2_500_000, 2_556_000, 3_056_000] },
  { destino: 'Bucaramanga', tipo: 'nacional', entregasIncluidas: 1, tarifas: [null, 1_900_000, 2_000_000, 2_100_000, 2_300_000, 2_500_000, 2_905_000, 3_405_000] },
  { destino: 'Cota', tipo: 'nacional', entregasIncluidas: 1, tarifas: [null, 450_000, 550_000, 570_000, 620_000, 640_000, 723_000, 823_000] },
  { destino: 'Chía', tipo: 'nacional', entregasIncluidas: 1, tarifas: [null, 455_000, 555_000, 575_000, 625_000, 675_000, 835_000, 935_000] },
  { destino: 'Mosquera', tipo: 'nacional', entregasIncluidas: 1, tarifas: [null, 380_000, 480_000, 530_000, 580_000, 630_000, 727_000, 827_000] },
];

/** Imágenes por defecto (servidas por el front); se reemplazan desde el panel. */
export const SEED_IMAGENES: Record<string, string> = {
  banner: '/logistica/banner-inicio.jpg',
  encabezado: '/logistica/encabezado-cotizador.jpg',
};

export const SEED_SERVICIOS = [
  {
    nombre: 'Cargue y descargue',
    descripcion: 'Personal para cargar la mercancía en el origen y descargarla en el destino.',
    precio: 300_000,
  },
];
