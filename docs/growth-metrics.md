# Tracelet growth metrics

曝光不是单一数字。Tracelet 应按“被发现 → 理解价值 → 亲自验证 → 开始接入 → 持续使用”观察完整漏斗。

## 北极星指标

**每周成功开始接入的开发者数**：访问 Quickstart 或 starter 后，继续点击 npm / GitHub，或在后续产品遥测中首次成功投递事件的人数。

当前站点没有跨站身份系统，因此先使用可解释的代理指标，不用访客指纹拼接用户身份。

## 漏斗

| 阶段 | 主要指标 | 可用数据源 | 目标动作 |
| --- | --- | --- | --- |
| 被发现 | 搜索展示、自然点击、referrer、GitHub views | Search Console、Vercel Web Analytics、GitHub Insights | 进入首页或架构文章 |
| 理解价值 | 首页到 Quickstart / Guide 的点击，停留与跳出趋势 | Vercel Web Analytics | 阅读核心设计与能力 |
| 亲自验证 | Playground 访问、运行 `track`、完成失败重试 | 页面访问；后续可增加隐私安全的聚合事件 | 真实体验 SDK |
| 开始接入 | starter、npm、GitHub 的出站点击；npm weekly downloads | Vercel、npm、GitHub | 安装或 fork 示例 |
| 持续使用 | GitHub stars、Discussions、Issues、dependents、版本采用 | GitHub、npm | 反馈、贡献或升级 |

## 每周看板

每周固定记录，不因单日波动做结论：

首份发布前基线见 [2026-10-20 growth baseline](./growth-baseline-2026-10-20.md)。后续快照应复用相同口径，并明确区分真实访问与 CI、维护者操作、自动化安装产生的噪声。

```text
Search impressions / clicks / CTR:
Top landing pages:
Playground visits:
Quickstart visits:
Starter outbound clicks:
npm weekly downloads:
GitHub stars / clones / unique visitors:
New issues / discussions / external mentions:
Most common question:
One experiment for next week:
```

## 首批事件建议

如果后续启用站点行为统计，只采集产品动作，不采集输入框内容、事件属性、用户标识或 EventBatch：

- `playground_started`
- `playground_retry_simulated`
- `playground_retry_completed`
- `quickstart_opened`
- `starter_opened`，属性仅允许 `framework: react | vue | collector`
- `outbound_opened`，属性仅允许 `target: npm | github`

上线前应在隐私说明中声明统计目的，并提供关闭方式。Playground 中用户输入的事件名和 JSON 始终留在浏览器本地。

当前站点只启用了 Vercel Web Analytics 的匿名页面访问统计。页脚提供持久化关闭入口，并自动尊重浏览器的 Do Not Track 与 Global Privacy Control；Playground 输入、事件属性和用户身份不会进入站点统计。自定义事件查询需要 Vercel Pro 或 Enterprise，现阶段不为此升级套餐，也不发送无法审阅的自定义事件。

## 30 天实验

### 第 1 周：让价值可验证

- 上线真实 SDK Playground。
- 配置 GitHub 门面、社交预览和 Discussions。
- 建立 Search Console / Vercel / npm / GitHub 基线。

### 第 2 周：降低接入成本

- 验证 React、Vue、collector starter 可以直接运行。
- 观察 Quickstart 与 starter 的访问路径。
- 根据首批问题补 FAQ。

### 第 3 周：获取高意图反馈

- 发布架构文章和 Show HN。
- 把问题分类为 API、文档、隐私、可靠性与生态集成。
- 优先修复阻塞首次接入的问题。

### 第 4 周：扩大分发

- 用已经验证过的定位与截图准备 Product Hunt。
- 在中文技术社区发布不同角度的深度内容。
- 比较不同渠道的 Quickstart / Playground 到达率，而不是只比较点击总数。

## 决策规则

- 展示高、点击低：改标题、描述和社交素材。
- 首页访问高、Quickstart 低：价值主张或 CTA 不清楚。
- Playground 高、starter 低：体验有趣但生产接入路径不够可信。
- starter 高、npm 下载低：模板、包名或安装步骤存在摩擦。
- 下载增长但反馈和版本采用低：补迁移文档、兼容性承诺和社区入口。

每次只改变一个主要变量，至少观察一周，并保留基线和结论。
