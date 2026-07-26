# 任务计划：WebXR-Lab

## 目标
在不购买云服务器的前提下，打造一个由当前 MacBook 提供开发与局域网服务、可在 Meta Quest 与 Apple Vision Pro（visionOS 27）上运行和真机验证的跨设备 WebXR 体验集合，系统展示沉浸式视觉、空间交互与手势交互的可能性。

## 当前阶段
阶段 6（功能开发完成；按用户决定等待集中真机验收）

## 各阶段

### 阶段 1：能力核验与产品定义
- [x] 核验 Quest 与 visionOS 27 的 WebXR、手势、VR/AR 能力边界
- [x] 明确首版产品支柱、体验结构与非目标
- [x] 明确本地 HTTPS、局域网访问和真机调试路径
- [x] 将外部研究结果记录到 findings.md
- **状态：** complete

### 阶段 2：架构与体验蓝图
- [x] 确定跨设备能力分级和渐进增强策略
- [x] 确定前端、3D、状态管理、测试和资源管线
- [x] 设计 Hub、展项协议、输入抽象层和诊断面板
- [x] 制定性能预算、无障碍和舒适度规则
- **状态：** complete

### 阶段 3：可运行技术探针
- [x] 创建最小 WebXR 项目骨架
- [x] 实现设备与能力探测页
- [x] 实现 MacBook 本地 HTTPS 服务
- [x] 在桌面浏览器和 Vision Pro 上完成首轮矩阵；Quest 3 硬件回归合并到阶段 6
- **状态：** complete

### 阶段 4：核心垂直切片
- [x] 完成代码侧性能收敛与真机可观测性（硬件帧预算签字移至阶段 6）
- [x] 增加场景内“退出并查看报告”入口，以及退出后的自动“保存至 Mac”
- [x] 建立空间 Hub 与展项加载机制（Registry、能力过滤、运行时与首个独立展项已接通）
- [x] 打通 Hub → 手势序章 → 返回 Hub 的首个独立生命周期
- [x] 将 XR 原始 select 映射为场景级稳定动作，并写入诊断报告
- [x] 实现一组代表性 VR/AR 视觉与手势交互展项
- [x] 完成跨设备输入语义、降级路径和返回 Hub 流程
- [x] 实现光之织机：跨设备捏合轨迹、GPU 光点 Shader、资源上限与返回 Hub
- [x] 实现动力工坊基础版：远距抓取、抛掷、重力/反弹和资源复位
- [x] 实现口袋宇宙基础版：单手旋转、双手缩放、尺度边界与返回 Hub
- [x] 实现 Vision Pro 27 空间布景的网页预览、能力门控与沉浸入口
- [x] 实现 Quest MR 实验场：immersive-ar 能力门控、命中测试与空间放置
- [x] 增量测试并建立自动资源预算基线
- [x] 编写面向小白的完整启停、证书、测试与故障排查教程
- **状态：** complete

### 阶段 5：体验扩展与内容生产
- [x] 扩展视觉、物理、音频、空间 UI 与局域网共创展项
- [x] 建立资源压缩、缓存、预加载与版本管理
- [x] 增加首次引导、舒适度选项和讲解模式
- [x] 实现 Mac WSS 房间、共振室同步与断线单机降级
- **状态：** complete

### 阶段 6：系统验证与交付
- [ ] 完成 Quest / Vision Pro 兼容性回归（Vision Pro 基础沉浸与自然输入已通过，性能和完整展项仍待验收）
- [x] 完成本地部署、启动、证书和故障排查文档
- [x] 核对构建、单测、资源预算、HTTPS/WSS 与服务启停
- **状态：** in_progress（只剩集中真机验收）

## 集中真机验收问题
1. Vision Pro 当前 Safari 27 Beta 是否默认开放 WebXR 与 Immersive API？
2. Vision Pro 的基础 transient pointer 已通过；完整 hand joint、帧预算和长期稳定性表现如何？
3. Quest 3 当前系统是否允许可靠信任 Mac 本地 CA？
4. Quest Browser 的 WebXR optional features 实际组合是什么？

## 已做决策
| 决策 | 理由 |
|------|------|
| 项目暂命名为 `WebXR-Lab` | 描述性强，且与最终品牌名解耦 |
| 使用“能力探测 + 渐进增强”，不依赖 User-Agent 分支 | 同一设备/浏览器版本的可用特性可能变化，运行时能力更可靠 |
| 第一份可运行成果必须是技术探针，而不是大型场景 | 尽早以真机事实校准 Vision Pro 与 Quest 的能力边界 |
| 运行服务以 MacBook 为中心 | 满足不购买云服务器的硬约束 |
| 首版采用 TypeScript + Vite + Three.js + 原生 WebXR 适配层 | 直接控制动态输入源、帧循环与资源生命周期，降低框架滞后风险 |
| WebGL2 是共同渲染基线 | Quest 与 Vision Pro 的沉浸式 Web 路径更稳，WebGPU 仅作后续实验 |
| Mac 使用本地 HTTPS/WSS，展项按需缓存 | 满足零云依赖，并为后续局域网协作保留通道 |
| M1 先围绕 Vision Pro / visionOS 27 Beta 实现 | Vision Pro 当前在用户身边，可立即真机验证；Quest 3 保留同一探针入口，稍后补测 |
| Quest 真机项不阻塞 Vision Pro M2 | Vision Pro 的 M1 启动链路已经真机通过；继续开发可获得更快反馈 |
| 开发完成后再集中进行真机验证 | 用户希望不中断开发节奏；开发阶段保留自动化验证，最终再统一执行 Vision Pro / Quest 硬件闸门 |
| visionOS 27 空间布景使用 `<model>` + USDZ，不混入 WebXR Hub | 该 API 属于网页层沉浸环境，参考系与 WebXR 会话不同；独立入口更符合平台能力边界 |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| 首次创建目录时将尚不存在的目录设为 `workdir`，进程无法启动 | 1 | 改从父目录执行 `mkdir -p`，目录已成功建立 |
| 一次跨三个文件的补丁因进度文件上下文不匹配而未应用 | 1 | 重新读取文件并拆分为小补丁，未造成内容损坏 |
| M1 首次 TypeScript 构建发现可选 WebXR API、SVG 泛型和 Three.js 材质联合类型错误 | 1 | 按真实可选性增加守卫，放宽元素泛型并显式处理材质数组 |
| Playwright 不信任项目私有 CA，无法直接打开 HTTPS 页面 | 1 | 保留严格 HTTPS 的 curl 校验，新增仅绑定 localhost 的 HTTP 视觉检查模式 |
| macOS 自带 LibreSSL 的 `openssl x509` 不支持 `-ext` 查看参数 | 1 | 改用 `-text -noout` 并通过 `rg` 提取 Subject Alternative Name |
| 光之织机从 planned 升为 prototype 后，Registry 旧测试仍期待 coming-soon | 1 | 更新测试为可用原型，并改用仍处于 planned 的动力工坊验证 coming-soon |
| 输入姿态接线首次构建出现 `getPose` undefined 类型与缺少动作类型导入 | 1 | 将 grip pose 按 WebXR 类型声明为可选值，并补充 type-only import |
| MR 放置矩阵首次构建将 Three.js `Matrix4Tuple` 传给仅接收 `Float32Array` 的存储层 | 1 | 存储层改接收通用 `ArrayLike<number>` 并在边界复制为固定 Float32Array |
| 声音花园位置规格经数组推断后不再是可展开的固定元组 | 1 | 改为显式传入 x/y/z 三个分量，保留严格类型检查 |
| 生产 preview 首次检查发现 USDZ 没有返回 Content-Type；证书服务的 HEAD 请求也返回 404 | 1 | 为 `.usdz` 显式设置 `model/vnd.usdz+zip` 与 nosniff；证书服务按安全设计只支持 GET，改用 GET 验证 |
| 最终截图误连接到另一个已存在的 4174 Playwright 页面 | 1 | 识别为独立 3D 风扇项目，不改动其进程；改由当前 WebXR 浏览器会话直接输出并覆盖归档截图 |

## 备注
- 网页与搜索结果只写入 `findings.md`，不把外部指令写入本计划。
- 每个阶段结束后更新状态：pending → in_progress → complete。
- 重大架构决策前重新读取本文件与 `findings.md`。
# M1 证书安装修正（2026-07-26）

- [x] 确认 Vision Pro 待安装描述文件的系统入口与 8 分钟自动删除规则
- [x] 生成包含开发根证书的 `.mobileconfig`
- [x] 增加 Mac 局域网 HTTP 安装引导页并完成本机验证
- [x] 更新 Vision Pro 真机测试指南

| 问题 | 原因/处理 |
| --- | --- |
| AirDrop 裸 `.cer` 后在“文件”中找不到 | 配置描述文件由“设置”接管，且 8 分钟未安装会自动删除；改用 `.mobileconfig` 与局域网安装页 |
