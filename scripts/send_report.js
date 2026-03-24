#!/usr/bin/env node
/**
 * send_report.js - AI 前沿科技日报邮件发送脚本
 * 
 * 配置方式：
 *   1. 复制 ../.env.example 为 ../.env，填入你的邮箱凭据
 *   2. 或修改 ../email-config.yaml
 * 
 * 使用方式:
 *   node send_report.js --date 2026-03-23 --to user@example.com
 *   node send_report.js --date 2026-03-23 --to user@example.com --author "自定义署名"
 * 
 * 或直接运行（使用配置文件中的默认值）:
 *   node send_report.js
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ============ 从 .env 文件加载配置 ============
function loadEnvConfig() {
  const envPath = path.join(__dirname, '..', '.env');
  const config = {};
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, value] = trimmed.split('=');
        if (key && value) {
          config[key.trim()] = value.trim();
        }
      }
    });
  }
  
  return config;
}

// ============ 配置区 ============
const envConfig = loadEnvConfig();

const CONFIG = {
  // SMTP 服务器配置（从 .env 读取，或使用默认值）
  SMTP_HOST: envConfig.SMTP_HOST || 'smtp.example.com',
  SMTP_PORT: parseInt(envConfig.SMTP_PORT || '465'),
  SMTP_SECURE: envConfig.SMTP_SECURE !== 'false',
  SMTP_USER: envConfig.SMTP_USER || 'your@email.com',
  SMTP_PASS: envConfig.SMTP_PASS || 'your_smtp_auth_code',

  // 发件人
  FROM_NAME: envConfig.FROM_NAME || '克洛 AI 助理',

  // 默认收件人（命令行 --to 可覆盖）
  DEFAULT_TO: envConfig.DEFAULT_TO || 'your@email.com',

  // 报告整理者署名（邮件正文底部）
  AUTHOR_NAME: envConfig.AUTHOR_NAME || '克洛 AI 助理',

  // Skill 根目录（send_report.js 所在目录的上级）
  SKILL_ROOT: path.join(__dirname, '..')
};

// ============ 命令行解析 ============
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && args[i + 1]) opts.date = args[++i];
    if (args[i] === '--to' && args[i + 1]) opts.to = args[++i];
    if (args[i] === '--author' && args[i + 1]) opts.author = args[++i];
  }
  return opts;
}

// ============ TOP 10 生成 ============
function generateTop10(sourceContent, dateLabel) {
  // 此处由 AI 阅读 source 文件后填入
  // 占位，实际运行时由 AI 替换
  return `迭戈你好，

以下是今日（${dateLabel}）AI前沿科技10条最重要新闻简报，完整报告见附件。

1. [AI 助手请在此填入第一条]
2. [AI 助手请在此填入第二条]
...

---
完整报告共5大板块，请查收附件。本报告由 ${CONFIG.AUTHOR_NAME} 整理生成。`;
}

// ============ 发送邮件 ============
async function sendReport(opts) {
  const date = opts.date || new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const toEmail = opts.to || CONFIG.DEFAULT_TO;
  const authorName = opts.author || CONFIG.AUTHOR_NAME;

  // 读取 source 文件供 AI 参考
  const sourcePath = path.join(CONFIG.SKILL_ROOT, 'digests', 'sources', `source_${date}.md`);
  const reportPath = path.join(CONFIG.SKILL_ROOT, 'digests', 'reports', `report_${date}.md`);

  let top10 = '';
  let sourceContent = '';

  if (fs.existsSync(sourcePath)) {
    sourceContent = fs.readFileSync(sourcePath, 'utf-8');
  }

  if (fs.existsSync(reportPath)) {
    top10 = `[完整报告见附件：report_${date}.md]`;
  } else if (sourceContent) {
    // 如果没有完整报告，AI 阅读 source 后生成简报
    // 提示：实际运行时由 AI 会话完成此处
    top10 = `[请 AI 阅读 source_${date}.md 后填入 TOP 10]`;
  } else {
    console.error(`未找到 source 或 report 文件: ${date}`);
    console.error(`请先运行: python scripts/tech_digest.py --date ${date}`);
    process.exit(1);
  }

  const emailBody = `${authorName}
${date}

${top10}`;

  const transporter = nodemailer.createTransport({
    host: CONFIG.SMTP_HOST,
    port: CONFIG.SMTP_PORT,
    secure: CONFIG.SMTP_SECURE,
    auth: {
      user: CONFIG.SMTP_USER,
      pass: CONFIG.SMTP_PASS
    }
  });

  await transporter.verify();
  console.log('SMTP connected OK');

  const attachments = [];
  if (fs.existsSync(reportPath)) {
    attachments.push({
      filename: `AI-tech-daily-${date}.md`,
      content: fs.readFileSync(reportPath)
    });
  }

  const info = await transporter.sendMail({
    from: `${CONFIG.FROM_NAME} <${CONFIG.SMTP_USER}>`,
    to: toEmail,
    subject: `【每日科技简报】${date} | AI前沿TOP10 + 完整报告`,
    text: emailBody,
    attachments
  });

  console.log('发送成功:', info.messageId);
  return info;
}

// ============ 主程序 ============
async function main() {
  const opts = parseArgs();
  console.log('Config:', JSON.stringify({
    smtp_host: CONFIG.SMTP_HOST,
    smtp_user: CONFIG.SMTP_USER,
    to: opts.to || CONFIG.DEFAULT_TO,
    date: opts.date || '昨天'
  }, null, 2));

  try {
    await sendReport(opts);
  } catch (e) {
    console.error('发送失败:', e.message);
    process.exit(1);
  }
}

main();
