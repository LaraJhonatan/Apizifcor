import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsOptional, MaxLength, IsNumber, Min, IsInt, IsBoolean, IsIn,
  IsArray, ValidateNested, Matches,
} from 'class-validator';
import { GUID_RE } from '../guid';

export class CreateVehiculoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  codigo: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del vehículo es requerido.' })
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoMinKg?: number | null;

  @IsNumber({}, { message: 'La capacidad máxima de peso es requerida.' })
  @Min(1)
  pesoMaxKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volumenMinM3?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volumenMaxM3?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  largoM?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  anchoM?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  altoM?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tipoCarroceria?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imagenUrl?: string | null;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateVehiculoDto extends PartialType(CreateVehiculoDto) {}

export class CreateRutaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  origen: string;

  @IsString()
  @IsNotEmpty({ message: 'El destino es requerido.' })
  @MaxLength(100)
  destino: string;

  @IsOptional()
  @IsIn(['nacional', 'urbano'])
  tipo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  entregasIncluidas?: number;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateRutaDto extends PartialType(CreateRutaDto) {}

export class TarifaItemDto {
  @IsString()
  @Matches(GUID_RE, { message: 'Ruta no válida.' })
  rutaId: string;

  @IsString()
  @Matches(GUID_RE, { message: 'Vehículo no válido.' })
  vehiculoId: string;

  /** null = quitar la tarifa (ese vehículo deja de ofrecerse en la ruta). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorBase: number | null;
}

export class GuardarTarifasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TarifaItemDto)
  items: TarifaItemDto[];
}

export class CreateServicioDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del servicio es requerido.' })
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string | null;

  @IsNumber({}, { message: 'El precio es requerido.' })
  @Min(0)
  precio: number;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdateServicioDto extends PartialType(CreateServicioDto) {}

export class GuardarImagenesDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  banner?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  encabezado?: string | null;
}
