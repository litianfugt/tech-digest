---
name: tech-digest
description: AI 前沿科技资讯聚合日报工具。自动从 24 个信息源抓取 AI/大模型/科技资讯，用 AI 整理成结构化日报并邮件发送。触发词：科技日报、每日资讯、Tech Digest、前沿科技日报、跑一下资讯、发送日报。
---

# Tech Digest — AI 前沿科技日报

定时抓取 24 个 AI/科技信息源，生成结构化日报并邮件推送。

## 工作流

```
用户触发
  → Python 采集脚本（抓取 RSS/ArXiv/HTML）
  → AI 阅读 source 文件生成结构化报告
  → 发送邮件（TOP10 简报 + 附件完整报告）
```

## 信息源（24 个）

| 类型 | 来源 |
|------|------|
| 国内 AI 媒体 | 量子位、新智元、雷锋网 |
| 前沿科技 | 爱范儿、Solidot、少数派 |
| AI 研究机构 | DeepMind、OpenAI、HuggingFace、MSR、NVIDIA、AI Now |
| 学术论文 | ArXiv (AI/ML/CV/CL/RO) |
| 国际科技 | MIT TR、VentureBeat、Wired、TechCrunch、The Verge、HN、IEEE |

## 目录结构

```
tech-digest/
├── SKILL.md
├── scripts/
│   ├── tech_digest.py      # 采集脚本（Python）
│   ├── send_report.js      # 邮件发送脚本（Node.js）
│   └── run.bat             # Windows 一键运行
├── sources.yaml            # 信息源配置
├── digest_config.yaml      # 运行配置（输出路径等）
├── requirements.txt        # Python 依赖
└── references/
    └── REPORT_PROMPT.md    # 报告生成提示词模板
```

## 使用方式

### 触发命令

```
"跑一下科技日报"
"生成今日资讯"
"发送前沿科技日报"
"Tech Digest"
```

### 完整执行流程

#### Step 1 — 采集数据

```powershell
# 方式1：命令行指定输出目录
python scripts/tech_digest.py --source-only --output-dir "C:\你的路径\output"

# 方式2：修改 sources.yaml 中的 output.output_dir

# 不指定则默认输出到 Skill 目录下的 digests/ 子目录
python scripts/tech_digest.py --source-only
```

工作目录：`skill根目录/`（`tech_digest.py` 会创建 `digests/sources/` 等子目录）

#### Step 2 — AI 生成报告

1. 读取 `digests/sources/source_YYYY-MM-DD.md`
2. 按 `references/REPORT_PROMPT.md` 中的结构生成日报
3. 写入 `digests/reports/report_YYYY-MM-DD.md`

#### Step 3 — 发送邮件

```powershell
node scripts/send_report.js --date 2026-03-23 --to your@email.com
```

或修改 `scripts/send_report.js` 中的 `CONFIG` 对象后直接运行。

---

## 配置说明

### 输出目录（sources.yaml）

在 `sources.yaml` 的 `output` 部分配置：

```yaml
output:
  max_articles_per_source: 10
  output_dir: "C:/Users/你的用户名/Documents/tech_digest_output"
```

**优先级**（从高到低）：
1. 命令行 `--output-dir` 参数
2. `sources.yaml` 中的 `output_dir`
3. **默认**：Skill 安装目录下的 `digests/` 子目录（推荐）

### 信息源（sources.yaml）

每个信息源格式：

```yaml
- name: "量子位"
  rss_url: "https://www.qbitai.com/feed"
  type: "rss"          # rss | arxiv | html
  category: "AI 垂直媒体"
  network: "direct"    # direct = 国内直连 | proxy = 走代理
```

### 代理配置（tech_digest.py 内）

脚本硬编码了 Clash 代理 `127.0.0.1:7897`，如需修改，编辑 `tech_digest.py` 中的：

```python
PROXY = {
    'http': 'http://127.0.0.1:7897',
    'https': 'http://127.0.0.1:7897'
}
```

### 邮件发送（.env 配置）

**推荐方式**：复制 `.env.example` 为 `.env`，填入你的邮箱凭据：

```bash
cp .env.example .env
```

编辑 `.env`：
```
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your@163.com
SMTP_PASS=your_smtp_auth_code
FROM_NAME=克洛 AI 助理
DEFAULT_TO=your@email.com
AUTHOR_NAME=克洛 AI 助理
```

**获取 SMTP 授权码**：
- 163.com：设置 → POP3/SMTP/IMAP → 开启 SMTP → 生成授权码
- Gmail：Google 账户 → 安全 → 应用密码
- QQ：邮箱设置 → 账户 → 生成授权码
- Outlook：账户设置 → 安全 → 应用密码

### 报告格式（references/REPORT_PROMPT.md）

默认报告结构：
- 今日要览（200-400 字总结）
- AI Agent 与产品动态
- 国内 AI 动态
- AI 安全与伦理
- 学术论文精选
- 国际科技要闻
- Reference 表格

可按需修改 `references/REPORT_PROMPT.md` 中的结构要求。

---

## 环境要求

- **Python**：3.13+（需要 `requests`、`feedparser`、`PyYAML`、`python-dateutil`）
- **Node.js**：需要 `nodemailer`（`npm install nodemailer`）
- **代理**：国外信息源需要代理（Clash 默认端口 7897）

安装 Python 依赖：

```bash
pip install -r requirements.txt
```

安装 Node.js 依赖：

```bash
npm install nodemailer
```

---

## 定时自动化

可通过系统 cron/任务计划程序定期执行，配合 `--date` 参数抓取指定日期：

```powershell
# 每天早上 8 点运行
schtasks /create /tn "Tech Digest" /tr "python scripts\tech_digest.py --source-only && node scripts\send_report.js" /sc daily /st 08:00
```

---

## 注意事项

- 每次运行前确保代理开启（国外信息源需要）
- `send_report.js` 中的 SMTP 凭据建议使用**授权码**而非登录密码
- 报告生成由 AI（当前会话模型）完成，无需额外 API Key
- 信息源可按需增删，修改 `sources.yaml` 即可
