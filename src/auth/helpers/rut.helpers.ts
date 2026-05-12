/* eslint-disable @typescript-eslint/no-require-imports */
const pdfParse = require('pdf-parse');
const { fromBuffer } = require('pdf2pic');
const jimpLib = require('jimp');
const Jimp = jimpLib.Jimp ?? jimpLib.default ?? jimpLib;
const jsQRLib = require('jsqr');
const jsQR: (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: string }
) => { data: string } | null = jsQRLib.default ?? jsQRLib;
/* eslint-enable @typescript-eslint/no-require-imports */

import { CamposRut } from '../interfaces/rut-validacion.interface';

const DOMINIOS_DIAN_VALIDOS = ['muisca.dian.gov.co', 'www.dian.gov.co', 'dian.gov.co'];

const MARCADORES_RUT = [
  'DIAN',
  'Registro Único Tributario',
  'Número de Identificación Tributaria',
  'Razón social',
  'Correo electrónico',
  'Fecha generación documento PDF',
  'Número de formulario',
];

const MIN_MARCADORES = 4;
const RECHAZAR_SIN_QR = false;

export function validarArchivoPdf(file: Express.Multer.File): void {
  if (!file) throw new Error('Archivo no recibido');
  if (file.mimetype !== 'application/pdf') throw new Error('El archivo debe ser un PDF (application/pdf)');
  const firma = file.buffer.slice(0, 4).toString('ascii');
  if (firma !== '%PDF') throw new Error('El archivo no es un PDF válido (firma incorrecta)');
  if (file.size > 5 * 1024 * 1024) throw new Error('El archivo supera el tamaño máximo permitido de 5 MB');
}

export async function extraerTextoPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,\-_/\\()'":;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validarEstructuraRUT(texto: string): boolean {
  const encontrados = MARCADORES_RUT.filter(m => texto.toLowerCase().includes(m.toLowerCase()));
  return encontrados.length >= MIN_MARCADORES;
}

export function extraerCamposRut(texto: string): CamposRut {
  let nit = '';
  let dv = '';

  const p1 = texto.match(/(\d{7,12})\s*\nImpuestos\s+de/i);
  console.log('[NIT] p1 (antes de Impuestos de):', p1?.[1] ?? 'NO');

  const p2 = texto.match(/(\d\s){8,11}\d/);
  console.log('[NIT] p2 (digitos con espacios):', p2?.[0] ?? 'NO');

  const todosNums = texto.match(/\d[\d\s]{8,20}\d/g);
  console.log('[NIT] secuencias numericas largas:', todosNums);

  const idxImp = texto.indexOf('Impuestos de');
  if (idxImp > -1) {
    console.log('[NIT] contexto Impuestos de:', JSON.stringify(texto.slice(idxImp - 50, idxImp + 50)));
  }

  const idx901 = texto.indexOf('9 0 1');
  console.log('[NIT] idx "9 0 1":', idx901);
  if (idx901 > -1) {
    console.log('[NIT] contexto 9 0 1:', JSON.stringify(texto.slice(idx901 - 20, idx901 + 40)));
  }

if (p1) {
  const nitCompleto = p1[1].trim();
  nit = nitCompleto.slice(0, -1);
  dv = nitCompleto.slice(-1);
}

  if (!nit && p2) {
    const digits = p2[0].replace(/\s/g, '');
    nit = digits.slice(0, -1);
    dv = digits.slice(-1);
  }

  if (!nit) {
    const p3 = texto.match(/(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)/);
    if (p3) {
      const joined = p3[0].replace(/\s/g, '');
      nit = joined.slice(0, -1);
      dv = joined.slice(-1);
      console.log('[NIT] p3 encontrado:', nit, 'DV:', dv);
    }
  }

  console.log('[NIT] resultado final — nit:', nit, 'dv:', dv);

  const razonMatch = texto.match(/Persona jur[ií]dica\s*\n\s*\d+\s*\n+\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{2,80})\s*\n/i);
  const razonSocial = razonMatch ? razonMatch[1].trim() : buscarPatronSimple(texto, 'Razón social');

  const nombreComercial = razonSocial;

  const correoMatch = texto.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const correo = correoMatch ? correoMatch[0].trim() : '';

  const dirMatch = texto.match(/\n((?:AV|CL|KR|CR|DG|TR|CALLE|CARRERA|AVENIDA|DIAGONAL|TRANSVERSAL)[^\n]{3,80})\n/i);
  const direccion = dirMatch ? dirMatch[1].trim() : '';
const formMatch = texto.match(/(\d{12})\n\s*\d{7,12}\nImpuestos/i);
  const numeroFormulario = formMatch ? formMatch[1].trim() : '';

  const fechaMatch = texto.match(/Fecha generaci[oó]n documento PDF[:\s]+([0-9\-\/: APMapm]+)/i);
  const fechaGeneracion = fechaMatch ? fechaMatch[1].trim() : '';

  return { nit, dv, razonSocial, nombreComercial, correo, direccion, numeroFormulario, fechaGeneracion };
}

function buscarPatronSimple(texto: string, etiqueta: string): string {
  const idx = texto.toLowerCase().indexOf(etiqueta.toLowerCase());
  if (idx === -1) return '';
  const fragmento = texto.slice(idx + etiqueta.length, idx + etiqueta.length + 80);
  return fragmento.split('\n')[0].trim();
}

export function compararRazonSocial(a: string, b: string): boolean {
  const na = normalizarTexto(a);
  const nb = normalizarTexto(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = na.split(' ').filter(Boolean);
  const wordsB = nb.split(' ').filter(Boolean);
  const comunes = wordsA.filter(w => wordsB.includes(w)).length;
  const total = Math.max(wordsA.length, wordsB.length);
  return total > 0 && comunes / total >= 0.8;
}

export function enmascararCorreo(correo: string): string {
  if (!correo.includes('@')) return correo;
  const [usuario, dominio] = correo.split('@');
  if (usuario.length <= 1) return `*@${dominio}`;
  return `${usuario[0]}${'*'.repeat(usuario.length - 1)}@${dominio}`;
}

export async function leerQr(buffer: Buffer): Promise<string | null> {
  try {
    const data = await pdfParse(buffer);
    const urlMatch = data.text.match(
      /https?:\/\/(muisca\.dian\.gov\.co|www\.dian\.gov\.co)[^\s"'<>]*/i,
    );
    if (urlMatch) return urlMatch[0];
  } catch {
    // continúa
  }

  try {
    const converter = fromBuffer(buffer, {
      density: 200,
      format: 'png',
      width: 1700,
      height: 2200,
      preserveAspectRatio: true,
    });

    const resultado = await converter(1, { responseType: 'buffer' });
    if (!resultado?.buffer) return null;

    const imagen = await Jimp.read(resultado.buffer as Buffer);
    const { width, height } = imagen.bitmap;
    const imageData = new Uint8ClampedArray(imagen.bitmap.data);

    const qr = jsQR(imageData, width, height, { inversionAttempts: 'dontInvert' });
    if (qr?.data) return qr.data;

    const qrInvertido = jsQR(imageData, width, height, { inversionAttempts: 'onlyInvert' });
    return qrInvertido?.data ?? null;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[leerQr] Error:', msg);
    return null;
  }
}

export function validarQrDian(url: string): boolean {
  try {
    const parsed = new URL(url);
    return DOMINIOS_DIAN_VALIDOS.some(d => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}

export { RECHAZAR_SIN_QR };