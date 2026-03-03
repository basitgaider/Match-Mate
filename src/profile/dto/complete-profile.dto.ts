import {
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { IsProfilePhoto } from '../../common/validators/profile-photo.validator';
import { EducationLevel } from '@prisma/client';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum MaritalStatus {
  MARRIED = 'MARRIED',
  UNMARRIED = 'UNMARRIED',
  WIDOW = 'WIDOW',
  DIVORCED = 'DIVORCED',
}

export class CompleteProfileDto {
  /** Profile photo: HTTP(S) URL, or base64 (data:image/...;base64,... or raw base64 from app). */
  @IsOptional()
  @IsProfilePhoto()
  profilePhoto?: string;

  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  @MaxLength(200)
  location: string;

  @IsEnum(MaritalStatus)
  maritalStatus: MaritalStatus;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  @MaxLength(150)
  profession: string;

  @IsEnum(EducationLevel)
  education: EducationLevel;

  @IsNumber()
  @Min(50, { message: 'Height must be at least 50 cm' })
  @Max(300, { message: 'Height must be at most 300 cm' })
  height: number;

  @IsString()
  @MaxLength(2000)
  aboutYourself: string;
}
