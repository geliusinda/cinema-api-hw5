import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Types } from 'mongoose';
import {
  ObjectIdPipe,
  type ParsedObjectId,
} from '../database/object-id.pipe.js';
import { CreateBookingArgs } from '../dto.js';
import { BookingResponse } from '../responses.js';
import { BookingsService } from './bookings.service.js';

@Resolver(() => BookingResponse)
export class BookingsResolver {
  constructor(private readonly service: BookingsService) {}

  @Query(() => [BookingResponse])
  bookings() {
    return this.service.all();
  }

  @Mutation(() => BookingResponse)
  createBooking(@Args() { showingId, seats }: CreateBookingArgs) {
    return this.service.create(new Types.ObjectId(showingId), seats);
  }

  @Mutation(() => Boolean)
  async cancelBooking(
    @Args('id', { type: () => ID }, ObjectIdPipe) id: ParsedObjectId,
  ) {
    await this.service.remove(id);
    return true;
  }
}
