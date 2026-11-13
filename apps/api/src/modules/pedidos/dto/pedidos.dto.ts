import { IsArray,IsInt,IsNotEmpty,IsString,Min,ValidateNested,ArrayMinSize } from 'class-validator';
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
