import { unwrapResolverError } from '@apollo/server/errors';
import { HttpException, Logger } from '@nestjs/common';
import type { GraphQLFormattedError } from 'graphql';

const logger = new Logger('GraphQL');
const statusCodes: Readonly<Record<number, string>> = {
  400: 'BAD_USER_INPUT',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

export function formatGraphQLError(
  formatted: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const original = unwrapResolverError(error);
  const code = formatted.extensions?.code;
  const location = { locations: formatted.locations, path: formatted.path };

  if (original instanceof HttpException) {
    const domainCode = statusCodes[original.getStatus()];
    if (domainCode) {
      const body = original.getResponse();
      const message =
        typeof body === 'object' && 'message' in body ? body.message : body;
      return {
        ...location,
        message: Array.isArray(message) ? message.join('; ') : String(message),
        extensions: { code: domainCode },
      };
    }
  }

  if (
    code === 'BAD_USER_INPUT' ||
    code === 'GRAPHQL_VALIDATION_FAILED' ||
    code === 'GRAPHQL_PARSE_FAILED'
  ) {
    return {
      ...location,
      message: formatted.message,
      extensions: { code: 'BAD_USER_INPUT' },
    };
  }

  if (!formatted.path) {
    return {
      ...location,
      message: 'Invalid GraphQL request',
      extensions: { code: 'BAD_USER_INPUT' },
    };
  }

  logger.error(
    original instanceof Error
      ? (original.stack ?? original.message)
      : String(original),
  );
  return {
    ...location,
    message: 'Internal server error',
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  };
}
