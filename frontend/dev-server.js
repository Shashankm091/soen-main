import { createServer } from 'vite'

async function start() {
  const server = await createServer({
    server: { host: true }
  })
  await server.listen()
  server.printUrls()
}

start()
