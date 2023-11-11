# Bootcamp API - Typescript Port

Original project - https://github.com/dvinubius/bootcamp-api

This project is a Typescript port of an express app that uses mongoDB to provide a REST API.

I've kept mongoose in spite of all its issues with TS, i.e. sound strong typing.

I've noticed some express specific issues when it comes to strong typing.

My conclusions are documented in a series of [blog posts](https://medium.com)

# TODO provide link

## basic mongoose + TS

- ✅ @types for all dependencies

- ✅ .ts file extensions

- ✅ fix local imports

- ✅ add types for models (mirror schemas, export types to be able to work on them as models)

- ✅ typed helpers, middleware

- ✅ typed routes & handlers

- ✅ eliminate mongoose-fill -> replace with setBootcampsJoined(userDocument)

- ✅ forgot password: email server

- ✅ make use of TS quasi-enums (via object as const) - [the recommended way in the docs](https://www.typescriptlang.org/docs/handbook/enums.html#objects-vs-enums) -> but used a more lightweight approach

- ensure participants are added to bootcamp as intended

- ✅ cleaner routes, not nested in bootcamp for courses of a bootcamp or reviews of a bootcamp

- ✅ average ratings & cost update correctly?

- ✅ check env globally - if any value is missing don't start the server

- attempt reorganize into feature-oriented directory structure

## zod + mongo + TS

- use zod to also validate env vars
- remove mongoose dependency?

## zod + prisma (postgres)

- rework data model (relations, what is fetched & popualted on fetch)

## zod + nest + typeorm (postgres)
