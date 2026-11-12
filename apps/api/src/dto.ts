import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsInt() @Min(1) required!: number;
}
export class CreateOrderDto {
  @IsString() @IsNotEmpty() customer!: string;
  @IsString() @IsNotEmpty() destinationId!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(()=>OrderItemDto) items!: OrderItemDto[];
}
export class TransferItemDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsInt() @Min(1) requested!: number;
}
export class CreateTransferDto {
  @IsString() @IsNotEmpty() originId!: string;
  @IsString() @IsNotEmpty() destinationId!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(()=>TransferItemDto) items!: TransferItemDto[];
}
export class ReserveDto {
  @IsString() @IsNotEmpty() transferLineId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() orderLineId?: string;
}
export class QuantityDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsInt() @Min(1) quantity!: number;
}
export class DispatchDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(()=>QuantityDto) items!: QuantityDto[];
}
export class ReceiptItemDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsInt() @Min(0) presented!: number;
  @IsInt() @Min(0) accepted!: number;
  @IsInt() @Min(0) rejected!: number;
}
export class ReceiveDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(()=>ReceiptItemDto) items!: ReceiptItemDto[];
}
export class CreateIncidentDto {
  @IsOptional() @IsString() transferId?: string;
  @IsString() @IsNotEmpty() type!: string;
  @IsString() @IsNotEmpty() notes!: string;
}
