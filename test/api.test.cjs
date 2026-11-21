const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const request = require('supertest');

void test('GraphQL operations, batched references and atomic bookings', async () => {
  const { NestFactory } = await import('@nestjs/core');
  const { getModelToken, getConnectionToken } =
    await import('@nestjs/mongoose');
  const { AppModule } = await import('../dist/app.module.js');
  const { setup } = await import('../dist/setup.js');
  const app = await NestFactory.create(AppModule, { logger: false });
  setup(app);
  await app.init();

  const http = request(app.getHttpServer());
  const films = app.get(getModelToken('Film'));
  const halls = app.get(getModelToken('Hall'));
  const showings = app.get(getModelToken('Showing'));
  const connection = app.get(getConnectionToken());
  const filmIds = [];
  const hallIds = [];
  const marker = randomUUID();
  const missingId = '000000000000000000000000';

  const execute = async (query, variables) => {
    const response = await http.post('/graphql').send({ query, variables });
    assert.ok(response.body.data || response.body.errors, response.text);
    return response.body;
  };
  const data = async (query, variables) => {
    const body = await execute(query, variables);
    assert.equal(body.errors, undefined, JSON.stringify(body.errors));
    return body.data;
  };
  const error = async (code, query, variables) => {
    const result = await execute(query, variables);
    assert.equal(
      result.errors?.[0].extensions.code,
      code,
      JSON.stringify(result),
    );
    return result.errors[0];
  };
  const filmOperation =
    'mutation($input: CreateFilmInput!) { createFilm(input: $input) { id title durationMinutes releaseYear } }';
  const hallOperation =
    'mutation($input: CreateHallInput!) { createHall(input: $input) { id name rows seatsPerRow } }';
  const showingOperation =
    'mutation($input: CreateShowingInput!) { createShowing(input: $input) { id startsAt film { title } hall { name } seats { isBooked } bookings { id } } }';
  const bookingOperation =
    'mutation($id: ID!, $seats: [SeatInput!]!) { createBooking(showingId: $id, seats: $seats) { id showingId seats { row seat } totalPrice createdAt } }';
  const cancelOperation = 'mutation($id: ID!) { cancelBooking(id: $id) }';
  const filmInput = {
    title: 'Film ' + marker,
    durationMinutes: 90,
    releaseYear: 2026,
  };
  const hallInput = { name: 'Hall ' + marker, rows: 3, seatsPerRow: 5 };

  try {
    await http.get('/films').expect(404);
    await http.get('/docs').expect(404);
    await error('BAD_USER_INPUT', filmOperation, {
      input: { ...filmInput, durationMinutes: 0 },
    });
    await error('BAD_USER_INPUT', '{ film(id: "invalid") { id } }');
    assert.deepEqual(
      await data(
        'query($id: ID!) { film(id: $id) { id } hall(id: $id) { id } showing(id: $id) { id } }',
        { id: missingId },
      ),
      { film: null, hall: null, showing: null },
    );

    const { createFilm: film } = await data(filmOperation, {
      input: filmInput,
    });
    filmIds.push(film.id);
    assert.match(film.id, /^[a-f0-9]{24}$/);
    assert.ok(
      (await data('{ films { id } }')).films.some(({ id }) => id === film.id),
    );
    const update =
      'mutation($id: ID!, $input: UpdateFilmInput!) { updateFilm(id: $id, input: $input) { title } }';
    assert.equal(
      (await data(update, { id: film.id, input: { title: 'Updated' } }))
        .updateFilm.title,
      'Updated',
    );
    await error('BAD_USER_INPUT', update, {
      id: film.id,
      input: { title: null },
    });
    await error('NOT_FOUND', update, { id: missingId, input: {} });

    await error('BAD_USER_INPUT', hallOperation, {
      input: { ...hallInput, rows: 0 },
    });
    const { createHall: hall } = await data(hallOperation, {
      input: hallInput,
    });
    hallIds.push(hall.id);
    assert.ok(
      (await data('{ halls { id } }')).halls.some(({ id }) => id === hall.id),
    );
    assert.equal(
      (
        await data('query($id: ID!) { hall(id: $id) { name } }', {
          id: hall.id,
        })
      ).hall.name,
      hall.name,
    );
    await error('CONFLICT', hallOperation, { input: hallInput });

    const showingInput = {
      filmId: film.id,
      hallId: hall.id,
      startsAt: '2099-06-15T12:00:00Z',
      price: 12500,
    };
    await error('NOT_FOUND', showingOperation, {
      input: { ...showingInput, filmId: missingId },
    });
    await error('NOT_FOUND', showingOperation, {
      input: { ...showingInput, hallId: missingId },
    });
    await error('BAD_USER_INPUT', showingOperation, {
      input: { ...showingInput, hallId: 'invalid' },
    });
    await error('BAD_USER_INPUT', showingOperation, {
      input: { ...showingInput, startsAt: '2099-02-30T12:00:00Z' },
    });
    await error('BAD_USER_INPUT', showingOperation, {
      input: { ...showingInput, startsAt: '2000-01-01T00:00:00Z' },
    });
    await error('BAD_USER_INPUT', showingOperation, {
      input: { ...showingInput, price: 1.5 },
    });
    const { createShowing: showing } = await data(showingOperation, {
      input: showingInput,
    });
    const { createShowing: same } = await data(showingOperation, {
      input: showingInput,
    });
    const { createShowing: early } = await data(showingOperation, {
      input: { ...showingInput, startsAt: '2099-06-14T23:00:00Z' },
    });
    assert.equal(showing.film.title, 'Updated');
    assert.equal(showing.hall.name, hall.name);
    assert.equal(showing.seats.length, 15);
    assert.ok(showing.seats.every(({ isBooked }) => !isBooked));
    assert.deepEqual(showing.bookings, []);

    const queries = [];
    connection.set('debug', (collection, method) =>
      queries.push(collection + '.' + method),
    );
    try {
      const { showings: page } = await data(
        'query($film: ID!) { showings(filmId: $film) { total page limit items { id film { title } hall { name } } } }',
        { film: film.id },
      );
      assert.deepEqual(
        page.items.map(({ id }) => id),
        [early.id, ...[showing.id, same.id].sort((a, b) => a.localeCompare(b))],
      );
      assert.equal(page.total, 3);
      assert.equal(page.page, 1);
      assert.equal(page.limit, 20);
      assert.deepEqual(
        queries.sort((a, b) => a.localeCompare(b)),
        [
          'films.find',
          'halls.find',
          'showings.countDocuments',
          'showings.find',
        ],
      );
    } finally {
      connection.set('debug', false);
    }
    const { showings: filtered } = await data(
      'query($film: ID!) { showings(filmId: $film, date: "2099-06-15", page: 2, limit: 1, sort: DESC) { total items { id } } }',
      { film: film.id },
    );
    assert.equal(filtered.total, 2);
    assert.equal(filtered.items.length, 1);
    for (const args of [
      'page: 0',
      'limit: 101',
      'sort: asc',
      'filmId: "invalid"',
      'date: "2099-02-30"',
    ]) {
      await error('BAD_USER_INPUT', '{ showings(' + args + ') { total } }');
    }

    const place = { row: 1, seat: 1 };
    await error('NOT_FOUND', bookingOperation, {
      id: missingId,
      seats: [place],
    });
    for (const seats of [
      [],
      [place, place],
      [{ row: 4, seat: 1 }],
      [{ row: 0, seat: 1 }],
      [{ row: 1 }],
    ]) {
      await error('BAD_USER_INPUT', bookingOperation, {
        id: showing.id,
        seats,
      });
    }
    const { createBooking: booking } = await data(bookingOperation, {
      id: showing.id,
      seats: [place],
    });
    assert.equal(booking.totalPrice, 12500);
    assert.equal(booking.showingId, showing.id);
    assert.ok(Number.isFinite(Date.parse(booking.createdAt)));
    const conflict = await error('CONFLICT', bookingOperation, {
      id: showing.id,
      seats: [{ row: 1, seat: 2 }, place],
    });
    assert.deepEqual(conflict.extensions, { code: 'CONFLICT' });
    const readShowing =
      'query($id: ID!) { showing(id: $id) { seats { isBooked } bookings { id seats { row seat } } } }';
    const beforeCancel = (await data(readShowing, { id: showing.id })).showing;
    assert.equal(beforeCancel.seats[0].isBooked, true);
    assert.equal(beforeCancel.seats[1].isBooked, false);
    assert.deepEqual(
      beforeCancel.bookings.map(({ id }) => id),
      [booking.id],
    );
    assert.ok(
      (await data('{ bookings { id } }')).bookings.some(
        ({ id }) => id === booking.id,
      ),
    );

    assert.equal(
      (await data(cancelOperation, { id: booking.id })).cancelBooking,
      true,
    );
    await error('NOT_FOUND', cancelOperation, { id: booking.id });
    const afterCancel = (await data(readShowing, { id: showing.id })).showing;
    assert.equal(afterCancel.seats[0].isBooked, false);
    assert.deepEqual(afterCancel.bookings, []);
    const concurrent = await Promise.all([
      execute(bookingOperation, { id: showing.id, seats: [place] }),
      execute(bookingOperation, { id: showing.id, seats: [place] }),
    ]);
    assert.equal(
      concurrent.filter((result) => result.data?.createBooking).length,
      1,
    );
    assert.equal(
      concurrent.find((result) => result.errors).errors[0].extensions.code,
      'CONFLICT',
    );

    for (const [field, protectedId, create, input, ids] of [
      ['deleteFilm', film.id, filmOperation, filmInput, filmIds],
      [
        'deleteHall',
        hall.id,
        hallOperation,
        { ...hallInput, name: 'Disposable ' + marker },
        hallIds,
      ],
    ]) {
      const remove = 'mutation($id: ID!) { ' + field + '(id: $id) }';
      await error('CONFLICT', remove, { id: protectedId });
      await error('NOT_FOUND', remove, { id: missingId });
      const [created] = Object.values(await data(create, { input }));
      ids.push(created.id);
      assert.equal((await data(remove, { id: created.id }))[field], true);
    }

    const failure = new Error('private database failure');
    const mock = await test.mock.method(films, 'find', () => {
      throw failure;
    });
    try {
      const hidden = await error('INTERNAL_SERVER_ERROR', '{ films { id } }');
      assert.equal(hidden.message, 'Internal server error');
      assert.deepEqual(hidden.extensions, { code: 'INTERNAL_SERVER_ERROR' });
    } finally {
      mock.mock.restore();
    }
  } finally {
    try {
      await showings.deleteMany({ film: { $in: filmIds } });
      await films.deleteMany({ _id: { $in: filmIds } });
      await halls.deleteMany({ _id: { $in: hallIds } });
    } finally {
      await app.close();
    }
  }
});
