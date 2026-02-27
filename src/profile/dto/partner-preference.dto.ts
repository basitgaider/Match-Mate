import {
  IsEnum,
  IsInt,
  IsArray,
  IsString,
  Min,
  Max,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from './complete-profile.dto';

export class PartnerPreferenceDto {
  @IsEnum(Gender)
  interestedIn: Gender;

  @IsInt()
  @Min(18, { message: 'minAge must be at least 18' })
  @Max(120, { message: 'minAge must be at most 120' })
  @Type(() => Number)
  minAge: number;

  @IsInt()
  @Min(18, { message: 'maxAge must be at least 18' })
  @Max(120, { message: 'maxAge must be at most 120' })
  @Type(() => Number)
  maxAge: number;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(20, { message: 'preferredCities must have at most 20 items' })
  preferredCities: string[];
}
