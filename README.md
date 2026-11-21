# Cinema API (ДЗ №5)

GraphQL API для розкладу кінотеатру та бронювання місць. Проєкт використовує NestJS, Apollo, Mongoose і MongoDB.

## Запуск

Потрібні Node.js 24, npm та Docker Compose.

1. Встановіть залежності командою `npm ci`.
2. Скопіюйте `.env.example` у `.env`.

   ```dotenv
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/cinema
   ```

3. Запустіть MongoDB командою `docker compose up -d --wait`.
4. Щоб додати приклади, виконайте `npm run seed`. Повторний запуск не створює дублікати.
5. Запустіть API командою `npm run start:dev`.

Ендпоінт доступний на [localhost:3000/graphql](http://localhost:3000/graphql). Nest генерує `schema.gql` під час запуску на основі декораторів у коді. [Документація NestJS](https://docs.nestjs.com/graphql/quick-start)

## Перелік сеансів

```graphql
query Schedule {
  showings(page: 1, limit: 5, sort: ASC) {
    total
    page
    limit
    items {
      id
      startsAt
      film { title }
      hall { name }
    }
  }
}
```

Для списку сеансів Mongoose виконує `populate` після вибору сторінки. Ідентифікатори фільмів та залів збираються зі знайдених сеансів. MongoDB отримує один запит на фільми і один на зали, незалежно від кількості сеансів на сторінці. Резолвери полів повертають уже завантажені документи. Ще два запити потрібні для самої сторінки та загальної кількості. Фільтр `date` працює за UTC. За однакового часу початку порядок визначає ID. [Документація Mongoose](https://mongoosejs.com/docs/populate.html)

## Бронювання

```graphql
mutation Book($id: ID!) {
  createBooking(showingId: $id, seats: [{ row: 1, seat: 2 }]) {
    id
    showingId
    totalPrice
    createdAt
  }
}
```

Підставте ID сеансу в змінну `id`. MongoDB перевіряє доступність усіх місць та займає їх одним оновленням документа. Якщо хоча б одне місце зайняте, клієнт отримує `CONFLICT`. Ціни вказуються в копійках, а загальна сума бронювання має вміщатися в GraphQL `Int`.

Команда `npm test` перевіряє API на запущеній MongoDB, зокрема кількість запитів для вкладених полів і конфлікт одночасних бронювань.
