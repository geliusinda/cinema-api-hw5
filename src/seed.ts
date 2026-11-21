import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { Film } from './films/film.schema.js';
import { Hall } from './halls/hall.schema.js';
import { HallsService } from './halls/halls.service.js';
import { Showing } from './showings/showing.schema.js';

function seedId(number: number) {
  return new Types.ObjectId('a17b' + number.toString(16).padStart(20, '0'));
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const films = app.get<Model<Film>>(getModelToken(Film.name));
    const halls = app.get<Model<Hall>>(getModelToken(Hall.name));
    const showings = app.get<Model<Showing>>(getModelToken(Showing.name));
    const layout = app.get(HallsService);
    await Promise.all([films.init(), halls.init(), showings.init()]);

    const filmData = [
      {
        _id: seedId(1),
        title: 'Interstellar',
        durationMinutes: 169,
        releaseYear: 2014,
      },
      {
        _id: seedId(2),
        title: 'Arrival',
        durationMinutes: 116,
        releaseYear: 2016,
      },
    ];
    for (const film of filmData) {
      await films.updateOne(
        { _id: film._id },
        { $setOnInsert: film },
        { upsert: true },
      );
    }

    const hallData = [
      { _id: seedId(3), name: 'Seed Blue', rows: 4, seatsPerRow: 6 },
      { _id: seedId(4), name: 'Seed Gold', rows: 6, seatsPerRow: 8 },
    ];
    const seededHalls = [];
    for (const hall of hallData) {
      seededHalls.push(
        await halls
          .findOneAndUpdate(
            { name: hall.name },
            { $setOnInsert: hall },
            { upsert: true, returnDocument: 'after' },
          )
          .orFail()
          .lean(),
      );
    }

    const price = 15000;
    for (let index = 0; index < 4; index++) {
      const hall = seededHalls[index % 2];
      const bookingId = seedId(9);
      const bookedPlace = { row: 1, seat: 1 };
      const seats = layout.seats(hall).map(({ row, seat }) => ({
        row,
        seat,
        bookingId: index === 0 && row === 1 && seat === 1 ? bookingId : null,
      }));
      const bookings =
        index === 0
          ? [
              {
                _id: bookingId,
                seats: [bookedPlace],
                totalPrice: price,
                createdAt: new Date(),
              },
            ]
          : [];
      await showings.updateOne(
        { _id: seedId(5 + index) },
        {
          $setOnInsert: {
            film: filmData[index % 2]._id,
            hall: hall._id,
            startsAt: new Date(Date.UTC(2099, 6, index + 1, 18)),
            price,
            seats,
            bookings,
          },
        },
        { upsert: true },
      );
    }
    console.log('Cinema seed complete.');
  } finally {
    await app.close();
  }
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
