# Tech Digest — AI 前沿科技日报聚合

> 自动采集 24 个 AI / 大模型 / 前沿科技信息源，AI 整理成结构化日报，邮件推送。

![Python](https://img.shields.io/badge/Python-3.13+-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

## 功能特性

- **24 个精选信息源**：量子位、新智元、爱范儿、ArXiv（5 个分类）、DeepMind、OpenAI、HuggingFace、MIT TR、TechCrunch 等
- **自动采集**：RSS + ArXiv API + HTML 爬取，支持代理
- **AI 生成报告**：由大模型直接整理生成结构化日报，无需额外 API Key
- **邮件推送**：支持 SMTP，可配置任意邮箱发送
- **完全可控**：信息源、输出路径均可配置

---

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/litianfugt/tech-digest.git
cd tech-digest
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
npm install nodemailer
```

### 3. 配置

**修改 `sources.yaml`**（可选，默认输出到 Skill 目录）：
```yaml
output:
  max_articles_per_source: 10
  output_dir: ""   # 留空则默认输出到 digests/ 子目录
```

### 3. 配置邮件（可选）

**复制邮件配置模板**：
```bash
cp .env.example .env
```

**编辑 `.env`，填入你的邮箱凭据**：
```
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your@163.com
SMTP_PASS=your_smtp_auth_code
DEFAULT_TO=your@email.com
```

**获取 SMTP 授权码**：
- 163.com：设置 → POP3/SMTP/IMAP → 开启 SMTP → 生成授权码
- Gmail：Google 账户 → 安全 → 应用密码
- QQ/Outlook：类似流程

### 4. 运行

```bash
# 采集数据
python scripts/tech_digest.py --source-only

# 发送邮件（使用 .env 中的配置）
node scripts/send_report.js

# 或指定收件人
node scripts/send_report.js --to recipient@email.com
```

---

## 信息源列表

| 类型 | 数量 | 来源 |
|------|------|------|
| 国内 AI 媒体 | 3 | 量子位、新智元、雷锋网 |
| 前沿科技 | 3 | 爱范儿、Solidot、少数派 |
| AI 研究机构 | 6 | DeepMind、OpenAI、HuggingFace、MSR、NVIDIA、AI Now |
| 学术论文 | 5 | ArXiv (AI/ML/CV/CL/RO) |
| 国际科技 | 7 | MIT TR、VentureBeat、Wired、TechCrunch、The Verge、HN、IEEE |

---

## 目录结构

```
tech-digest/
├── README.md                 # 项目说明
├── SKILL.md                  # QClaw Skill 说明
├── .env.example              # 邮件配置模板
├── email-config.yaml         # 邮件配置说明
├── sources.yaml              # 信息源配置
├── requirements.txt          # Python 依赖
├── scripts/
│   ├── tech_digest.py       # 采集脚本
│   ├── send_report.js       # 邮件发送
│   └── run.bat              # Windows 一键运行
├── references/
│   └── REPORT_PROMPT.md     # 报告生成模板
└── digests/                  # 输出目录（自动生成）
    ├── sources/             # 原始数据
    ├── reports/             # 整理报告
    └── log/                 # 错误日志
```

---

## 工作流

```
用户触发
  → Python 采集（24源 → 原始 Markdown）
  → AI 阅读原始数据
  → AI 生成结构化日报
  → 发送邮件（TOP10 简报 + 完整报告附件）
```

---

## 报告示例

生成的日报包含：
- 今日要览（高层总结）
- AI Agent 与产品动态
- 国内 AI 动态
- AI 安全与伦理
- 学术论文精选（含技术细节）
- 国际科技要闻
- Reference 引用表格

---

## License

MIT
