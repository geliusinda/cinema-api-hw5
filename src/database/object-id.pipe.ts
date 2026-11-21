import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { Types } from 'mongoose';

export type ParsedObjectId = InstanceType<typeof Types.ObjectId>;

export const objectIdPattern = '^[a-fA-F0-9]{24}$';
export const objectIdSchema = {
  type: 'string' as const,
  pattern: objectIdPattern,
};

@Injectable()
export class ObjectIdPipe implements PipeTransform<string, Types.ObjectId> {
  transform(value: string) {
    if (!new RegExp(objectIdPattern).test(value)) {
      throw new BadRequestException(
        'id must be a 24-character hexadecimal ObjectId',
      );
    }
    return new Types.ObjectId(value);
  }
}
