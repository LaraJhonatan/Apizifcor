import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional,
  IsPositive, IsString, IsUUID, MaxLength, Min, ValidateNested, ArrayMinSize, ArrayMaxSize,
} from 'class-validator';

export class ManualOrderItemDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  /** Requerido si no viene productId (línea libre, ej. servicio a la medida). */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  nombre?: string;

  @IsNumber()
  @IsPositive()
  precioUnitario: number;

  @IsInt()
  @Min(1)
  cantidad: number;
}

export class CompradorDto {
  @IsOptional()
  @IsInt()
  usuarioId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  documento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;
}

export class EnvioManualDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;
}

export class CreateManualOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ManualOrderItemDto)
  items: ManualOrderItemDto[];

  @ValidateNested()
  @Type(() => CompradorDto)
  comprador: CompradorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnvioManualDto)
  envio?: EnvioManualDto;

  @IsOptional()
  @IsBoolean()
  yaPagado?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  medioPago?: string;
}

export class UpdateManualOrderDto extends CreateManualOrderDto {}

export class MarcarPagadaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  medioPago: string;
}
