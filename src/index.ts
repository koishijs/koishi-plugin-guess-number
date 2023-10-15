import { Context, Dict, isInteger, Schema, Session } from 'koishi'
import {} from 'koishi-plugin-rate-limit'

declare module 'koishi' {
  interface Events {
    'guess-number/win'(this: Session, stage: Stage, output: string[]): void
    'guess-number/lose'(this: Session, stage: Stage, output: string[]): void
  }
}

export const name = 'guess-number'

export interface Config {
  base?: number
  length?: number
  chances?: number
}

export const Config: Schema<Config> = Schema.object({
  base: Schema.number().default(10).description('标准开局下的进制数。'),
  length: Schema.number().default(4).description('标准开局下的答案长度。'),
  chances: Schema.number().default(10).description('标准开局下的猜测次数。'),
})

interface Stage {
  answer: string
  base: number
  length: number
  chances: number
  regexp: RegExp
  counter: number[]
  history: [string, number, number][]
}

function createAnswer(source: string, length: number) {
  let answer = ''
  const digits = source.split('')
  for (let i = 0; i < length; i++) {
    answer += digits.splice(Math.floor(Math.random() * digits.length), 1)
  }
  return answer
}

export function apply(ctx: Context, config: Config) {
  const stages: Dict<Stage> = Object.create(null)

  ctx.i18n.define('zh-CN', require('./locales/zh-CN'))

  ctx.command('guess-number [...number:string]')
    .alias('gn', 'csz')
    .shortcut('猜数字', { fuzzy: true })
    .option('base', '-b <base>', { fallback: config.base })
    .option('length', '-l <length>', { fallback: config.length })
    .option('chances', '-c <count>', { fallback: config.chances })
    .option('quit', '-q', { notUsage: true })
    .action(async ({ session, options }, ...numbers) => {
      const id = session.channelId

      if (!stages[id]) {
        if (numbers.length || options.quit) {
          return session.text('.idle')
        }

        if (!isInteger(options.base) || options.base < 2 || options.base > 36) {
          return session.text('.invalid-base')
        }

        if (!isInteger(options.length) || options.length < 1 || options.length > options.base) {
          return session.text('.invalid-length')
        }

        if (!isInteger(options.chances) || options.chances < 1) {
          return session.text('.invalid-chances')
        }

        const source = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, options.base)
        const answer = createAnswer(source, options.length)
        stages[id] = {
          answer,
          counter: Array(options.base).fill(0),
          history: [],
          base: options.base,
          length: options.length,
          chances: options.chances,
          regexp: new RegExp(`^[${source}]{${options.length}}$`),
        }
        return session.text('.start', stages[id])
      }

      const { answer, history, base, length, regexp, counter } = stages[id]
      if (options.quit) {
        delete stages[id]
        return session.text('.stop')
      }

      let hasInvalid = false
      const output: string[] = []
      for (let number of numbers) {
        number = number.toLowerCase()
        const digits = number.split('')
        if (history.some(h => h[0] === number)) continue
        if (!regexp.exec(number) || new Set(digits).size !== number.length) {
          hasInvalid = true
          continue
        }

        let a = 0, b = 0
        digits.forEach((digit, index) => {
          const n = parseInt(digit, base)
          counter[n] += 1
          if (digit === answer[index]) {
            a += 1
          } else if (answer.indexOf(digit) >= 0) {
            b += 1
          }
        })

        history.push([number, a, b])
        output.push(session.text('.result', [number, a, b]))

        if (a === length) {
          output.push(session.text('.win', [session.username]))
          ctx.emit(session, 'guess-number/win', stages[id], output)
          delete stages[id]
          break
        } else if (history.length >= stages[id].chances) {
          output.push(session.text('.lose', stages[id]))
          ctx.emit(session, 'guess-number/lose', stages[id], output)
          delete stages[id]
          break
        }
      }

      if (!output.length) {
        if (!numbers.length || hasInvalid) {
          output.push(session.text('.expect-input', stages[id]))
          if (!numbers.length) {
            if (!history.length) {
              output.push(session.text('.history-empty'))
            } else {
              output.push(...history.map((value, key) => session.text('.history-item', [...value, key + 1])))
            }
          }
        } else {
          output.push(session.text('.used-input'))
        }
      }

      return output.join('\n')
    })
}
