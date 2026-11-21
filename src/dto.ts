import {
  ArgsType,
  Field,
  ID,
  InputType,
  Int,
  PartialType,
  registerEnumType,
} from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { DateTime } from './graphql/date-time.scalar.js';

@InputType()
export class CreateFilmInput {
  @Field()
  @IsString()
  @Matches(/\S/)
  title!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  releaseYear!: number;
}

@InputType()
export class UpdateFilmInput extends PartialType(CreateFilmInput, {
  skipNullProperties: false,
}) {}

@InputType()
export class CreateHallInput {
  @Field()
  @IsString()
  @Matches(/\S/)
  name!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  rows!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  seatsPerRow!: number;
}

@InputType()
export class CreateShowingInput {
  @Field(() => ID)
  @IsMongoId()
  filmId!: string;

  @Field(() => ID)
  @IsMongoId()
  hallId!: string;

  @Field(() => DateTime)
  @IsDate()
  startsAt!: Date;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  price!: number;
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
registerEnumType(SortOrder, { name: 'SortOrder' });

@ArgsType()
export class ShowingsArgs {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsMongoId()
  filmId?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  date?: string | null;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number | null;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number | null;

  @Field(() => SortOrder, { nullable: true, defaultValue: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort?: SortOrder | null;
}

@InputType()
export class SeatInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  row!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  seat!: number;
}

@ArgsType()
export class CreateBookingArgs {
  @Field(() => ID)
  @IsMongoId()
  showingId!: string;

  @Field(() => [SeatInput])
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10_000)
  @ArrayUnique((seat: SeatInput) => seat.row + ':' + seat.seat, {
    message: 'seats must not contain duplicate places',
  })
  @ValidateNested({ each: true })
  @Type(() => SeatInput)
  seats!: SeatInput[];
}
