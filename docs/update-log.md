# 单词测试项目更新记录

## 2026-06-29

### 当前约定

- 之后每次聊天涉及项目更新时，都要在这个 Markdown 文件里追加记录。
- 记录内容包括：用户需求、实际改动、验证结果、后续注意事项。

### 本轮记录

- 用户要求以后每次聊天都写 `.md` 文件，记录每次更新了什么以及聊天中的关键决策。
- 已创建本文件作为项目内长期更新记录。
- 已准备把这个偏好写入 Codex 记忆，后续相关项目工作时应继续遵守。

## 2026-06-29 16:48 CST

### 用户需求

- 低 / 中 / 高难度的 AI 文章题区别不明显，需要拉开差异。
- 低 / 中 / 高难度也要影响单词题。
- 数据记录要记录错题。
- 已保存单词下次进入不应消失。
- 把抗遗忘放到首页的数据统计里：做错的题有记录，并能在抗遗忘中练习。

### 实际改动

- 修复本地数据与服务器数据合并逻辑，避免空服务器数据覆盖浏览器里已保存的单词和文章。
- 数据保存增加 `updatedAt`，服务器写入也保留更新时间，减少后续同步冲突。
- 单词测验加入难度差异：
  - 低难度偏基础词义识别。
  - 中难度保持英文选中文、中文选英文、配对综合练习。
  - 高难度偏中文到英文回忆和更多配对，减少直接英文提示，干扰项更接近。
- DeepSeek 文章题提示词强化难度差异：
  - 低难度以原文显性信息为主。
  - 中难度要求转述、因果、细节关系。
  - 高难度要求推断、概括、跨句整合或排序，并且不提供英文原文提示。
- 错题记录改为保存完整可回放题目数据，支持选择题、判断题、排序题和配对题。
- 抗遗忘训练从“只复习错词”扩展为“错词 + 错题”复习。
- 数据统计页增加错题记录数、抗遗忘待练数，并增加“练习错题抗遗忘”入口。
- 首页数据统计卡片会显示错题待练数量。
- 清空错题时同步移除错题类抗遗忘项目，避免错题本和复习池状态不一致。

### 验证结果

- `node --check server.js` 通过。
- HTML 内联脚本语法检查通过。
- 已跑本地逻辑烟测：高难度单词题可生成，错题可记录，错题可进入抗遗忘池，本地/服务器合并不会丢失本地单词和文章。

### 后续注意

- 旧错题如果缺少完整题型数据，只能继续在错题本查看；新产生的错题可以进入抗遗忘练习。
- 如果 DeepSeek 生成的题仍然难度不明显，下一步可以把低 / 中 / 高拆成不同 prompt 模板，并为每个难度增加更严格的题型比例。

## 2026-06-29 17:06 CST

### 用户需求

- 文章难度语言规则调整：
  - 低难度：题目和选项全部中文。
  - 中难度：题目中文，选项英文。
  - 高难度：题目和选项全部英文。
- 在测试设置页的文章测验下增加一句：测验由 DeepSeek v4 模型生成。
- 首页中间加入 CarLab logo。
- logo 下方小字改为：单词学习测试软件，生成多种题型。
- 首页“本地存储 安全可靠”改为：已接入 DeepSeek v4 大模型。

### 实际改动

- 将 `/Users/Zhuanz/Desktop/图片/carlab_logo_transparent.webp` 复制到 `outputs/assets/carlab_logo_transparent.webp`。
- 首页主视觉改为居中的 CarLab logo，并更新副标题文案。
- 首页底部状态文案改为“已接入 DeepSeek v4 大模型”。
- 文章测验卡片新增模型说明“测验由 DeepSeek v4 模型生成。”。
- DeepSeek 文章出题 prompt 增加严格语言规则：
  - 低难度题目、答案、选项、排序步骤、判断题选项全部中文。
  - 中难度题目中文，答案、选项、排序步骤、判断题选项英文。
  - 高难度题目、答案、选项、排序步骤、判断题选项全部英文，并继续不提供英文原文提示。
- 前端和后端都增加判断题兜底：低难度显示“正确 / 错误”，中高难度显示“True / False”。

### 验证结果

- `node --check server.js` 通过。
- HTML 内联脚本语法检查通过。
- 已确认新 logo 资源存在于项目 assets 目录。

## 2026-06-29 17:10 CST

### 用户反馈

- 高难度文章题仍然出现中文题目和中文选项。

### 实际改动

- 后端增加高难度语言硬校验：高难度文章题的题目、答案、选项、排序步骤只要包含中文字符，就会被过滤。
- DeepSeek 第一次返回不合格高难度题时，后端会自动用更严格的英文-only 提示重试一次。
- 如果重试后仍没有合格英文题，接口会报错，不再把中文高难度题发给前端。
- 前端也增加一层兜底过滤：高难度文章题如果仍包含中文，会被拦截并提示重新生成。
- 已重启本地服务，让新后端逻辑生效。

### 验证结果

- `node --check server.js` 通过。
- HTML 内联脚本语法检查通过。
- 已用本地脚本验证：高难度语言过滤会移除中文题，只保留英文题。

## 2026-06-29 17:21 CST

### 用户需求

- 如果 AI 出题失败，不要弹错阻断，直接转成网站里的模型题。
- 典型失败场景包括：`DEEPSEEK_API_KEY is not configured`、接口不可用、模型返回不合格内容。

### 实际改动

- 文章测验生成流程改为：先请求 DeepSeek，失败或返回空结果时，自动切换到网站本地模型题。
- 移除了文章 AI 失败时的弹窗阻断，用户不会再看到 `AI 出题失败：DEEPSEEK_API_KEY is not configured` 这类错误弹窗。
- 网站模型题会在题型和 meta 中标记“网站模型题 · AI 失败自动切换”，方便识别来源。
- 降级题源使用本地阅读理解题和原因结果题。
- 高难度降级时，题面和选项会转成英文；如果某个中文选项无法准确转换，会用英文通用干扰项兜底。
- 已重启本地服务，让新前端逻辑生效。

### 验证结果

- `node --check server.js` 通过。
- HTML 内联脚本语法检查通过。
- 已用脚本模拟没有 DeepSeek API Key 的情况：文章测验会生成网站模型题，不会弹出 AI 错误。
- 已确认浏览器加载的页面包含 `buildLocalArticleQuiz`、`网站模型题` 和 `makeEnglishOnlyOptions` 新逻辑。

## 2026-06-29 18:50 CST

### 用户需求

- 准备把当前网站用 Render 部署上线。

### 实际改动

- `server.js` 监听地址改为 `0.0.0.0`，并继续使用 Render 注入的 `PORT`。
- 新增 `render.yaml`，用于 Render Web Service 部署：
  - Runtime: Node
  - Build Command: `npm install`
  - Start Command: `npm start`
  - 环境变量包含 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、`DEEPSEEK_BASE_URL`
- 新增 `.gitignore`，避免提交 `.env`、`node_modules`、日志等文件。
- 新增 `docs/render-deploy.md`，记录 Render 部署步骤和环境变量配置方式。

### 验证结果

- `node --check server.js` 通过。
- `render.yaml` 关键字段检查通过。

### 后续注意

- 当前目录还不是 Git 仓库，需要先上传到 GitHub，再连接 Render。
- `DEEPSEEK_API_KEY` 只能放 Render 环境变量，不要写进前端 HTML，也不要提交到 GitHub。

## 2026-06-29 18:56 CST

### 用户状态

- 用户已在 GitHub 创建空仓库，地址为 `https://github.com/LEOmaker666/-.git`。

### 实际操作

- 检查项目代码，未发现 DeepSeek API Key 被写入代码文件。
- 初始化本地 Git 仓库。
- 创建首次提交：`Initial word test app`。
- 设置主分支为 `main`。
- 添加远程仓库：`https://github.com/LEOmaker666/-.git`。
- 已成功推送本地项目到 GitHub。

### 后续步骤

- 到 Render 创建 Web Service。
- 连接 GitHub 仓库 `LEOmaker666/-`。
- 在 Render Environment Variables 中填写 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`、`DEEPSEEK_BASE_URL`。

## 2026-06-29 19:01 CST

### 用户问题

- 询问是否可以把当前单页 HTML 应用改成 Next.js + React 前端架构，并使用 Tailwind 写 UI。
- 用户询问迁移难度是否大。

### 当前结论

- 可以迁移，但不是“小改”，属于前端架构重构。
- 当前版本是一个单 HTML + 原生 JS + Node 接口的应用；迁移后会拆成 Next.js 页面、React 组件、状态管理、API Routes 或独立服务、Tailwind 样式。
- 建议不要在 Render 上线前临时大改；更稳妥的方式是先把当前版本部署成功，再开新分支迁移。

## 2026-06-29 19:03 CST

### 用户状态

- 用户在 Render 创建 Web Service 时，看不到刚推送的 GitHub 仓库 `LEOmaker666/-`。

### 判断

- Render 当前连接的 GitHub Credentials 显示的是其他账号/组织的仓库，不是 `LEOmaker666`。
- 因为仓库是 public，也可以不重新授权 GitHub，直接用 Render 的 `Public Git Repository` 方式部署。

### 建议操作

- 在 Render 的 Source Code 区域切换到 `Public Git Repository`。
- 粘贴仓库地址：`https://github.com/LEOmaker666/-.git`
- 继续配置 Web Service 和环境变量。

## 2026-06-29 21:43 CST

### 用户反馈

- Render 部署后页面白屏，没有显示内容。

### 排查结果

- 本地访问根路径 `/` 可以返回 HTML。
- 发现首页图片资源使用相对路径 `assets/...`。
- 当页面从根路径 `/` 打开时，浏览器会请求 `/assets/...`，但真实资源在 `/outputs/assets/...`，导致资源 404。

### 实际改动

- 首页顶部 logo 路径改为 `/outputs/assets/logo-carlab-cropped.png`。
- 首页主 logo 路径改为 `/outputs/assets/carlab_logo_transparent.webp`。
- `server.js` 增加兼容映射：访问 `/assets/...` 时自动映射到 `/outputs/assets/...`。

### 验证结果

- `node --check server.js` 通过。
- HTML 内联脚本语法检查通过。
- 已确认 HTML 中主 logo 使用绝对资源路径。

## 2026-06-29 23:27 CST

### 用户问题

- 用户询问如果把网站安装到别人电脑上，需要哪些步骤，以及别人如何方便打开。
- 用户说明信任对方，可以不考虑 API Key 暴露风险。

### 当前结论

- 最简单可行方式是给对方一个本地项目文件夹，加一个一键启动脚本。
- 对方电脑需要安装 Node.js。
- API Key 可以写入本地 `.env` 或启动脚本中。
- 更方便的方式是后续打包 Electron/Tauri 桌面 App，或者制作 macOS/Windows 启动脚本和桌面快捷方式。

## 2026-06-30 11:17 CST

### 用户选择

- 用户选择“方式二”：项目文件夹 + 桌面双击启动脚本。

### 实际改动

- 新增 `启动单词测试.command`：
  - 双击后自动进入项目目录。
  - 自动创建 `.env.local` 模板。
  - 读取 DeepSeek 环境变量。
  - 如未安装依赖则执行 `npm install`。
  - 启动本地服务并自动打开 `http://localhost:8765`。
- 新增 `停止单词测试.command`：
  - 双击后停止本地 `8765` 端口上的单词测试服务。
- 新增 `docs/local-install.md`：
  - 记录发给别人使用时的文件、启动步骤、填写 API Key 的方式和注意事项。

### 验证结果

- 已给两个 `.command` 文件添加可执行权限。
- `bash -n 启动单词测试.command` 通过。
- `bash -n 停止单词测试.command` 通过。
