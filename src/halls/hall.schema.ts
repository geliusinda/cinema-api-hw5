import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Types } from 'mongoose';

@Schema({ collection: 'halls', versionKey: false })
export class Hall {
  _id!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  rows!: number;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  seatsPerRow!: number;
}
export const HallSchema = SchemaFactory.createForClass(Hall);
