import { createApp } from './app.ts'
const app = createApp(process.env.SQLITE_PATH ?? 'aftercare.sqlite', process.env.DEMO_SECRET ?? '')
await app.listen({ host: '127.0.0.1', port: 3101 })
