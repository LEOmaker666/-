const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataDir = path.join(root, "data");
const dataFile = path.join(dataDir, "word-test-data.json");
const port = Number(process.env.PORT || 8765);
const deepSeekApiKey = process.env.DEEPSEEK_API_KEY || "";
const deepSeekModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const deepSeekBaseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const host = process.env.HOST || "0.0.0.0";

const blankData = {
  words: [],
  article: "",
  mistakes: [],
  memory: [],
  sessions: [],
  stats: { answered: 0, correct: 0 },
  updatedAt: 0
};

function ensureDataFile() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(blankData, null, 2));
  }
}

function readData() {
  ensureDataFile();
  try {
    return { ...blankData, ...JSON.parse(fs.readFileSync(dataFile, "utf8")) };
  } catch {
    return blankData;
  }
}

function writeData(data) {
  ensureDataFile();
  const normalized = {
    ...blankData,
    ...data,
    memory: data.memory || [],
    mistakes: data.mistakes || [],
    sessions: data.sessions || [],
    stats: data.stats || blankData.stats,
    updatedAt: Number(data.updatedAt || Date.now())
  };
  fs.writeFileSync(dataFile, JSON.stringify(normalized, null, 2));
  return normalized;
}

function safeString(value, limit = 400) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function hasCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value || ""));
}

function questionLanguageValid(question, difficulty) {
  if (difficulty !== "high") return true;
  const visibleText = [
    question.question,
    question.answer,
    ...(Array.isArray(question.options) ? question.options : []),
    ...(Array.isArray(question.steps) ? question.steps : [])
  ].join(" ");
  return !hasCjk(visibleText);
}

function normalizeAiQuestions(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    const question = safeString(item.question, 180);
    const cause = safeString(item.cause, 220);
    const effect = safeString(item.effect, 220);
    const answer = safeString(item.answer || (question.toLowerCase().includes("why") ? cause : effect), 220);
    const wrongOptions = Array.isArray(item.wrongOptions)
      ? item.wrongOptions.map(option => safeString(option, 220)).filter(Boolean)
      : [];
    const context = safeString(item.context || item.sourceSentence, 300);
    if (!question || !cause || !effect || !answer || wrongOptions.length < 2) return null;
    return {
      question,
      cause,
      effect,
      answer,
      wrongOptions: wrongOptions.filter(option => option !== answer).slice(0, 3),
      context,
      signal: safeString(item.signal, 40) || "AI"
    };
  }).filter(Boolean).slice(0, 8);
}

function normalizeAiMixedQuestions(items, difficulty = "low") {
  if (!Array.isArray(items)) return [];
  const useEnglishTrueFalse = ["medium", "high"].includes(difficulty);
  return items.map(item => {
    const kind = safeString(item.kind || item.mode || "choice", 40);
    const type = safeString(item.type || "AI 综合题", 60);
    const question = safeString(item.question, 220);
    const answer = safeString(item.answer, 240);
    const explanation = safeString(item.explanation, 500);
    const context = safeString(item.context || item.sourceText, 360);
    const options = Array.isArray(item.options)
      ? item.options.map(option => safeString(option, 240)).filter(Boolean)
      : [];
    const steps = Array.isArray(item.steps)
      ? item.steps.map(step => safeString(step, 180)).filter(Boolean)
      : [];

    if (!question) return null;
    if (kind === "order") {
      if (steps.length < 2) return null;
      return {
        kind: "order",
        type,
        question,
        context,
        steps,
        explanation: explanation || `正确顺序是：${steps.join(" -> ")}`
      };
    }

    const normalizedAnswer = kind === "trueFalse" ? normalizeTrueFalse(answer, useEnglishTrueFalse) : answer;
    const normalizedOptions = kind === "trueFalse" ? (useEnglishTrueFalse ? ["True", "False"] : ["正确", "错误"]) : options;
    if (!normalizedAnswer || normalizedOptions.length < 2) return null;
    const uniqueOptions = [...new Set([normalizedAnswer, ...normalizedOptions])].filter(Boolean).slice(0, 4);
    if (uniqueOptions.length < 2) return null;
    return {
      kind: kind === "trueFalse" ? "trueFalse" : "choice",
      type,
      question,
      context,
      answer: normalizedAnswer,
      options: uniqueOptions,
      explanation
    };
  }).filter(Boolean).filter(question => questionLanguageValid(question, difficulty)).slice(0, 10);
}

function normalizeTrueFalse(value, english = false) {
  const clean = safeString(value, 20).toLowerCase();
  if (["true", "t", "yes", "正确", "对"].includes(clean)) return english ? "True" : "正确";
  if (["false", "f", "no", "错误", "错"].includes(clean)) return english ? "False" : "错误";
  return safeString(value, 20);
}

async function callDeepSeekJson(prompt) {
  if (!deepSeekApiKey) {
    const error = new Error("DEEPSEEK_API_KEY is not configured");
    error.statusCode = 400;
    throw error;
  }

  const response = await fetch(`${deepSeekBaseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${deepSeekApiKey}`
    },
    body: JSON.stringify({
      model: deepSeekModel,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an English learning question generator. Return only valid JSON matching the requested shape."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || `DeepSeek request failed: ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const text = payload.choices?.[0]?.message?.content?.trim() || "";
  return JSON.parse(text || "{}");
}

async function generateCauseEffectWithAi(article, words = []) {
  const prompt = [
    "You generate English reading comprehension multiple-choice questions for students.",
    "Task: find cause-and-effect relationships in the article and return ONLY valid JSON.",
    "All visible question content must be in Simplified Chinese, including question, answer, wrongOptions, and explanation.",
    "Keep original English excerpts only in the context field when useful.",
    "Each item must ask either why an effect happened, or what happened after/because of a cause.",
    "Use facts from the article only. Keep answers short. Wrong options must be plausible but not correct.",
    "Return this JSON shape: {\"questions\":[{\"question\":\"...\",\"cause\":\"...\",\"effect\":\"...\",\"answer\":\"...\",\"wrongOptions\":[\"...\",\"...\",\"...\"],\"context\":\"original sentence or short excerpt\",\"signal\":\"because/so/after/etc\"}]}",
    `Vocabulary hints: ${words.map(word => `${word.en}: ${word.zh}`).join("; ") || "none"}`,
    `Article:\n${article}`
  ].join("\n\n");

  const parsed = await callDeepSeekJson(prompt);
  return normalizeAiQuestions(parsed.questions);
}

async function generateMixedQuestionsWithAi({ article = "", words = [], count = 10, difficulty = "low" }) {
  const questionCount = Math.max(1, Math.min(30, Number(count) || 10));
  const difficultyKey = ["low", "medium", "high"].includes(difficulty) ? difficulty : "low";
  const difficultyLabel = { low: "低", medium: "中", high: "高" }[difficultyKey];
  const difficultyGuide = {
    low: "低难度：80% 的题必须能从原文同一句直接找到答案；题干要短；选项差异明显；允许 context 给关键英文原句。避免推断题。题目、答案、选项、排序步骤、判断题选项全部使用简体中文。",
    medium: "中难度：题目必须要求理解转述、因果、前后细节或同义表达；干扰项要和原文主题接近；context 只给短线索，不要直接暴露答案。题目和解析使用简体中文；答案、选项、排序步骤必须使用英文。",
    high: "高难度：题目必须要求推断、概括、跨句整合、人物/事件动机判断或顺序重建；干扰项要高度相似但只有一个正确。不要给学生任何英文原文提示，context 必须为空字符串。题目、答案、选项、排序步骤必须全部使用英文；解析可以使用简体中文。"
  }[difficultyKey];
  const languageGuide = {
    low: "Language rule: question, answer, options, trueFalse labels, and order steps must all be Simplified Chinese. trueFalse options are [\"正确\", \"错误\"].",
    medium: "Language rule: question and type must be Simplified Chinese. answer, options, trueFalse labels, and order steps must be English. trueFalse options are [\"True\", \"False\"].",
    high: "Language rule: question, answer, options, trueFalse labels, and order steps must all be English. trueFalse options are [\"True\", \"False\"]. context must be an empty string."
  }[difficultyKey];
  const sourceText = article ? `Article:\n${safeString(article, 12000)}` : "";

  if (!sourceText.trim()) {
    const error = new Error("No article text provided");
    error.statusCode = 400;
    throw error;
  }

  const buildPrompt = (strictRetry = false) => [
    "You generate classroom-friendly English learning questions from article text.",
    "Return ONLY valid JSON. Use the source content only. Do not invent facts.",
    strictRetry ? "STRICT RETRY: The previous output violated the language rule. For high difficulty, do not include any Chinese characters in question, answer, options, or steps." : "",
    "Follow the requested language rule exactly. The language rule overrides all other wording instructions.",
    languageGuide,
    "Keep original English excerpts only in the context field when useful.",
    `Generate exactly ${questionCount} questions.`,
    `Difficulty: ${difficultyLabel}. ${difficultyGuide}`,
    "Difficulty separation is mandatory. Do not generate the same style for different difficulty levels.",
    "Low questions should test recognition. Medium questions should test understanding. High questions should test inference or synthesis.",
    "Create a useful mix of question types when possible:",
    "- choice: normal multiple-choice comprehension question",
    "- trueFalse: statement judgment with options True and False",
    "- order: interactive ordering question for steps, events, or process flow",
    "For trueFalse questions, answer and options must follow the language rule exactly.",
    "For order questions, put the correct order in the steps array. For choice questions, include answer and 3 wrong options.",
    "For high difficulty, every question context must be an empty string.",
    "Return this JSON shape: {\"questions\":[{\"kind\":\"choice|trueFalse|order\",\"type\":\"short Chinese type label\",\"question\":\"...\",\"context\":\"short source excerpt\",\"answer\":\"...\",\"options\":[\"...\"],\"steps\":[\"...\"],\"explanation\":\"...\"}]}",
    `Vocabulary hints: ${words.map(word => `${word.en}: ${word.zh}`).join("; ") || "none"}`,
    sourceText
  ].filter(Boolean).join("\n\n");

  const parsed = await callDeepSeekJson(buildPrompt(false));
  let questions = normalizeAiMixedQuestions(parsed.questions, difficultyKey);
  if (difficultyKey === "high" && questions.length < questionCount) {
    const retryParsed = await callDeepSeekJson(buildPrompt(true));
    questions = normalizeAiMixedQuestions(retryParsed.questions, difficultyKey);
  }
  if (difficultyKey === "high" && questions.length < 1) {
    const error = new Error("DeepSeek returned Chinese text for high difficulty. Please generate again.");
    error.statusCode = 502;
    throw error;
  }
  return questions;
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 5_000_000) {
        req.destroy();
        reject(new Error("request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp"
  }[ext] || "application/octet-stream";
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname.startsWith("/assets/") ? `/outputs${url.pathname}` : url.pathname;
  const pathname = decodeURIComponent(requestedPath === "/" ? "/outputs/word-test-app.html" : requestedPath);
  const filePath = path.normalize(path.join(root, pathname));
  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    send(res, 200, data, contentType(filePath));
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/api/data" && req.method === "GET") {
      send(res, 200, JSON.stringify(readData()));
      return;
    }

    if (req.url === "/api/data" && req.method === "POST") {
      const body = await parseBody(req);
      const saved = writeData(JSON.parse(body || "{}"));
      send(res, 200, JSON.stringify({ ok: true, data: saved }));
      return;
    }

    if (req.url === "/api/cause-effect" && req.method === "POST") {
      const body = await parseBody(req);
      const input = JSON.parse(body || "{}");
      const questions = await generateCauseEffectWithAi(safeString(input.article, 12000), input.words || []);
      send(res, 200, JSON.stringify({ ok: true, provider: "deepseek", questions }));
      return;
    }

    if (req.url === "/api/ai-questions" && req.method === "POST") {
      const body = await parseBody(req);
      const input = JSON.parse(body || "{}");
      const questions = await generateMixedQuestionsWithAi({
        article: input.article || "",
        words: input.words || [],
        count: input.count || 10,
        difficulty: input.difficulty || "low"
      });
      send(res, 200, JSON.stringify({ ok: true, provider: "deepseek", questions }));
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    send(res, error.statusCode || 500, JSON.stringify({ ok: false, error: error.message }));
  }
});

server.listen(port, host, () => {
  console.log(`Word test app: http://localhost:${port}/outputs/word-test-app.html`);
});
