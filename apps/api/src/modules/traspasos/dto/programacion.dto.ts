import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class ScheduleTransferDto {
  @IsString() @IsNotEmpty() orderId!: string;
  @IsDateString() departureAt!: string;
  @IsDateString() expectedArrivalAt!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}
