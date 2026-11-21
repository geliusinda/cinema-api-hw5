import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Film, FilmSchema } from './film.schema.js';
import { Showing, ShowingSchema } from '../showings/showing.schema.js';
import { FilmsResolver } from './films.resolver.js';
import { FilmsService } from './films.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Film.name, schema: FilmSchema },
      { name: Showing.name, schema: ShowingSchema },
    ]),
  ],
  providers: [FilmsResolver, FilmsService],
  exports: [FilmsService, MongooseModule],
})
export class FilmsModule {}
