# koishi-plugin-guess-number

[![Codecov](https://img.shields.io/codecov/c/guess-number/koishijs/koishi-plugin-guess-number?style=flat-square)](https://codecov.io/gh/koishijs/koishi-plugin-guess-number)
[![npm](https://img.shields.io/npm/v/koishi-plugin-guess-number?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-guess-number)

猜数字游戏。

## 基本玩法

系统将随机生成一个 4 位 10 进制数，各位数字可以是 0 且互不相同，玩家的目标是猜出这个数字。

每一轮中玩家输入要猜测的数字，并得到一个形如 xAyB 的匹配结果：

- x 为本次猜测的四位数字中，答案包含的且所处位置正确的数字个数；
- y 为本次猜测的四位数字中，答案包含的但所处位置不正确的数字个数。

例如：生成的数字为 0637，猜测 2730，则返回 1A2B。这是因为 3 在答案中包含且位置正确，7 和 0 在答案中包含但位置不正确。

## 配置项

### base

- 类型: `number`
- 默认值: `10`

标准开局下的进制数。

### length

- 类型: `number`
- 默认值: `4`

标准开局下的答案长度。

### chances

- 类型: `number`
- 默认值: `10`

标准开局下的最大猜测次数。

