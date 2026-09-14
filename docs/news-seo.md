# 新闻文章 SEO 与结构化数据规范

## 与真实内容保持一致

- `TUTORIAL_GUIDE` 使用 `TechArticle`；`BUYING_GUIDE`、`INDUSTRY_INSIGHTS` 使用 `Article`。不根据标题关键词猜测教程类型，也不将所有文章标记为新闻报道。
- 已删除新闻页通用 `HowTo` 模板和生成函数。不得自动补入正文不存在的步骤、工具、耗材、作业时长、资质或适用型号。
- 作者使用后台 `NewsArticle.authorName` 的真实署名；当前内容以编辑团队署名，用 `Organization` 描述。若未来加入个人作者，应新增明确的作者类型和身份资料，不应仅根据姓名猜测类型。
- `datePublished` 读取 `publishedAt`，`dateModified` 读取 `updatedAt`。首次发布日期未知时省略，不用修改时间冒充。后台重新发布保留原首次发布日期。
- 正文上方显示作者及真实发布日期；有跨日修改时另列更新时间。列表和近期资讯优先显示发布日期，日期格式统一使用 UTC，避免服务端和客户端时区造成日期不一致。
- 封面只使用公开内容仓库返回的可用图片，同时用于文章 JSON-LD 和 Open Graph / Twitter 分享信息。

## 路由、语言与索引

- 新闻详情仍为 Server Component，正文和 JSON-LD 直接输出到 HTML。
- 每篇文章保留唯一 H1、独立 Title / Description、canonical，附加“首页 → 新闻动态 → 文章”的 `BreadcrumbList`，与可见导航一致。
- CMS 返回的语言路径是权威列表，`hreflang` 不生成缺失或未发布的翻译链接。`x-default` 优先选择实际存在的英文，其次中文、俄文。静态页面保留三语默认路径。
- 已发布新闻继续由现有 sitemap 动态收录，修改时间来自数据库；本次不新增推送接口，也不修改数据库结构。
- 技术支持框架沿用 `docs/support-center.md` 的内容完整性和索引边界，不将空白设备页冒充完整技术手册。

结构化数据只描述页面，不是权威认证，也不保证排名、富媒体展示或被 AI 引用。Google 已停止 HowTo 富媒体结果展示；Schema.org 的 HowTo 类型本身并未因此失效。

## 回归检查

- `src/lib/seo.test.ts`：类型、真实字段、缺失字段、语言路径与面包屑。
- `src/lib/content-repository.test.ts`：后台日期、作者映射及已发布翻译过滤。
- `src/app/[locale]/news/[slug]/page.test.tsx`：三语服务端正文、唯一 H1、无 HowTo、可见署名日期与结构化数据一致。
- `src/components/editorial/news-category-feed.test.tsx`：列表日期和现有分类交互。
- `src/app/admin/news-status.test.ts`：首次发布、重新发布、下架及缺失翻译时的日期和发布门禁。
