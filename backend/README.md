# Backend (Node + Prisma)

## Prisma Connection Strategy

- `DATABASE_URL`: pooled runtime URL (used by Express app + Prisma adapter pool)
- `DIRECT_DATABASE_URL`: direct Postgres URL (used for Prisma migrations)
- `PRISMA_MIGRATE_DATABASE_URL`: optional explicit migration URL override

This setup is provider-neutral and works with managed PostgreSQL platforms such as Neon or Supabase.

`prisma.config.ts` resolves Prisma CLI datasource URL in this order:
1. `PRISMA_MIGRATE_DATABASE_URL`
2. `DIRECT_DATABASE_URL`
3. `DATABASE_URL`

## Migration Workflow (Recommended)

1. Update `prisma/schema.prisma`.
2. Create migration:
   - `npm.cmd run prisma:migrate:dev -- --name <change_name>`
3. Commit both:
   - `prisma/schema.prisma`
   - `prisma/migrations/*`
4. Deploy migration in server/CI:
   - `npm.cmd run prisma:migrate:deploy`
5. Check status:
   - `npm.cmd run prisma:migrate:status`

## Commands

- Generate client: `npm.cmd run prisma:generate`
- Validate schema: `npm.cmd run prisma:validate`
- Format schema: `npm.cmd run prisma:format`
- Studio: `npm.cmd run prisma:studio`

## Notes

- Avoid `prisma db push` in production.
- Keep app region and database region aligned for low latency.
