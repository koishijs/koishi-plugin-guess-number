import { Context, Dict, isInteger, Schema } from 'koishi'
import {} from '@koishijs/plugin-rate-limit'

export const name = 'guess-number'

export interface Config {
  chances?: number
}

export const Config: Schema<Config> = Schema.object({
  base: Schema.number().default(10).description('默认开局的进制数。'),
  length: Schema.number().default(10).description('默认开局的答案长度。'),
  chances: Schema.number().default(10).description('允许猜测的最大次数。'),
})

interface State {
  answer: string
  base: number
  length: number
  regexp: RegExp
  counter: number[]
  history: [string, number, number][]
}

export function apply(ctx: Context, config: Config) {
  const states: Dict<State> = Object.create(null)

  ctx.command('guess-number [...number:string] 猜数字游戏')
    .alias('gn', 'csz')
    .shortcut('猜数字', { fuzzy: true })
    .option('base', '-b <base>  设置进制数', { fallback: 10 })
    .option('length', '-l <length>  设置答案长度', { fallback: 4 })
    .option('quit', '-q  结束游戏', { notUsage: true })
    .usage([
      '输入要猜测的数字，将得到一个形如 xAyB 的匹配结果：',
      'x 为本次猜测的四位数字中，答案包含的且所处位置正确的数字个数；',
      'y 为本次猜测的四位数字中，答案包含的但所处位置不正确的数字个数。',
      '例如：生成的数字为 0637，猜测 2730，则返回 1A2B。',
      '这是因为 3 在答案中包含且位置正确，7 和 0 在答案中包含但位置不正确。',
    ].join('\n'))
    .action(async ({ session, options }, ...numbers) => {
      const id = session.channelId

      if (!states[id]) {
        if (numbers.length || options.quit) {
          return '没有正在进行的猜数字游戏。输入“猜数字”开始一轮游戏。'
        }

        if (!isInteger(options.base) || options.base < 2 || options.base > 36) {
          return '进制应为 2 到 36 之间的整数。'
        }

        if (!isInteger(options.length) || options.length < 1 || options.length > options.base) {
          return '长度应为不大于进制数的正整数。'
        }

        let answer = ''
        const source = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, options.base)
        const digits = source.split('')
        for (let i = 0; i < options.length; i++) {
          answer += digits.splice(Math.floor(Math.random() * digits.length), 1)
        }
        states[id] = {
          answer,
          counter: Array(options.base).fill(0),
          history: [],
          base: options.base,
          length: options.length,
          regexp: new RegExp(`^[${source}]{${options.length}}$`),
        }
        return `${options.length} 位 ${options.base} 进制猜数字游戏开始。`
      }

      const { answer, history, base, length, regexp, counter } = states[id]
      if (options.quit) {
        delete states[id]
        return '游戏已停止。'
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
        output.push(`数字 ${number} 的匹配结果为：${a}A${b}B。`)

        if (a === length) {
          delete states[id]
          output.push(`恭喜 ${session.username} 回答正确！`)
          break
        } else if (length <= 4 && base <= 10 && history.length >= config.chances) {
          output.push(`由于 ${config.chances} 局之内没有猜对，猜数字游戏自动终止。正确答案为：${states[id].answer}。`)
          delete states[id]
          break
        }
      }

      if (!output.length) {
        if (!numbers.length || hasInvalid) {
          output.push(`请输入由不同数字构成的 ${length} 位 ${base} 进制数。`)
          if (!numbers.length) {
            if (!history.length) {
              output.push('本轮猜数字暂时没有历史记录。')
            } else {
              output.push(...history.map(([number, a, b], index) => `第 ${index + 1} 次猜测内容：${number}，匹配结果：${a}A${b}B`))
            }
          }
        } else {
          output.push('该数字已经使用过，换一个叭~')
        }
      }

      return output.join('\n')
    })
}
