import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Hall } from '../halls/hall.schema.js';
import type { Seat } from '../models.js';
import { BookingResponse } from '../responses.js';
import { Showing, type EmbeddedBooking } from '../showings/showing.schema.js';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Showing.name) private readonly showings: Model<Showing>,
  ) {}

  async all() {
    const bookings = await this.showings.aggregate<{
      _id: Types.ObjectId;
      bookings: EmbeddedBooking;
    }>([
      { $project: { bookings: 1 } },
      { $unwind: '$bookings' },
      { $sort: { 'bookings.createdAt': 1, 'bookings._id': 1 } },
    ]);
    return bookings.map(({ _id, bookings: booking }) =>
      BookingResponse.from(_id, booking),
    );
  }

  async create(id: Types.ObjectId, seats: Seat[]) {
    const showing = await this.showings
      .findById(id)
      .select('hall price')
      .populate<{ hall: Pick<Hall, 'rows' | 'seatsPerRow'> | null }>(
        'hall',
        'rows seatsPerRow',
      )
      .lean();
    if (!showing) throw new NotFoundException('Showing not found');
    const hall = showing.hall;
    if (!hall) throw new NotFoundException('Hall not found');
    if (
      seats.some(({ row, seat }) => row > hall.rows || seat > hall.seatsPerRow)
    ) {
      throw new BadRequestException('Seat is outside hall layout');
    }
    const totalPrice = showing.price * seats.length;
    if (totalPrice > 2_147_483_647) {
      throw new BadRequestException('totalPrice exceeds GraphQL Int range');
    }
    const booking = {
      _id: new Types.ObjectId(),
      seats,
      totalPrice,
      createdAt: new Date(),
    };
    const result = await this.showings.updateOne(
      {
        _id: id,
        $and: seats.map(({ row, seat }) => ({
          seats: { $elemMatch: { row, seat, bookingId: null } },
        })),
      },
      {
        $set: { 'seats.$[target].bookingId': booking._id },
        $push: { bookings: booking },
      },
      {
        arrayFilters: [
          {
            $or: seats.map(({ row, seat }) => ({
              'target.row': row,
              'target.seat': seat,
            })),
          },
        ],
      },
    );
    if (!result.matchedCount) {
      throw new ConflictException('One or more seats are already booked');
    }
    return BookingResponse.from(id, booking);
  }

  async remove(id: Types.ObjectId) {
    const result = await this.showings.updateOne(
      { 'bookings._id': id },
      {
        $set: { 'seats.$[target].bookingId': null },
        $pull: { bookings: { _id: id } },
      },
      { arrayFilters: [{ 'target.bookingId': id }] },
    );
    if (!result.matchedCount) throw new NotFoundException('Booking not found');
  }
}
