import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { Types } from 'mongoose';
import type { Film } from './films/film.schema.js';
import type { Hall } from './halls/hall.schema.js';
import { DateTime } from './graphql/date-time.scalar.js';
import type {
  EmbeddedBooking,
  ShowingSeat,
} from './showings/showing.schema.js';

@ObjectType('Film')
export class FilmResponse {
  @Field(() => ID) id!: string;
  @Field() title!: string;
  @Field(() => Int) durationMinutes!: number;
  @Field(() => Int) releaseYear!: number;

  static from(
    this: void,
    { _id, title, durationMinutes, releaseYear }: Film,
  ): FilmResponse {
    return { id: _id.toHexString(), title, durationMinutes, releaseYear };
  }
}

@ObjectType('Hall')
export class HallResponse {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field(() => Int) rows!: number;
  @Field(() => Int) seatsPerRow!: number;

  static from(
    this: void,
    { _id, name, rows, seatsPerRow }: Hall,
  ): HallResponse {
    return { id: _id.toHexString(), name, rows, seatsPerRow };
  }
}

@ObjectType('BookedSeat')
export class BookedSeatResponse {
  @Field(() => Int) row!: number;
  @Field(() => Int) seat!: number;
}

@ObjectType('Seat')
export class ShowingSeatResponse {
  @Field(() => Int) row!: number;
  @Field(() => Int) seat!: number;
  @Field() isBooked!: boolean;

  static from(
    this: void,
    { row, seat, bookingId }: ShowingSeat,
  ): ShowingSeatResponse {
    return { row, seat, isBooked: bookingId !== null };
  }
}

@ObjectType('Booking')
export class BookingResponse {
  @Field(() => ID) id!: string;
  @Field(() => ID) showingId!: string;
  @Field(() => [BookedSeatResponse]) seats!: BookedSeatResponse[];
  @Field(() => Int) totalPrice!: number;
  @Field(() => DateTime) createdAt!: Date;

  static from(
    showingId: Types.ObjectId,
    { _id, seats, totalPrice, createdAt }: EmbeddedBooking,
  ): BookingResponse {
    return {
      id: _id.toHexString(),
      showingId: showingId.toHexString(),
      seats: seats.map(({ row, seat }) => ({ row, seat })),
      totalPrice,
      createdAt,
    };
  }
}

@ObjectType('Showing')
export class ShowingResponse {
  @Field(() => ID) id!: string;
  @Field(() => DateTime) startsAt!: Date;
  @Field(() => Int) price!: number;
  @Field(() => [ShowingSeatResponse]) seats!: ShowingSeatResponse[];
  @Field(() => [BookingResponse]) bookings!: BookingResponse[];
  filmDetails!: FilmResponse | null;
  hallDetails!: HallResponse | null;
}

@ObjectType('ShowingPage')
export class ShowingPage {
  @Field(() => [ShowingResponse]) items!: ShowingResponse[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
}
