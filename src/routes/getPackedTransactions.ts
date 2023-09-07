import { getPackedTransactionsPagedData } from '../db/packedTransactions'
import { logger } from '../log'

export async function getPackedTransactions(req: any, res: any) {
  try {
    let { page, limit = 20 } = req.query
    page = Number(page)
    limit = Number(limit)

    if (isNaN(page) || page < 0) {
      throw new Error(`Invalid params 'page'`)
    }

    if (isNaN(limit)) {
      throw new Error(`Invalid params 'limit'`)
    }

    if (limit < 1 || limit > 100) {
      throw new Error(`The range of limit is 1-100`)
    }

    const { count, list } = await getPackedTransactionsPagedData(page, limit)

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
