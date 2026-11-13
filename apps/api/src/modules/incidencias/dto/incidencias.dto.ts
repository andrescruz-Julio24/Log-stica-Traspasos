import { IsOptional,IsString,IsNotEmpty } from 'class-validator';

export class CreateIncidentDto {
  @IsOptional() @IsString() transferId?: string;
  @IsString() @IsNotEmpty() type!: string;
  @IsString() @IsNotEmpty() notes!: string;
}
