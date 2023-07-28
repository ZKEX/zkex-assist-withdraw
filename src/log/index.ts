import path from 'path'
import { createLogger, format, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { TRANSPORT_CONSOLE } from './../conf'

const { combine, timestamp, colorize, simple, printf } = format
const logsDir = path.resolve(__dirname, '../../logs')

export const logger = createLogger({
  level: 'debug',
  format: combine(
    timestamp(),
    printf(({ level, message, timestamp, stack }) => {
      return `[${timestamp}] [${level.toUpperCase()}]: ${
        stack ? stack : message
      }`
    })
  ),
  // defaultMeta: { service: 'user-service' },
  transports: [
    new DailyRotateFile({
      filename: path.resolve(logsDir, 'error', 'error-%DATE%.log'),
      datePattern: 'yyyy-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
    }),
    new DailyRotateFile({
      filename: path.resolve(logsDir, 'warn', 'warn-%DATE%.log'),
      datePattern: 'yyyy-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '20d',
      level: 'warn',
    }),
    new DailyRotateFile({
      filename: path.resolve(logsDir, 'info', 'info-%DATE%.log'),
      datePattern: 'yyyy-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info',
    }),
    new DailyRotateFile({
      filename: path.resolve(logsDir, 'debug', 'debug-%DATE%.log'),
      datePattern: 'yyyy-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
      level: 'debug',
    }),
  ],
})

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (TRANSPORT_CONSOLE) {
  logger.add(
    new transports.Console({
      format: combine(colorize(), simple()),
    })
  )
}
