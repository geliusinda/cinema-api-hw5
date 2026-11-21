import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Film } from '../films/film.schema.js';
import { Hall } from '../halls/hall.schema.js';

@Schema({ _id: false })
export class SeatLocation {
  @Prop({ type: Number, required: true, min: 1, validate: Number.isInteger })
  row!: number;

  @Prop({ type: Number, required: true, min: 1, validate: Number.isInteger })
  seat!: number;
}
const SeatLocationSchema = SchemaFactory.createForClass(SeatLocation);

@Schema({ _id: false })
export class ShowingSeat extends SeatLocation {
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  bookingId!: Types.ObjectId | null;
}
const ShowingSeatSchema = SchemaFactory.createForClass(ShowingSeat);

@Schema()
export class EmbeddedBooking {
  _id!: Types.ObjectId;

  @Prop({ type: [SeatLocationSchema], required: true })
  seats!: SeatLocation[];

  @Prop({ required: true, min: 1, validate: Number.isSafeInteger })
  totalPrice!: number;

  @Prop({ required: true, default: Date.now })
  createdAt!: Date;
}
const EmbeddedBookingSchema = SchemaFactory.createForClass(EmbeddedBooking);

@Schema({ collection: 'showings', versionKey: false })
export class Showing {
  _id!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Film.name, required: true })
  film!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Hall.name, required: true })
  hall!: Types.ObjectId;

  @Prop({ required: true })
  startsAt!: Date;

  @Prop({ required: true, min: 1, validate: Number.isSafeInteger })
  price!: number;

  @Prop({ type: [ShowingSeatSchema], required: true, default: [] })
  seats!: ShowingSeat[];

  @Prop({ type: [EmbeddedBookingSchema], required: true, default: [] })
  bookings!: EmbeddedBooking[];
}
export const ShowingSchema = SchemaFactory.createForClass(Showing);
ShowingSchema.index({ startsAt: 1, _id: 1 });
ShowingSchema.index({ film: 1, startsAt: 1, _id: 1 });
ShowingSchema.index({ hall: 1 });
ShowingSchema.index({ 'bookings._id': 1 });
