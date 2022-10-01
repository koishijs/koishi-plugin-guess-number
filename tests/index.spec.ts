import { Context } from 'koishi'
import mock from '@koishijs/plugin-mock'
import * as guess from '../src'
import * as jest from 'jest-mock'

describe('koishi-plugin-guess-number', () => {
  // answer: 0123
  const random = jest.spyOn(Math, 'random')
  before(() => random.mockReturnValue(0))
  after(() => random.mockRestore())

  let app: Context
  beforeEach(async () => {
    app = new Context()
    app.plugin(mock)
    app.plugin(guess, {
      base: 16,
    })
    await app.start()
  })
  afterEach(async () => {
    await app.stop()
  })

  it('check base', async () => {
    const client = app.mock.client('123')
    await client.shouldReply('gn -b 1', '进制应为 2 到 36 之间的整数。')
    await client.shouldReply('gn -b 50', '进制应为 2 到 36 之间的整数。')
    await client.shouldReply('gn -b 36', '4 位 36 进制猜数字游戏开始。')
  })

  it('check length', async () => {
    const client = app.mock.client('123')
    await client.shouldReply('gn -l 50', '长度应为不大于进制数的正整数。')
    await client.shouldReply('gn -l 16', '16 位 16 进制猜数字游戏开始。')
  })

  it('check chances', async () => {
    const client = app.mock.client('123')
    await client.shouldReply('gn -c 0', '猜测次数应为正整数。')
    await client.shouldReply('gn -c 1', '4 位 16 进制猜数字游戏开始。')
  })

  it('invalid guess', async () => {
    const client = app.mock.client('123')
    await client.shouldReply('gn', '4 位 16 进制猜数字游戏开始。')
    await client.shouldReply('gn 0101', '请输入由不同数字构成的 4 位 16 进制数。')
    await client.shouldReply('gn 012g', '请输入由不同数字构成的 4 位 16 进制数。')
    await client.shouldReply('gn 012', '请输入由不同数字构成的 4 位 16 进制数。')
    await client.shouldReply('gn 01233', '请输入由不同数字构成的 4 位 16 进制数。')
  })

  it('valid guess', async () => {
    const client = app.mock.client('123')
    await client.shouldReply('gn', '4 位 16 进制猜数字游戏开始。')
    await client.shouldReply('gn 4321 abcd', '数字 4321 的匹配结果为：1A2B。\n数字 abcd 的匹配结果为：0A0B。')
    await client.shouldReply('gn ABCD 1234', '数字 1234 的匹配结果为：0A3B。')
    await client.shouldReply('gn 1234 4321', '该数字已经使用过，换一个叭~')
  })

  it('show history', async () => {
    const client = app.mock.client('123')
    await client.shouldReply('gn', '4 位 16 进制猜数字游戏开始。')
    await client.shouldReply('gn', '请输入由不同数字构成的 4 位 16 进制数。\n本轮猜数字暂时没有历史记录。')
    await client.shouldReply('gn 4321 abcd', '数字 4321 的匹配结果为：1A2B。\n数字 abcd 的匹配结果为：0A0B。')
    await client.shouldReply('gn', [
      '请输入由不同数字构成的 4 位 16 进制数。',
      '第 1 次猜测内容：4321，匹配结果：1A2B',
      '第 2 次猜测内容：abcd，匹配结果：0A0B',
    ].join('\n'))
  })

  it('game quit', async () => {
    const client = app.mock.client('123')
    await client.shouldReply('gn -q', '没有正在进行的猜数字游戏。输入“猜数字”开始一轮游戏。')
    await client.shouldReply('gn', '4 位 16 进制猜数字游戏开始。')
    await client.shouldReply('gn -q', '游戏结束。')
  })

  it('game win', async () => {
    const client = app.mock.client('123')
    await client.shouldReply('gn', '4 位 16 进制猜数字游戏开始。')
    await client.shouldReply('gn 5678 5687 5768 5786 5867 5876', [
      '数字 5678 的匹配结果为：0A0B。',
      '数字 5687 的匹配结果为：0A0B。',
      '数字 5768 的匹配结果为：0A0B。',
      '数字 5786 的匹配结果为：0A0B。',
      '数字 5867 的匹配结果为：0A0B。',
      '数字 5876 的匹配结果为：0A0B。',
    ].join('\n'))
    await client.shouldReply('gn 6578 6587 6758 0123 6785 6857', [
      '数字 6578 的匹配结果为：0A0B。',
      '数字 6587 的匹配结果为：0A0B。',
      '数字 6758 的匹配结果为：0A0B。',
      '数字 0123 的匹配结果为：4A0B。',
      '恭喜 123 回答正确！',
    ].join('\n'))
  })

  it('game lose', async () => {
    const client = app.mock.client('123')
    await client.shouldReply('gn', '4 位 16 进制猜数字游戏开始。')
    await client.shouldReply('gn 5678 5687 5768 5786 5867 5876 6578 6587 6758 6785 6857 6875', [
      '数字 5678 的匹配结果为：0A0B。',
      '数字 5687 的匹配结果为：0A0B。',
      '数字 5768 的匹配结果为：0A0B。',
      '数字 5786 的匹配结果为：0A0B。',
      '数字 5867 的匹配结果为：0A0B。',
      '数字 5876 的匹配结果为：0A0B。',
      '数字 6578 的匹配结果为：0A0B。',
      '数字 6587 的匹配结果为：0A0B。',
      '数字 6758 的匹配结果为：0A0B。',
      '数字 6785 的匹配结果为：0A0B。',
      '游戏失败！正确答案为：0123。',
    ].join('\n'))
  })
})
