import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  ObjectIdPipe,
  type ParsedObjectId,
} from '../database/object-id.pipe.js';
import { CreateFilmInput, UpdateFilmInput } from '../dto.js';
import { FilmResponse } from '../responses.js';
import { FilmsService } from './films.service.js';

@Resolver(() => FilmResponse)
export class FilmsResolver {
  constructor(private readonly service: FilmsService) {}

  @Query(() => [FilmResponse])
  films() {
    return this.service.all();
  }

  @Query(() => FilmResponse, { nullable: true })
  film(@Args('id', { type: () => ID }, ObjectIdPipe) id: ParsedObjectId) {
    return this.service.get(id);
  }

  @Mutation(() => FilmResponse)
  createFilm(@Args('input') input: CreateFilmInput) {
    return this.service.create(input);
  }

  @Mutation(() => FilmResponse)
  updateFilm(
    @Args('id', { type: () => ID }, ObjectIdPipe) id: ParsedObjectId,
    @Args('input') input: UpdateFilmInput,
  ) {
    return this.service.update(id, input);
  }

  @Mutation(() => Boolean)
  async deleteFilm(
    @Args('id', { type: () => ID }, ObjectIdPipe) id: ParsedObjectId,
  ) {
    await this.service.remove(id);
    return true;
  }
}
