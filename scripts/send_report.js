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

// ============ 生成邮件内容 ============
function generateEmailBody(date, authorName) {
  return `迭戈你好，

今日 AI 前沿科技简报见附件，完整报告共 5 大板块。

—— ${authorName}

日期：${date}`;
}

// ============ 发送邮件 ============
function sendReport(opts, callback) {
  const date = opts.date || new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const toEmail = opts.to || CONFIG.DEFAULT_TO;
  const authorName = opts.author || CONFIG.AUTHOR_NAME;
  
  const skillRoot = CONFIG.SKILL_ROOT;
  const reportPath = path.join(skillRoot, 'digests', 'reports', `report_${date}.md`);
  const sourcePath = path.join(skillRoot, 'digests', 'sources', `source_${date}.md`);
  
  console.log('Report path:', reportPath);
  console.log('Report exists:', fs.existsSync(reportPath));
  
  const transporter = nodemailer.createTransport({
    host: CONFIG.SMTP_HOST,
    port: CONFIG.SMTP_PORT,
    secure: CONFIG.SMTP_SECURE,
    auth: {
      user: CONFIG.SMTP_USER,
      pass: CONFIG.SMTP_PASS
    }
  });
  
  const attachments = [];
  if (fs.existsSync(reportPath)) {
    attachments.push({
      filename: `AI-tech-daily-${date}.md`,
      content: fs.readFileSync(reportPath)
    });
    console.log('Attachment added');
  } else {
    console.log('Warning: Report not found, sending without attachment');
  }
  
  const mailOptions = {
    from: `${CONFIG.FROM_NAME} <${CONFIG.SMTP_USER}>`,
    to: toEmail,
    subject: `【每日科技简报】${date} | AI前沿TOP10 + 完整报告`,
    text: generateEmailBody(date, authorName),
    attachments: attachments
  };
  
  console.log('Sending mail to:', toEmail);
  
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('发送失败:', err.message, err.code);
      callback(err);
      return;
    }
    console.log('发送成功:', info.messageId);
    callback(null, info);
  });
}

// ============ 主程序 ============
function main() {
  const opts = parseArgs();
  console.log('Config:', JSON.stringify({
    smtp_host: CONFIG.SMTP_HOST,
    smtp_user: CONFIG.SMTP_USER,
    to: opts.to || CONFIG.DEFAULT_TO,
    date: opts.date || '昨天'
  }, null, 2));
  
  sendReport(opts, (err, info) => {
    if (err) {
      process.exit(1);
    }
    process.exit(0);
  });
}

main();
