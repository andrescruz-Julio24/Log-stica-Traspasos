import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DriverCategory } from '@prisma/client';
export class RegisterDriverDto {
  @IsString() @IsNotEmpty() @MaxLength(130) fullName!: string;
  @IsEnum(DriverCategory) category!: DriverCategory;
}
export class DriverAvailabilityDto {
  @IsBoolean() available!: boolean;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}
export class CreateTripDto {
  @IsOptional() @IsString() transferId?: string;
  @IsOptional() @IsString() orderId?: string;
  @IsDateString() plannedDepartureAt!: string;
  @IsOptional() @IsDateString() plannedArrivalAt?: string;
}
export class AssignDriverDto {
  @IsString() @IsNotEmpty() driverId!: string;
  @IsBoolean() provisional!: boolean;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
  @IsOptional() @IsDateString() validUntil?: string;
}
