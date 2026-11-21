import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShowingsModule } from '../showings/showings.module.js';
import { Showing, ShowingSchema } from '../showings/showing.schema.js';
import { BookingsResolver } from './bookings.resolver.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Showing.name, schema: ShowingSchema }]),
    ShowingsModule,
  ],
  providers: [BookingsResolver, BookingsService],
  exports: [BookingsService, MongooseModule],
})
export class BookingsModule {}
