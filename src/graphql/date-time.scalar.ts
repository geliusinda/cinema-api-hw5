import { isISO8601 } from 'class-validator';
import { GraphQLError, GraphQLScalarType, Kind } from 'graphql';

function parseDateTime(value: unknown): Date {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !isISO8601(value, { strict: true, strictSeparator: true })
  ) {
    throw new GraphQLError(
      'DateTime must be a valid ISO 8601 timestamp with a timezone',
    );
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new GraphQLError('Invalid DateTime value');
  }
  return date;
}

export const DateTime = new GraphQLScalarType<Date, string>({
  name: 'DateTime',
  description: 'ISO 8601 timestamp with a timezone',
  serialize(value) {
    if (!(value instanceof Date)) throw new Error('Expected a Date value');
    return value.toISOString();
  },
  parseValue: parseDateTime,
  parseLiteral(node) {
    return parseDateTime(node.kind === Kind.STRING ? node.value : undefined);
  },
});
