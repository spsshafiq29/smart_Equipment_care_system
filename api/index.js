import { app } from "../server/app.js"

export default async function handler(req, res) {
  return app.handle(req, res)
}
