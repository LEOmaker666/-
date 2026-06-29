# Render 部署说明

## 项目已经准备好的配置

- 启动命令：`npm start`
- 服务入口：`server.js`
- Render 配置文件：`render.yaml`
- 运行端口：使用 Render 自动注入的 `PORT`
- DeepSeek Key：通过 Render 环境变量 `DEEPSEEK_API_KEY` 配置

## 本地测试

```bash
cd /Users/Zhuanz/Desktop/code/单词测试
DEEPSEEK_API_KEY="你的 DeepSeek Key" npm start
```

打开：

```text
http://localhost:8765/outputs/word-test-app.html
```

## 部署到 Render

1. 把这个项目上传到 GitHub。
2. 打开 Render，选择 New Web Service。
3. 连接这个 GitHub 仓库。
4. 如果 Render 识别到 `render.yaml`，按 Blueprint 创建即可。
5. 如果手动创建，使用这些配置：
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
6. 在 Environment 里添加：
   - `DEEPSEEK_API_KEY`: 你的 DeepSeek API Key
   - `DEEPSEEK_MODEL`: `deepseek-chat`
   - `DEEPSEEK_BASE_URL`: `https://api.deepseek.com`
7. 部署完成后，访问 Render 给你的网址。

## 注意

- 不要把 `DEEPSEEK_API_KEY` 写进前端 HTML，也不要提交到 GitHub。
- Render 免费版可能会休眠，第一次打开会慢一些。
- 如果 DeepSeek 出题失败，网站会自动切换到网站模型题，不会阻断使用。
