# 本地安装给别人使用

## 适用场景

- 对方是你信任的人。
- 对方可以在自己的电脑上运行本地服务。
- DeepSeek API Key 可以放在对方电脑的 `.env.local` 文件里。

## 对方电脑需要先安装

- Node.js: https://nodejs.org/

安装完成后，在终端里能运行：

```bash
node -v
npm -v
```

## 你需要发给对方

把整个项目文件夹发给对方，例如：

```text
单词测试
```

文件夹里要包含：

```text
server.js
package.json
outputs/
data/
启动单词测试.command
停止单词测试.command
```

## 第一次启动

1. 对方双击 `启动单词测试.command`。
2. 如果还没有 `.env.local`，脚本会自动创建并用 TextEdit 打开。
3. 把 `DEEPSEEK_API_KEY=""` 改成：

```text
DEEPSEEK_API_KEY="你的 DeepSeek Key"
```

4. 保存 `.env.local`。
5. 再次双击 `启动单词测试.command`。
6. 浏览器会自动打开：

```text
http://localhost:8765
```

## 日常使用

- 打开：双击 `启动单词测试.command`
- 关闭：双击 `停止单词测试.command`

## 注意

- `.env.local` 只保存在对方电脑本地，不要上传到 GitHub。
- 如果不填 DeepSeek Key，网站仍然能打开；AI 出题失败时会自动使用网站模型题。
- 如果双击脚本提示没有权限，可以右键打开，或在终端执行：

```bash
chmod +x 启动单词测试.command 停止单词测试.command
```
