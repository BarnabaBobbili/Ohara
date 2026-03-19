import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const migrationUrl = process.env.PRISMA_MIGRATE_DATABASE_URL || process.env.DIRECT_DATABASE_URL
const datasourceUrl = migrationUrl || process.env.DATABASE_URL

if (!datasourceUrl) {
    throw new Error('DATABASE_URL is required (or set PRISMA_MIGRATE_DATABASE_URL / DIRECT_DATABASE_URL for Prisma CLI)')
}

export default defineConfig({
    schema: 'prisma/schema.prisma',
    datasource: {
        url: datasourceUrl,
        shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
    },
    migrations: {
        path: 'prisma/migrations',
    },
})
