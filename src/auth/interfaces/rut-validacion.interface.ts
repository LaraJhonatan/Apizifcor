export interface CamposRut {
  nit: string;
  dv: string;
  razonSocial: string;
  nombreComercial: string;
  correo: string;
  direccion: string;
  numeroFormulario: string;
  fechaGeneracion: string;
}

export interface ValidacionesRut {
  pdfValido: boolean;
  estructuraRUT: boolean;
  nitCoincide: boolean;
  razonSocialCoincide: boolean;
  qrPresente: boolean;
  qrValido: boolean;
}

export interface RutValidacionExitosa {
  ok: true;
  validaciones: ValidacionesRut;
  extraido: CamposRut;
  correoEnmascarado: string;
}

export interface RutValidacionFallida {
  ok: false;
  motivo: string;
  detalle?: Record<string, string>;
}

export type RutValidacionResult = RutValidacionExitosa | RutValidacionFallida;