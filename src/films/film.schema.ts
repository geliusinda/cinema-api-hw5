import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Types } from 'mongoose';

@Schema({ collection: 'films', versionKey: false })
export class Film {
  _id!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  durationMinutes!: number;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  releaseYear!: number;
}
export const FilmSchema = SchemaFactory.createForClass(Film);
