import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Hall, HallSchema } from './hall.schema.js';
import { Showing, ShowingSchema } from '../showings/showing.schema.js';
import { HallsResolver } from './halls.resolver.js';
import { HallsService } from './halls.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hall.name, schema: HallSchema },
      { name: Showing.name, schema: ShowingSchema },
    ]),
  ],
  providers: [HallsResolver, HallsService],
  exports: [HallsService, MongooseModule],
})
export class HallsModule {}
