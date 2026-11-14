import { IsDateString, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { InventoryObservationMethod, InventoryObservationSource } from '@prisma/client';

export class CreateInventoryObservationDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsString() @IsNotEmpty() locationId!: string;
  // Cadena decimal: evita redondeos binarios antes de persistir en PostgreSQL.
  @IsString() @Matches(/^\d{1,12}(\.\d{1,3})?$/) quantity!: string;
  @IsIn(['PIEZA', 'CAJA', 'KG']) unit!: string;
  @IsEnum(InventoryObservationSource) source!: InventoryObservationSource;
  @IsEnum(InventoryObservationMethod) method!: InventoryObservationMethod;
  @IsDateString() observedAt!: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
}

export class ApplyInventoryCountDto {
  @IsString() @Matches(/\S/) @MaxLength(500) reason!: string;
}
