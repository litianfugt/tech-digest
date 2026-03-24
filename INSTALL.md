# tech-digest 安装说明

## 快速开始

1. 解压 `tech-digest.zip` 到任意目录
2. 安装 Python 依赖：`pip install -r requirements.txt`
3. 安装 Node.js 依赖：`npm install nodemailer`
4. 修改 `scripts/send_report.js` 中的 `CONFIG` 配置（邮箱、授权码等）
5. 运行：`python scripts/tech_digest.py --source-only`
6. 让 AI 阅读 source 文件生成报告
7. 运行：`node scripts/send_report.js --to your@email.com`

## 详细配置

详见 `SKILL.md`。

## 文件结构

```
tech-digest/
├── SKILL.md                  # AI 技能说明
├── sources.yaml              # 24 个信息源配置
├── requirements.txt          # Python 依赖
├── scripts/
│   ├── tech_digest.py        # 数据采集脚本
│   ├── send_report.js        # 邮件发送脚本
│   └── run.bat               # Windows 一键运行
└── references/
    └── REPORT_PROMPT.md      # 报告生成模板
```
