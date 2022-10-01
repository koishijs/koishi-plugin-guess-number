import { Context, Dict, isInteger, Schema } from 'koishi'
import {} from '@koishijs/plugin-rate-limit'

export const name = 'guess-number'

export interface Config {
  base?: number
  length?: number
  chances?: number
}

export const Config: Schema<Config> = Schema.object({
  base: Schema.number().default(10).description('标准开局下的进制数。'),
  length: Schema.number().default(4).description('标准开局下的答案长度。'),
  chances: Schema.number().default(10).description('标准开局下的最大猜测次数。'),
})

interface State {
  answer: string
  base: number
  length: number
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
  const states: Dict<State> = Object.create(null)

  ctx.i18n.define('zh', require('./locales/zh'))

  ctx.command('guess-number [...number:string]')
    .alias('gn', 'csz')
    .shortcut('猜数字', { fuzzy: true })
    .option('base', '-b <base>', { fallback: config.base })
    .option('length', '-l <length>', { fallback: config.length })
    .option('quit', '-q', { notUsage: true })
    .action(async ({ session, options }, ...numbers) => {
      const id = session.channelId

      if (!states[id]) {
        if (numbers.length || options.quit) {
          return session.text('.idle')
        }

        if (!isInteger(options.base) || options.base < 2 || options.base > 36) {
          return session.text('.invalid-base')
        }

        if (!isInteger(options.length) || options.length < 1 || options.length > options.base) {
          return session.text('.invalid-length')
        }

        const source = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, options.base)
        const answer = createAnswer(source, options.length)
        states[id] = {
          answer,
          counter: Array(options.base).fill(0),
          history: [],
          base: options.base,
          length: options.length,
          regexp: new RegExp(`^[${source}]{${options.length}}$`),
        }
        return session.text('.start', states[id])
      }

      const { answer, history, base, length, regexp, counter } = states[id]
      if (options.quit) {
        delete states[id]
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
          delete states[id]
          output.push(session.text('.win', [session.username]))
          break
        } else if (history.length >= config.chances) {
          output.push(session.text('.lose', states[id]))
          delete states[id]
          break
        }
      }

      if (!output.length) {
        if (!numbers.length || hasInvalid) {
          output.push(session.text('.expect-input', states[id]))
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
