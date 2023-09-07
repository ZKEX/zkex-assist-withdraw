import { Request, Response } from 'express'
import { register } from 'prom-client'

export async function metrics(req: Request, res: Response) {
  res.set('Content-Type', register.contentType)
  res.end(register.metrics())
}
