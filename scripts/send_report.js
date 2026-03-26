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
  FROM_NAME: envConfig.FROM_NAME || 'AI Assistant',
  DEFAULT_TO: envConfig.DEFAULT_TO || 'your@email.com',
  AUTHOR_NAME: envConfig.AUTHOR_NAME || 'AI Assistant',
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

// ============ 从报告中提取 TOP 10 新闻 ============
function extractTop10FromReport(reportContent) {
  const top10 = [];
  
  // 方法1：尝试从 "今日要览" 部分提取关键信息
  const overviewMatch = reportContent.match(/## 今日要览\n([\s\S]*?)(?=\n---|\n## )/);
  if (overviewMatch) {
    const overview = overviewMatch[1].trim();
    // 提取句子作为候选
    const sentences = overview.split(/[。！？\n]/).filter(s => s.trim().length > 10);
    sentences.slice(0, 5).forEach(s => {
      top10.push(s.trim());
    });
  }
  
  // 方法2：从各个板块提取带 [*] 引用的标题
  const sectionMatches = reportContent.matchAll(/## (?!今日要览|Reference)([^\n]+)\n([\s\S]*?)(?=\n## |$)/g);
  for (const match of sectionMatches) {
    if (top10.length >= 10) break;
    const sectionTitle = match[1].trim();
    const sectionContent = match[2];
    
    // 提取加粗的标题（通常是新闻标题）
    const boldTitles = sectionContent.matchAll(/\*\*([^*]+\*\*)/g);
    for (const bt of boldTitles) {
      if (top10.length >= 10) break;
      const title = bt[1].replace(/\*\*/g, '').trim();
      if (title.length > 5 && title.length < 100) {
        top10.push(title);
      }
    }
  }
  
  return top10.slice(0, 10);
}

// ============ 生成 TOP 10 简报 ============
function generateTop10(reportContent, date, authorName) {
  const top10 = extractTop10FromReport(reportContent);
  
  // 提取文章数
  const countMatch = reportContent.match(/精选\s+(\d+)\s+篇/);
  const articleCount = countMatch ? countMatch[1] : '多';
  
  // 提取信息源数
  const sourceMatch = reportContent.match(/(\d+)\s+个信息源/);
  const sourceCount = sourceMatch ? sourceMatch[1] : '多';
  
  let top10Text = '';
  if (top10.length > 0) {
    top10.forEach((item, i) => {
      top10Text += `${i + 1}. ${item}\n`;
    });
  } else {
    top10Text = '(请查看完整报告获取详情)\n';
  }
  
  return `你好，

以下是 ${date} AI前沿科技重要新闻简报，完整报告见附件。

${top10Text}
---
完整报告共5大板块、${articleCount}篇文章、${sourceCount}个信息源，请查收附件。
本报告由 ${authorName} 整理生成。`;
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
  
  let reportContent = '';
  let attachments = [];
  
  if (fs.existsSync(reportPath)) {
    reportContent = fs.readFileSync(reportPath, 'utf-8');
    attachments = [{
      filename: `AI-tech-daily-${date}.md`,
      content: reportContent
    }];
    console.log('Report found:', reportPath);
  } else {
    console.log('Warning: Report not found at:', reportPath);
    console.log('Please generate the report first.');
    process.exit(1);
  }
  
  const mailOptions = {
    from: `${CONFIG.FROM_NAME} <${CONFIG.SMTP_USER}>`,
    to: toEmail,
    subject: `【每日科技简报】${date} | AI前沿TOP10 + 完整报告`,
    text: generateTop10(reportContent, date, authorName),
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
