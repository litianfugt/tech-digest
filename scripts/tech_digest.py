#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tech Digest - AI 前沿科技聚合工具
- 支持代理（Clash 7897端口）
- 国内直连，国外走代理
- 支持 RSS / ArXiv API / HTML 爬取三种模式
"""

import os
import sys
import yaml
import feedparser
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
import re
from urllib.parse import unquote
from dateutil import parser as date_parser

PROXY = {
    'http': 'http://127.0.0.1:7897',
    'https': 'http://127.0.0.1:7897'
}

session_direct = requests.Session()
session_direct.headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

session_proxy = requests.Session()
session_proxy.proxies = PROXY
session_proxy.headers = session_direct.headers.copy()


class TechDigest:
    """科技资讯聚合工具"""

    def __init__(self, config_path: str = "sources.yaml", date_range: Optional[Tuple[datetime, datetime]] = None, output_dir: Optional[str] = None):
        self.config = self.load_config(config_path)
        self.sources = self.config.get('sources', [])
        self.output_config = self.config.get('output', {})
        self.debug_log = []
        # 优先级：命令行参数 > sources.yaml output_dir > 脚本所在目录下的 digests/
        yaml_output_dir = self.output_config.get('output_dir', '').strip()
        if output_dir:
            self.output_dir = Path(output_dir)
        elif yaml_output_dir:
            self.output_dir = Path(yaml_output_dir)
        else:
            # 默认输出到脚本所在目录的 digests/ 子目录
            script_dir = Path(__file__).parent.parent
            self.output_dir = script_dir
        if date_range:
            self.date_start, self.date_end = date_range
        else:
            self.date_start, self.date_end = self._get_yesterday_range()

    def _get_yesterday_range(self) -> Tuple[datetime, datetime]:
        """获取昨天的日期范围（昨天0点到今天0点）"""
        now = datetime.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today - timedelta(days=1)
        yesterday_end = today
        return yesterday_start.replace(tzinfo=None), yesterday_end.replace(tzinfo=None)

    def _parse_date_range(self, date_str: str) -> Tuple[datetime, datetime]:
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
            end = (dt + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            return start, end
        except ValueError:
            pass
        try:
            if '~' in date_str:
                start_str, end_str = date_str.split('~')
                start = datetime.strptime(start_str.strip(), "%Y-%m-%d")
                end = datetime.strptime(end_str.strip(), "%Y-%m-%d")
                end = (end + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                return start, end
        except ValueError:
            pass
        raise ValueError(f"无法解析日期: {date_str}，请使用 YYYY-MM-DD 或 YYYY-MM-DD~YYYY-MM-DD 格式")

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        if not date_str:
            return None
        try:
            dt = date_parser.parse(date_str, fuzzy=True)
            if dt.tzinfo is not None:
                dt = dt.replace(tzinfo=None)
            return dt
        except Exception:
            return None

    def _is_within_target_range(self, date_str: str) -> bool:
        """检查日期是否在目标范围内"""
        dt = self._parse_date(date_str)
        if dt is None:
            return True
        return self.date_start <= dt < self.date_end

    def load_config(self, config_path: str) -> Dict:
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def log_debug(self, source_name: str, status: str, detail: str = ""):
        self.debug_log.append({
            'source': source_name,
            'status': status,
            'detail': detail,
            'timestamp': datetime.now().strftime("%H:%M:%S")
        })

    def get_session(self, source: Dict) -> requests.Session:
        return session_proxy if source.get('network', 'direct') == 'proxy' else session_direct

    def fetch_rss(self, source: Dict[str, Any]) -> List[Dict[str, str]]:
        articles = []
        rss_url = source.get('rss_url')
        name = source['name']
        if not rss_url:
            self.log_debug(name, "SKIP", "no URL")
            return articles

        sess = self.get_session(source)
        try:
            r = sess.get(rss_url, timeout=20)
            r.raise_for_status()
            feed = feedparser.parse(r.text)
            if not feed.entries:
                self.log_debug(name, "OK", "0 articles (no new posts yesterday)")
                return articles

            max_n = self.output_config.get('max_articles_per_source', 10)
            for entry in feed.entries[:max_n]:
                published = entry.get('published', '')
                if not self._is_within_target_range(published):
                    continue
                summary = entry.get('summary', '')
                summary = re.sub('<[^<]+?>', '', summary).strip()
                summary = re.sub(r'\s+', ' ', summary)
                articles.append({
                    'title': entry.get('title', '').strip(),
                    'url': entry.get('link', ''),
                    'summary': summary[:500] if summary else '',
                    'published': published,
                    'source': name,
                    'category': source.get('category', 'Other'),
                })
            self.log_debug(name, "OK", f"{len(articles)} articles")
        except Exception as e:
            self.log_debug(name, "FAIL", str(e)[:60])
        return articles

    def fetch_html(self, source: Dict[str, Any]) -> List[Dict[str, str]]:
        articles = []
        url = source.get('url')
        name = source['name']
        if not url:
            self.log_debug(name, "SKIP", "no URL")
            return articles
        sess = self.get_session(source)
        try:
            r = sess.get(url, timeout=20)
            r.raise_for_status()
            r.encoding = r.apparent_encoding or 'utf-8'
            html = r.text
            if name == "新智元":
                articles = self._parse_aiera(html, name, source, 10)
            else:
                self.log_debug(name, "FAIL", "unknown html source")
                return articles
            self.log_debug(name, "OK", f"{len(articles)} articles" if articles else "0 articles")
        except Exception as e:
            self.log_debug(name, "FAIL", str(e)[:60])
        return articles

    def _parse_aiera(self, html: str, name: str, source: Dict, max_n: int) -> List[Dict[str, str]]:
        """解析新智元网站，从URL中提取日期并进行时间过滤"""
        articles = []
        # 从 URL 中提取日期：https://aiera.com.cn/2026/03/24/...
        pattern = r'href="(https://aiera\.com\.cn/(\d{4}/\d{2}/\d{2})/[^"]+)"[^>]*>([^<]{10,})'
        matches = re.findall(pattern, html)
        seen = set()
        for url, date_str, title in matches:
            if url not in seen:
                seen.add(url)
                title = title.strip()
                url_decoded = unquote(url)
                # 将日期格式化为 YYYY-MM-DD 进行时间过滤
                published = date_str.replace('/', '-')
                if not self._is_within_target_range(published):
                    continue
                articles.append({
                    'title': title,
                    'url': url_decoded,
                    'summary': '',
                    'published': published,
                    'source': name,
                    'category': source.get('category', 'Other'),
                })
                if len(articles) >= max_n:
                    break
        return articles

    def fetch_arxiv(self, source: Dict[str, Any]) -> List[Dict[str, str]]:
        articles = []
        name = source['name']
        category = source.get('arxiv_category', 'cs.AI')
        try:
            url = f"https://export.arxiv.org/api/query?search_query=cat:{category}&sortBy=submittedDate&sortOrder=descending&max_results=20"
            r = session_proxy.get(url, timeout=30)
            r.raise_for_status()
            feed = feedparser.parse(r.text)
            if not feed.entries:
                self.log_debug(name, "OK", "0 papers")
                return articles
            for entry in feed.entries[:20]:
                published = entry.get('published', '')
                if not self._is_within_target_range(published):
                    continue
                title = entry.get('title', '').replace('\n', ' ').strip()
                authors = ', '.join(a.get('name', '') for a in entry.get('authors', [])[:3])
                summary = entry.get('summary', '').replace('\n', ' ').strip()
                link = ''
                for link_obj in entry.get('links', []):
                    if 'abs' in link_obj.get('href', ''):
                        link = link_obj['href']
                        break
                articles.append({
                    'title': title,
                    'url': link,
                    'summary': f"Authors: {authors}. {summary[:400]}",
                    'published': published,
                    'source': name,
                    'category': source.get('category', '学术论文'),
                })
            self.log_debug(name, "OK", f"{len(articles)} papers")
        except Exception as e:
            self.log_debug(name, "FAIL", str(e)[:60])
        return articles

    def _deduplicate(self, articles: List[Dict[str, str]]) -> List[Dict[str, str]]:
        seen_urls = set()
        unique = []
        for a in articles:
            url = a.get('url', '')
            if not url or url not in seen_urls:
                seen_urls.add(url)
                unique.append(a)
        return unique

    def fetch_all_sources(self) -> List[Dict[str, str]]:
        all_articles = []
        total = len(self.sources)
        start_str = self.date_start.strftime('%Y-%m-%d')
        end_str = (self.date_end - timedelta(days=1)).strftime('%Y-%m-%d')
        target_str = start_str if start_str == end_str else f"{start_str} ~ {end_str}"
        print(f"\n{'='*60}")
        print(f"  Fetching {total} sources... (target: {target_str})")
        print(f"{'='*60}\n")
        for i, source in enumerate(self.sources, 1):
            name = source.get('name', '?')
            stype = source.get('type', 'rss')
            tag = f"[{i:02d}/{total}]"
            if stype == 'arxiv':
                arts = self.fetch_arxiv(source)
            elif stype == 'html':
                arts = self.fetch_html(source)
            else:
                arts = self.fetch_rss(source)
            all_articles.extend(arts)
            logs = [l for l in self.debug_log if l['source'] == name]
            status = logs[-1]['status'] if logs else ("OK" if arts else "FAIL")
            print(f"  {tag} {status:4s} | {name:30s} | {len(arts)} articles")
        all_articles = self._deduplicate(all_articles)
        success = sum(1 for d in self.debug_log if d['status'] == 'OK')
        failed = sum(1 for d in self.debug_log if d['status'] == 'FAIL')
        print(f"\n{'='*60}")
        print(f"  Done! Success: {success}, Failed: {failed}, Articles: {len(all_articles)}")
        print(f"{'='*60}\n")
        return all_articles

    def _get_date_label(self) -> str:
        start_str = self.date_start.strftime('%Y-%m-%d')
        end_str = (self.date_end - timedelta(days=1)).strftime('%Y-%m-%d')
        return start_str if start_str == end_str else f"{start_str}~{end_str}"

    def save_source_md(self, articles: List[Dict], filename: str):
        output_dir = self.output_dir / 'digests' / 'sources'
        output_dir.mkdir(parents=True, exist_ok=True)
        filepath = output_dir / filename
        categories: Dict[str, List[Dict]] = {}
        for a in articles:
            categories.setdefault(a.get('category', 'Other'), []).append(a)
        lines = [f"# AI 前沿科技 - 原始数据"]
        date_label = self._get_date_label()
        lines.append(f"\n> 日期：{date_label} | 文章数：{len(articles)} | 信息源数：{len(set(a['source'] for a in articles))}\n")
        lines.append("---\n")
        lines.append(f"**说明**：以下是从 {len(self.sources)} 个信息源爬取的原始数据（{date_label}），包含标题、摘要和链接。\n")
        for cat, arts in categories.items():
            lines.append(f"## {cat}\n")
            for a in arts:
                lines.append(f"### [{cat}] {a['source']} - {a['title']}")
                if a.get('url'):
                    lines.append(f"**链接**：{a['url']}")
                if a.get('summary'):
                    lines.append(f"**摘要**：{a['summary']}")
                else:
                    lines.append("**摘要**：（无）")
                lines.append("")
        content = '\n'.join(lines)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Source MD: {filepath}")
        return filepath

    def save_debug_log(self):
        failed_logs = [log for log in self.debug_log if log['status'] == 'FAIL']
        if not failed_logs:
            print("  Log: All sources OK")
            return
        output_dir = self.output_dir / 'digests' / 'log'
        output_dir.mkdir(parents=True, exist_ok=True)
        filepath = output_dir / f"log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"Error Log - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            for log in failed_logs:
                f.write(f"  [-] {log['source']:30s} FAIL\n")
                if log['detail']:
                    f.write(f"      {log['detail']}\n")
        print(f"  Log: {filepath}")

    def run(self) -> Tuple[List[Dict], str]:
        date_label = self._get_date_label()
        print(f"\n{'='*60}\n  Tech Digest - 数据采集\n  时间范围: {date_label}\n{'='*60}")
        articles = self.fetch_all_sources()
        print("Saving...")
        source_path = self.save_source_md(articles, f"source_{date_label}.md")
        self.save_debug_log()
        print(f"\nDone! {len(articles)} articles from {len(set(a['source'] for a in articles))} sources.")
        return articles, str(source_path)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Tech Digest - AI 前沿科技聚合工具")
    parser.add_argument('--date', '-d', type=str, help='指定日期 YYYY-MM-DD')
    parser.add_argument('--range', '-r', type=str, help='指定日期范围 YYYY-MM-DD~YYYY-MM-DD')
    parser.add_argument('--source-only', action='store_true', help='仅采集数据')
    parser.add_argument('--output-dir', type=str, default=None, help='输出目录（默认为当前目录）')
    args = parser.parse_args()

    date_range = None
    if args.date:
        tool = TechDigest(output_dir=args.output_dir)
        date_range = tool._parse_date_range(args.date)
        tool = TechDigest(date_range=date_range, output_dir=args.output_dir)
    elif args.range:
        tool = TechDigest(output_dir=args.output_dir)
        date_range = tool._parse_date_range(args.range)
        tool = TechDigest(date_range=date_range, output_dir=args.output_dir)
    else:
        tool = TechDigest(output_dir=args.output_dir)

    articles, source_path = tool.run()

    if not args.source_only and articles:
        print(f"\n数据采集完成！Source 文件: {source_path}")
        print("请用 AI 阅读 source 文件并生成完整报告，然后运行 send_report.js 发送邮件。")
