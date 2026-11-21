import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type QueryFilter } from 'mongoose';
import { CreateShowingInput, ShowingsArgs, SortOrder } from '../dto.js';
import { Film } from '../films/film.schema.js';
import { Hall } from '../halls/hall.schema.js';
import { HallsService } from '../halls/halls.service.js';
import {
  BookingResponse,
  FilmResponse,
  HallResponse,
  ShowingSeatResponse,
  type ShowingResponse,
} from '../responses.js';
import { Showing } from './showing.schema.js';

type ShowingReferences = { film: Film | null; hall: Hall | null };
type PopulatedShowing = Omit<Showing, 'film' | 'hall'> & ShowingReferences;

@Injectable()
export class ShowingsService {
  constructor(
    @InjectModel(Showing.name) private readonly showings: Model<Showing>,
    @InjectModel(Film.name) private readonly films: Model<Film>,
    @InjectModel(Hall.name) private readonly halls: Model<Hall>,
    private readonly hallLayout: HallsService,
  ) {}

  async create({ filmId, hallId, startsAt, price }: CreateShowingInput) {
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('startsAt must be in the future');
    }
    const [film, hall] = await Promise.all([
      this.films.findById(filmId).lean(),
      this.halls.findById(hallId).lean(),
    ]);
    if (!film) throw new NotFoundException('Film not found');
    if (!hall) throw new NotFoundException('Hall not found');
    if (hall.rows * hall.seatsPerRow > 10_000) {
      throw new BadRequestException('Hall layout exceeds 10000 seats');
    }

    const seats = this.hallLayout
      .seats(hall)
      .map((place) => ({ ...place, bookingId: null }));
    const showing = await this.showings.create({
      film: film._id,
      hall: hall._id,
      startsAt,
      price,
      seats,
      bookings: [],
    });
    return this.present({
      _id: showing._id,
      startsAt: showing.startsAt,
      price: showing.price,
      seats: showing.seats,
      bookings: showing.bookings,
      film,
      hall,
    });
  }

  async get(id: Types.ObjectId) {
    const showing = await this.showings
      .findById(id)
      .populate<ShowingReferences>(['film', 'hall'])
      .lean();
    return showing ? this.present(showing) : null;
  }

  async all(args: ShowingsArgs) {
    const { filmId, date } = args;
    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const sort = args.sort === SortOrder.DESC ? 'desc' : 'asc';
    const filter: QueryFilter<Showing> = {};
    if (filmId) filter.film = new Types.ObjectId(filmId);
    if (date) {
      const start = new Date(date + 'T00:00:00Z');
      const end = new Date(start.getTime() + 86_400_000);
      filter.startsAt = { $gte: start, $lt: end };
    }
    const [showings, total] = await Promise.all([
      this.showings
        .find(filter)
        .sort({ startsAt: sort, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate<ShowingReferences>(['film', 'hall'])
        .lean(),
      this.showings.countDocuments(filter),
    ]);
    return {
      items: showings.map((showing) => this.present(showing)),
      total,
      page,
      limit,
    };
  }

  private present({
    _id,
    startsAt,
    price,
    seats,
    bookings,
    film,
    hall,
  }: PopulatedShowing): ShowingResponse {
    return {
      id: _id.toHexString(),
      startsAt,
      price,
      seats: seats.map(ShowingSeatResponse.from),
      bookings: bookings.map((booking) => BookingResponse.from(_id, booking)),
      filmDetails: film ? FilmResponse.from(film) : null,
      hallDetails: hall ? HallResponse.from(hall) : null,
    };
  }
}
