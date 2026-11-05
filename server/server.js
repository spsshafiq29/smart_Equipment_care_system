import http from "node:http"
import { app } from "./app.js"

const PORT = parseInt(process.env.API_PORT || process.env.PORT || "5000", 10)

const server = http.createServer((req, res) => {
  app.handle(req, res)
})

server.listen(PORT, () => {
  console.log(
    `[PERN Stack] SECS Express API server listening at http://localhost:${PORT}/api/v1/`,
  )
})

export { server }
