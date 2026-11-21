import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateHallInput } from '../dto.js';
import { HallResponse } from '../responses.js';
import { Showing } from '../showings/showing.schema.js';
import { Hall } from './hall.schema.js';

@Injectable()
export class HallsService {
  constructor(
    @InjectModel(Hall.name) private readonly items: Model<Hall>,
    @InjectModel(Showing.name) private readonly showings: Model<Showing>,
  ) {}

  async onModuleInit() {
    await this.items.init();
  }

  async all() {
    return (await this.items.find().sort({ _id: 1 }).lean()).map(
      HallResponse.from,
    );
  }

  async get(id: Types.ObjectId) {
    const item = await this.items.findById(id).lean();
    return item ? HallResponse.from(item) : null;
  }

  async create(data: CreateHallInput) {
    if (data.rows * data.seatsPerRow > 10_000) {
      throw new BadRequestException('Hall layout exceeds 10000 seats');
    }
    try {
      return HallResponse.from(await this.items.create(data));
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictException('Hall name already exists');
      }
      throw error;
    }
  }

  seats({ rows, seatsPerRow }: Pick<Hall, 'rows' | 'seatsPerRow'>) {
    return Array.from({ length: rows }, (_, row) =>
      Array.from({ length: seatsPerRow }, (_, seat) => ({
        row: row + 1,
        seat: seat + 1,
      })),
    ).flat();
  }

  async remove(id: Types.ObjectId) {
    if (await this.showings.exists({ hall: id })) {
      throw new ConflictException('Hall is referenced by a showing');
    }
    const result = await this.items.deleteOne({ _id: id });
    if (!result.deletedCount) throw new NotFoundException('Hall not found');
  }
}
