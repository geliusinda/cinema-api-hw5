import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateFilmInput, UpdateFilmInput } from '../dto.js';
import { FilmResponse } from '../responses.js';
import { Showing } from '../showings/showing.schema.js';
import { Film } from './film.schema.js';

@Injectable()
export class FilmsService {
  constructor(
    @InjectModel(Film.name) private readonly items: Model<Film>,
    @InjectModel(Showing.name) private readonly showings: Model<Showing>,
  ) {}

  async all() {
    return (await this.items.find().sort({ _id: 1 }).lean()).map(
      FilmResponse.from,
    );
  }

  async get(id: Types.ObjectId) {
    const item = await this.items.findById(id).lean();
    return item ? FilmResponse.from(item) : null;
  }

  async create(data: CreateFilmInput) {
    return FilmResponse.from(await this.items.create(data));
  }

  async update(id: Types.ObjectId, data: UpdateFilmInput) {
    if (!Object.keys(data).length) {
      const film = await this.get(id);
      if (!film) throw new NotFoundException('Film not found');
      return film;
    }
    const film = await this.items
      .findByIdAndUpdate(
        id,
        { $set: data },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .lean();
    if (!film) throw new NotFoundException('Film not found');
    return FilmResponse.from(film);
  }

  async remove(id: Types.ObjectId) {
    if (await this.showings.exists({ film: id })) {
      throw new ConflictException('Film is referenced by a showing');
    }
    const result = await this.items.deleteOne({ _id: id });
    if (!result.deletedCount) throw new NotFoundException('Film not found');
  }
}
