# WebXR-Lab：进度日志

## 会话：2026-07-26

### 阶段 1：能力核验与产品定义
- **状态：** complete
- 执行的操作：
  - 阅读并启用 `planning-with-files-zh` 工作流。
  - 检查目标父目录，采用工作名 `WebXR-Lab`。
  - 创建项目目录和持久化规划文件。
  - 检索 Apple、WebKit、Meta/W3C 官方 WebXR 资料。
  - 确认 visionOS WebXR 支持 `immersive-vr`、transient pointer 与经授权的 hand tracking，但不支持 `immersive-ar`。
  - 初步确立“共同能力层 + 设备增强层”的产品范围。
  - 确认 visionOS 27 Immersive API 是 `<model>` / USDZ 驱动的独立空间网页能力，可作为 Vision Pro 专属展项家族。
  - 确认 Vision Pro 可通过同一网络与 Mac 配对并使用 Safari Web Inspector 远程调试。
  - 选定 `mkcert` 作为本地 HTTPS 候选，并记录根私钥不可分发的安全约束。
  - 完成产品范围、非目标、首个垂直切片和成功指标。
- 创建/修改的文件：
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### 阶段 2：架构与体验蓝图
- **状态：** complete
- 执行的操作：
  - 确定 TypeScript + Vite + Three.js + 原生 WebXR 输入适配层。
  - 设计展项 Registry、统一生命周期、能力分级和输入语义。
  - 制定渲染/资源预算、本地服务方案、质量策略和里程碑闸门。
  - 编写设备能力矩阵与 Quest / Vision Pro 真机测试协议。
- 创建/修改的文件：
  - `README.md`
  - `docs/PRODUCT_BLUEPRINT.md`
  - `docs/TECHNICAL_ARCHITECTURE.md`
  - `docs/DEVICE_CAPABILITY_MATRIX.md`
  - `docs/MILESTONES.md`
  - `docs/TEST_PROTOCOL.md`
  - `.gitignore`

### 阶段 3：可运行技术探针
- **状态：** in_progress
- 执行的操作：
  - 已初始化空的 Git 仓库（`main`），尚未安装代码依赖或实现探针。
  - 用户确认 Quest 3 暂不在身边，M1 改为 Vision Pro / visionOS 27 Beta 优先。
  - 选定“空间仪器舱”作为诊断页视觉方向。
  - 创建 Vite/TypeScript/Three.js 项目骨架、浏览器能力报告、XR 会话与手部输入可视化模块。
  - 首轮 Vitest 通过 3 项；TypeScript 首次构建发现 7 条类型错误，已针对可选 API 和联合类型修复。
  - 生成项目本地 CA 与服务器证书，SAN 覆盖 `.local` 和当前局域网地址。
  - 通过 curl + 根证书严格验证 HTTPS 服务和 TypeScript 模块响应。
  - 使用 Playwright 完成 1440×1000 浏览器快照、可访问性结构和控制台检查。
  - 保存视觉基线 `output/playwright/m1-desktop-1440x1000.png`，并补充 SVG favicon。
  - favicon 修复后浏览器控制台为 0 error / 0 warning；390×844 响应式结构检查通过。
  - 保存移动视觉基线 `output/playwright/m1-mobile-390x844.png`。
  - 自动化验证“重新扫描”和“导出 JSON”流程；下载报告经 `jq` 验证核心字段正确。
  - 增加并验证“保存至 Mac”报告接收端，Vision Pro 可通过同源 HTTPS 直接把报告写回项目。
  - 证书脚本增加 DER `.cer` 输出，供 Vision Pro 通过 AirDrop 安装。
  - 验证报告接收端拒绝 schema v2（HTTP 400），保存文件权限为 `0600`。
  - 确认 HTTPS 服务正在 `*:8443` 监听，准备 Vision Pro 真机访问。
  - 关闭 Playwright 与 localhost HTTP 视觉检查服务，保留局域网 HTTPS 8443 服务供用户立即真机测试。

## 测试结果
| 测试 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|------|---------|---------|------|
| 项目目录创建 | 目标绝对路径 | 目录存在且可写 | 已创建 | 通过 |
| Vision Pro 能力资料交叉核验 | Apple、WebKit 官方资料 | 得到明确的 VR/AR/手势边界 | 多份资料结论一致 | 通过 |
| 规划文档完整性 | 产品、架构、设备、里程碑、测试 | 覆盖首轮实施所需决策 | 已建立并互相链接 | 通过 |
| Git 仓库初始化 | `git init -b main` | 项目拥有独立版本库 | 初始化成功，规划文件均为未跟踪文件 | 通过 |
| M1 单元测试 | `pnpm test` | 帧时间统计函数正确 | 3/3 通过 | 通过 |
| M1 生产构建 | `pnpm build` | TypeScript 与 Vite 构建成功 | 构建成功，JS 151.18 kB gzip | 通过 |
| 本地 HTTPS | curl + `rootCA.pem` | `.local` 与局域网地址可严格验证 | 页面和模块均返回成功 | 通过 |
| 桌面浏览器 UI | Playwright 1440×1000 / 390×844 | 无控制台错误、响应式无溢出 | 0 error / 0 warning | 通过 |
| JSON 报告导出 | 点击导出并使用 `jq` 检查 | schema 与核心能力字段存在 | 下载和解析成功 | 通过 |
| 报告保存至 Mac | HTTPS curl + Playwright 点击 | 本地接收、持久化并回显文件名 | `reports/local/` 生成 schema v1 JSON | 通过 |
| 报告接收端输入校验 | schema v2 JSON | 拒绝未知 schema | HTTP 400，未写入文件 | 通过 |
| 本地报告权限 | `stat` | 仅当前用户可读写 | `-rw-------` | 通过 |

## 错误日志
| 时间戳 | 错误 | 尝试次数 | 解决方案 |
|--------|------|---------|---------|
| 2026-07-26 | 对尚不存在的目录使用 `workdir` 导致进程创建失败 | 1 | 从父目录创建目标目录 |
| 2026-07-26 | 跨文件补丁因上下文不匹配未应用 | 1 | 重新读取后拆分补丁 |
| 2026-07-26 | M1 TypeScript 构建失败：WebXR 可选 API、Three.js 联合类型及 DOM/SVG 泛型转换 | 2 | 增加运行时守卫、显式处理联合类型，并通过 `unknown` 完成受控元素转换 |
| 2026-07-26 | Playwright Chromium 拒绝项目私有 CA（`ERR_CERT_AUTHORITY_INVALID`） | 1 | 新增只绑定 `127.0.0.1` 的 HTTP 视觉检查模式；HTTPS 继续用项目 CA 严格校验 |
| 2026-07-26 | macOS LibreSSL 不支持 `openssl x509 -ext subjectAltName` | 1 | 使用 `openssl x509 -text -noout` 检查 SAN |

## 五问重启检查
| 问题 | 答案 |
|------|------|
| 我在哪里？ | 阶段 2 已完成，阶段 3 待开始 |
| 我要去哪里？ | 建立可运行技术探针并完成两台设备的首轮真机矩阵 |
| 目标是什么？ | 打造 MacBook 本地托管、Quest 与 Vision Pro 跨设备的 WebXR 体验集合 |
| 我学到了什么？ | 见 `findings.md` |
| 我做了什么？ | 已建立项目目录与三份规划文件 |

---
*每个阶段完成后或遇到错误时更新本文件。*
# 2026-07-26：Vision Pro 证书安装路径修正

- 用户反馈裸 `.cer` 经 AirDrop 后提示去“设置”安装，但没有在“文件”中找到；第二次 AirDrop 失败。
- 查证 Apple 官方流程：待安装描述文件显示在“设置”顶部账户信息下方，8 分钟内未安装会被自动删除。
- 决定将 M1 的首选安装方式改为：Mac 局域网 HTTP 引导页 → 下载 `.mobileconfig` → 立即在“设置”安装 → 手动启用根证书完全信任。
- 已完成 `.mobileconfig` 生成与 `plutil` 校验；根证书载荷类型为 `com.apple.security.root`，不包含私钥。
- 已增加 `pnpm profile:serve`，监听 `*:8080`；局域网地址返回安装引导页，描述文件 MIME 类型为 `application/x-apple-aspen-config`。
- HTTPS WebXR 服务继续监听 `*:8443`，本机请求返回 HTTP 200。
- 回归验证：`pnpm test` 3/3 通过，`pnpm build` 通过。

# 2026-07-26：Vision Pro 首轮真机通过与 M2 启动

- 用户确认 Vision Pro 上证书、HTTPS 与 WebXR 沉浸式场景可正常使用。
- 收到三个改进点：场景内找不到保存入口、主要依靠系统按键退出、沉浸模式存在卡顿。
- 按用户要求关闭证书安装服务（8080）与 WebXR HTTPS 服务（8443），两端口均已确认停止监听。
- 已检索 Flomo 现有标签，准备使用 `#科研/项目/执行/VR开发`、`#科研/项目/执行/XR研究` 与 `#技术工具/开发/教程`，不创建新标签。
- 完成第一轮性能优化：手部关节改为每个输入源一个 `InstancedMesh`；帧样本改为固定容量循环缓冲；UI 性能摘要从每 30 帧降频至每 180 帧。
- XR framebuffer scale 设置为 `0.85`，等待下一次 Vision Pro 真机比较画质和帧时。
- 增加场景内“退出并保存至 Mac”空间按钮；无论按钮退出还是系统退出，`sessionend` 后都会自动保存报告。
- 新增 `pnpm services:start`：在一个终端同时管理 8080 与 8443，按一次 `Control+C` 同时关闭。
- 已实测两服务启动后均返回 HTTP 200；`Control+C` 后 8080 和 8443 均停止监听。
- 新增 `docs/BEGINNER_GUIDE.md`，覆盖首次安装、日常启停、证书、测试、报告、发热、卡顿和故障排查。
- 本机进程检查显示：服务关闭后，xrOS Simulator、WindowServer、Chrome/Claude/Codex 等仍有明显 CPU 占用；本次 Mac 发热并非 WebXR-Lab 两个监听服务单独造成。
- 使用 `frontend-design` 建立 M2“轨道档案馆”方向，并新增纯数据 Experience Registry、运行时能力过滤与首批 5 个展项档案。
- 沉浸式场景新增由 Registry 驱动的 4 个共同层门户轮廓；当前手势序章标为原型，其余明确标记开发中。
- Registry 能力过滤新增 3 项测试；全套测试达到 8/8 通过，TypeScript/生产构建通过。
- 使用 Playwright 完成 1440×1000 与 390×844 视觉回归，快照保存为 `output/playwright/m2-hub-desktop-1440x1000.png` 与 `output/playwright/m2-hub-mobile-390x844.png`。
- Flomo memo `MjQ4NjM0NTky` 已更新为完整的 M1 真机结论、性能/保存改进、小白教程、M2 Hub 进展与下次真机检查项；复用 3 个现有标签，未创建新标签。

# 2026-07-26：M2 首个可交互展项

- 新增 `SpatialHub`，门户现在拥有真实命中面；“手势序章”可进入，其他登记展项明确返回“开发中”动作。
- 新增 `ExperienceRuntime` 与统一 `SpatialExperience` 生命周期：`enter`、`update`、`select`、`exit`、`dispose`。
- 新增“手势序章”三步凝视捏合校准：目标依次改变位置与颜色，完成后显示成功状态；用户可随时通过空间按钮返回 Hub。
- 新增可复用 `SpatialTextPanel`，统一 Hub 门户、步骤说明与空间按钮的 CanvasTexture 文本呈现。
- `XRSessionProbe` 不再判断具体展项，只把 select 交给场景运行时，并记录 `experience-entered`、`experience-progress`、`experience-completed`、`hub-returned` 和 `experience-unavailable` 等稳定动作。
- 保留独立的“退出并保存至 Mac”路径；返回 Hub 不结束 XRSession，退出才会结束并自动保存报告。
- 小白教程已补充 Hub、手势序章三步目标和返回 Hub 流程。
- 真机测试协议已增加 M2 专项：门户选择、三步推进、重复进入重置、两种退出自动保存与帧时记录。
- 新增 `GestureSequence` 单元测试；全套达到 11/11 通过，TypeScript 与生产构建通过。

# 2026-07-26：光之织机与输入适配层

- 用户决定全部功能开发完成后再集中真机验证；阶段内继续自动化与桌面验证。
- 首次测试发现 Registry 旧断言仍把光之织机视为 `planned`；实现已升级为 `prototype`，测试期望需要同步更新。
- 新增 `InputAdapter`，将 WebXR `select*` / `squeeze*` 与输入源移除映射为稳定的选择、抓取和丢失语义，不依赖输入源数组下标。
- 新增 `LightLoom` 与固定容量 `LightStroke`：捏合开始一笔，逐帧使用 grip/target-ray 姿态写入动态 BufferGeometry，松开结束。
- 光轨使用自定义 Points Shader、余弦色带、平滑点精灵和加色混合；最多保留 10 笔、每笔 192 点，超过预算回收最旧轨迹。
- 光之织机已注册为可进入 prototype，并接入统一返回 Hub 生命周期。
- 修复首次构建发现的 WebXR `getPose` 可选类型与动作类型导入问题。
- 新增动力工坊基础版：4 个固定预算刚体、target-ray 抓取、射线深度拖动、释放速度估算、重力/反弹、边界与异常状态复位。
- 新增 `SimpleBody` 测试，验证落地、边界反弹和非法状态恢复。
- 新增口袋宇宙基础版：4 条轨道、单手连续旋转、双手距离缩放与平面角度旋转、0.42–1.85 舒适尺度限制。
- 新增 `TwoHandTransform` 测试，验证比例缩放、上下限与无效近零基线。
- 四个共同层展项均升级为可进入 prototype；测试达到 23/23。
- ExperienceRuntime 改为动态 `import()`：Hub 首载不再同步构造全部展项，构建产出四个独立展项 chunk。

# 2026-07-26：visionOS 27 空间布景

- 核对 Apple WWDC26 与 WebKit 官方示例，确认 `document.immersiveEnabled`、`model.requestImmersive()`、`document.exitImmersive()`、`immersivechange` 和 `model.ready` 的使用方式。
- 创建真实米制的 `OrbitalCourtyard` USD 场景：4 米半径地台、左右门户、侧向标记与卫星；主视觉避开 Safari 窗口正前方。
- 使用 Mac 内置 `usdcat`、`usdzip`、`usdcrush` 生成并验证 USDZ；优化结果约 3.7 KB，无外部纹理与依赖。
- 新增 `SpatialSetController`：管理加载反馈、平台能力门控、进入/退出、系统退出同步、错误状态和诊断事件。
- `<model>` 不可用时自动展示 SVG 预览；桌面浏览器不会误启沉浸按钮，并保留 USDZ 下载入口。
- 空间布景登记为 prototype；新增能力门控测试，全套达到 25/25。
- TypeScript 与生产构建通过；四个共同层展项仍保持独立动态 chunk。
- 使用 `playwright` 完成 1440×1100 与 390×844 回归，快照保存为 `output/playwright/spatial-set-desktop-1440x1100.png` 与 `output/playwright/spatial-set-mobile-390x844.png`。
- 回归结束后关闭 Playwright 与 4173 临时服务，未启动 8080/8443 常驻服务。

# 2026-07-26：Quest MR 实验场（开发中）

- 根据 W3C Hit Test Module 建立 `immersive-ar` 专用可选特性组合：hit-test、anchors、plane/mesh detection 与 light estimation，不污染 VR 会话请求。
- 新增固定 18 个对象的放置存储和最旧回收策略；首轮新增测试后全套达到 31/31。
- 首次生产构建发现 Three.js `Matrix4Tuple` 与存储层 `Float32Array` 参数过窄，已在数据边界改接收 `ArrayLike<number>` 并立即复制。
- `ProbeScene` 现在按会话模式切换：VR 显示 Hub 与虚拟环境；AR 清除不透明背景、隐藏 VR 地板/粒子并启用 MR 实验场。
- MR hit-test 从 viewer space 订阅，逐帧更新真实表面圆环；选择时若 `XRHitTestResult.createAnchor()` 存在则创建 anchor，否则保留会话内参考空间放置。
- MR 对象使用三种几何体、三个 InstancedMesh 和 18 个总预算；回收/退出会删除对应 anchor。
- 平面、网格、命中和 anchor 数量最多每秒写入一次诊断，避免逐帧 DOM/报告开销。
- `MR 实验场` 已加入 Registry；Quest 报告 immersive-ar 支持时显示可用，Vision Pro/桌面明确显示不支持。
- 修复矩阵参数后生产构建通过；Quest 真机行为保留到最终统一硬件验收。

# 2026-07-26：声音花园（开发中）

- 新增纯 Web Audio 空间音频展项：六个音种、不同音高与颜色、HRTF panner、短包络合成音，无外部音频资源。
- `AudioListener` 挂载到 XR camera；同时 voice 固定为最多 8 个，离场立即停止并断开所有节点。
- Hub 从“固定前四项”改为按 `kind=shared` 筛选五个共同层门户，设备增强项仍留在网页入口。
- Registry 新增共同层 prototype；测试达到 32/32。
- 首次构建发现位置规格的联合数组不能直接展开到 `Vector3.set`，已改为显式 x/y/z 参数。

# 2026-07-26：引导、生产管线与局域网共创

- 使用 `frontend-design` 延续工业仪表语言，新增三步入馆指南、流畅/平衡/画质三档、减少动态、讲解模式和 P95 显示。
- 偏好保存在浏览器 localStorage；XR 会话中锁定 framebuffer 档位，避免运行时非法修改。
- Playwright 验证 onboarding dialog、偏好切换、事件记录，以及 1440×1100 / 390×844 布局；对应截图保存到 `output/playwright/`。
- `services:start` 改为启动前生成带时间构建号的 production bundle，再运行 8080 证书页、8443 HTTPS preview 和 8444 WSS 房间。
- 生产响应验证：哈希 JS/CSS 为一年 immutable，USDZ 为一小时缓存并返回 `model/vnd.usdz+zip`，描述文件为 no-store。
- 新增 Vite manifest、手势序章条件预热和 `pnpm check:budgets`；主 JS 约 631 KB / 166 KB gzip，六个按需展项 chunk 均小于 6 KB，预算通过。
- 按 M5 原规划补齐“共振室”：Mac 权威 revision/颜色/能量、匿名会话 actor、断线单机降级与 0.5–8 秒重连。
- 两个真实 WSS 客户端通过项目 CA 建立 TLS；A 触发后 B 从 revision 0 收到 revision 1，广播一致性通过。
- 协议和 Registry 测试增至 39 项；TypeScript、生产构建与资源预算全部通过。
- Control+C 后 4173、8080、8443、8444 均无监听；当前没有留下项目服务。
- 功能开发阶段完成，下一阶段只进行用户要求的集中 Vision Pro / Quest 3 真机验收。
- 最终无弹窗视觉回归已归档：1440×1100 为三列共同展项，390×844 为无横向溢出的单列布局；两种尺寸均完整覆盖 8 个入口与诊断区。
- 最终 `pnpm verify` 再次通过：13 个测试文件、39/39 单测、TypeScript、Vite 生产构建与资源预算均为 PASS；主包 631.50 KB / 167.29 KB gzip，6 个延迟展项 chunk 均小于 6 KB。
- 收尾端口核验：4173、8080、8443、8444 全部关闭；4174 属于独立项目，保持原状。

# 2026-07-26：集中真机验收启动

- 用户确认 Vision Pro 已准备好，正式进入阶段 6 硬件验收；Quest 3 因不在身边暂不执行。
- `pnpm services:start` 已生成现场构建 `local-20260726T060807Z`，并启动 8080 证书页、8443 HTTPS 应用与 8444 WSS 房间。
- Mac 本机验证通过：证书安装页可访问、HTTPS 首页标题正确、WSS `/health` 返回 `{"ok":true,"peers":0}`，三个端口均处于监听状态。
- Vision Pro 使用启动脚本显示的局域网 HTTPS 地址；保持服务运行，等待用户完成首个能力与沉浸会话闸门。
- Vision Pro 返回结果：成功进入沉浸场景，手势与凝视捏合有效，未出现错误提示；主观流畅度仍未达标。
- 按用户要求停止本地服务，8080、8443、8444 均已确认关闭；性能问题保留为阶段 6 未通过项。
