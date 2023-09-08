import { Request, Response } from 'express'
import { getRequestsPagedData } from '../../../db/requests'
import { PublicError, logger } from '../../../log'

export interface RequestsParams {
  page: number
  limit: number
  hash: string | undefined
}

export async function getRequests(req: Request, res: Response) {
  try {
    let { page, limit = 20, hash } = req.query
    const params: RequestsParams = {
      page: Number(page),
      limit: Number(limit),
      hash: hash ? String(hash) : undefined,
    }

    if (isNaN(params.page) || params.page < 0) {
      throw new PublicError(`Invalid params 'page'`)
    }
    if (isNaN(params.limit)) {
      throw new PublicError(`Invalid params 'limit'`)
    }
    if (params.limit < 1 || params.limit > 100) {
      throw new PublicError(`The range of limit is 1-100`)
    }
    if (typeof hash !== 'undefined' && typeof hash !== 'string') {
      throw new PublicError('Invalid tx hash type')
    }
    if (typeof hash === 'string') {
      if (hash.length !== 0 && hash.length !== 66) {
        throw new PublicError('Invalid tx hash length')
      }
    }

    const { count, list } = await getRequestsPagedData(params)

    res.json({
      code: 0,
      data: {
        count,
        list,
      },
    })
  } catch (e: any) {
    logger.error(e)
    res.json({
      code: e?.code ?? 500,
      message: e?.message,
    })
  }
}
