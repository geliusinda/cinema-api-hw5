import { NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  ObjectIdPipe,
  type ParsedObjectId,
} from '../database/object-id.pipe.js';
import { CreateShowingInput, ShowingsArgs } from '../dto.js';
import {
  FilmResponse,
  HallResponse,
  ShowingPage,
  ShowingResponse,
} from '../responses.js';
import { ShowingsService } from './showings.service.js';

@Resolver(() => ShowingResponse)
export class ShowingsResolver {
  constructor(private readonly showingsService: ShowingsService) {}

  @Query(() => ShowingPage)
  showings(@Args() args: ShowingsArgs) {
    return this.showingsService.all(args);
  }

  @Query(() => ShowingResponse, { nullable: true })
  showing(@Args('id', { type: () => ID }, ObjectIdPipe) id: ParsedObjectId) {
    return this.showingsService.get(id);
  }

  @Mutation(() => ShowingResponse)
  createShowing(@Args('input') input: CreateShowingInput) {
    return this.showingsService.create(input);
  }

  @ResolveField(() => FilmResponse)
  film(@Parent() showing: ShowingResponse) {
    if (!showing.filmDetails) throw new NotFoundException('Film not found');
    return showing.filmDetails;
  }

  @ResolveField(() => HallResponse)
  hall(@Parent() showing: ShowingResponse) {
    if (!showing.hallDetails) throw new NotFoundException('Hall not found');
    return showing.hallDetails;
  }
}
