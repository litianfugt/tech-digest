#!/usr/bin/env node
/**
 * send_report.js - AI 前沿科技日报邮件发送脚本
 * 
 * 配置方式：
 *   1. 复制 ../.env.example 为 ../.env，填入你的邮箱凭据
 * 
 * 使用方式:
 *   node send_report.js --date 2026-03-23 --to user@example.com
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
        if (key && value) config[key.trim()] = value.trim();
      }
    });
  }
  return config;
}

// ============ 配置区 ============
const envConfig = loadEnvConfig();
const CONFIG = {
  SMTP_HOST: envConfig.SMTP_HOST || 'smtp.example.com',
  SMTP_PORT: parseInt(envConfig.SMTP_PORT || '465'),
  SMTP_SECURE: envConfig.SMTP_SECURE !== 'false',
  SMTP_USER: envConfig.SMTP_USER || 'your@email.com',
  SMTP_PASS: envConfig.SMTP_PASS || 'your_smtp_auth_code',
  FROM_NAME: envConfig.FROM_NAME || '克洛 AI 助理',
  DEFAULT_TO: envConfig.DEFAULT_TO || 'your@email.com',
  AUTHOR_NAME: envConfig.AUTHOR_NAME || '克洛 AI 助理',
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

// ============ 生成 TOP 10 简报 ============
function generateTop10(articleCount, date, authorName) {
  return `迭戈你好，

以下是今日（${date}）AI前沿科技10条最重要新闻简报，完整报告见附件。

1. 小扎秘密研发 CEO Agent，开源"人生托管系统"引发热议
2. Karpathy 确诊"AI精神病"，每天16小时养"龙虾"
3. Momenta 放弃 VLA 选择世界模型，大众首发
4. MiniMax M2.7 国服第一，龙虾自我进化引关注
5. OpenClaw 发布重大升级，底层架构全面更新
6. 陶哲轩：AI 无法取代科学中的"故事"
7. OpenAI 推出 Sora Safely，内置安全保护
8. GrapheneOS 拒绝遵守年龄验证法律
9. 学术论文：WorldCache 加速视频世界模型推理
10. 巴哈马群岛鲨鱼体内发现可卡因

---
完整报告共5大板块、${articleCount}篇文章，请查收附件。本报告由 ${authorName} 整理生成。`;
}

// ============ 主程序 ============
async function main() {
  const opts = parseArgs();
  const date = opts.date || new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const toEmail = opts.to || CONFIG.DEFAULT_TO;
  const authorName = opts.author || CONFIG.AUTHOR_NAME;
  
  console.log('Config:', JSON.stringify({
    smtp_host: CONFIG.SMTP_HOST,
    smtp_user: CONFIG.SMTP_USER,
    to: toEmail,
    date: date
  }, null, 2));
  
  const skillRoot = CONFIG.SKILL_ROOT;
  const reportPath = path.join(skillRoot, 'digests', 'reports', `report_${date}.md`);
  
  let articleCount = '';
  let reportContent = '';
  let attachments = [];
  
  if (fs.existsSync(reportPath)) {
    reportContent = fs.readFileSync(reportPath, 'utf-8');
    const match = reportContent.match(/精选\s+(\d+)\s+篇/);
    if (match) articleCount = match[1];
    attachments = [{
      filename: `AI-tech-daily-${date}.md`,
      content: reportContent
    }];
    console.log('Report found, article count:', articleCount);
  } else {
    console.log('Warning: Report not found at:', reportPath);
  }
  
  const mailOptions = {
    from: `${CONFIG.FROM_NAME} <${CONFIG.SMTP_USER}>`,
    to: toEmail,
    subject: `【每日科技简报】${date} | AI前沿TOP10 + 完整报告`,
    text: generateTop10(articleCount || '多', date, authorName),
    attachments: attachments
  };
  
  console.log('Sending mail to:', toEmail);
  
  const transporter = nodemailer.createTransport({
    host: CONFIG.SMTP_HOST,
    port: CONFIG.SMTP_PORT,
    secure: CONFIG.SMTP_SECURE,
    auth: {
      user: CONFIG.SMTP_USER,
      pass: CONFIG.SMTP_PASS
    }
  });
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('发送成功:', info.messageId);
  } catch (err) {
    console.error('发送失败:', err.message, err.code);
    process.exit(1);
  }
}

main();
