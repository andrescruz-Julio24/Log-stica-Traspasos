import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { IsEnum, IsOptional, IsDateString, Matches } from 'class-validator';
import { Priority } from '@prisma/client';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString() @IsNotEmpty() productId!: string;
  @IsInt() @Min(1) required!: number;
}
export class PlanOrderDto {
  @IsOptional() @IsEnum(Priority) priority?: Priority;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsString() @Matches(/\S/) reason!: string;
}
export class CreateOrderDto {
  @IsOptional() @IsEnum(Priority) priority?: Priority;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsString() @IsNotEmpty() customer!: string;
  @IsString() @IsNotEmpty() destinationId!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
