import { plainToInstance, Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export class Environment {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  @Matches(/^mongodb(?:\+srv)?:\/\/\S+$/)
  MONGODB_URI!: string;
}

export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  const configuration = plainToInstance(Environment, {
    PORT: input.PORT ?? 3000,
    MONGODB_URI: input.MONGODB_URI,
  });
  const errors = validateSync(configuration);
  if (errors.length) {
    const fields = errors.map(({ property }) => property).join(', ');
    throw new Error('Invalid configuration: ' + fields);
  }
  return configuration;
}
