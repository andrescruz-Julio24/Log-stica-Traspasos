import { IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ClientShipmentItemDto {
  @IsString() @IsNotEmpty() orderLineId!: string;
  @IsInt() @Min(1) quantity!: number;
}

export class CreateClientShipmentDto {
  @IsString() @IsNotEmpty() orderId!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) custodian!: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true })
  @Type(() => ClientShipmentItemDto) items!: ClientShipmentItemDto[];
}

export class ClientReceptionItemDto {
  @IsString() @IsNotEmpty() shipmentLineId!: string;
  @IsInt() @Min(0) accepted!: number;
  @IsInt() @Min(0) rejected!: number;
}

export class CreateClientReceptionDto {
  @IsString() @IsNotEmpty() @MaxLength(120) receiverName!: string;
  @IsDateString() observedAt!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsString() @MaxLength(200) evidenceRef?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true })
  @Type(() => ClientReceptionItemDto) items!: ClientReceptionItemDto[];
}
