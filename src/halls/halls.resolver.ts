import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  ObjectIdPipe,
  type ParsedObjectId,
} from '../database/object-id.pipe.js';
import { CreateHallInput } from '../dto.js';
import { HallResponse } from '../responses.js';
import { HallsService } from './halls.service.js';

@Resolver(() => HallResponse)
export class HallsResolver {
  constructor(private readonly service: HallsService) {}

  @Query(() => [HallResponse])
  halls() {
    return this.service.all();
  }

  @Query(() => HallResponse, { nullable: true })
  hall(@Args('id', { type: () => ID }, ObjectIdPipe) id: ParsedObjectId) {
    return this.service.get(id);
  }

  @Mutation(() => HallResponse)
  createHall(@Args('input') input: CreateHallInput) {
    return this.service.create(input);
  }

  @Mutation(() => Boolean)
  async deleteHall(
    @Args('id', { type: () => ID }, ObjectIdPipe) id: ParsedObjectId,
  ) {
    await this.service.remove(id);
    return true;
  }
}
