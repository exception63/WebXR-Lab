# WebXR-Lab：发现与决策

## 用户需求
- 项目建立在用户指定的本地同步目录下。
- 目标是打造类似经典 VR 应用 The Lab 的 WebXR 展示型应用，全面呈现 VR 与 AR 在视觉、交互等方面的可能性。
- 目标设备为 Meta Quest 与 Apple Vision Pro（visionOS 27），两者都应充分利用手势/手部输入。
- 不购买云服务器；开发、静态资源、调试和可选的实时服务均由当前 MacBook 承担。
- 用户拥有 Vision Pro，可进行真机测试。
- 用户确认 Quest 设备为 Meta Quest 3，但目前不在身边。
- 当前优先设备为 Apple Vision Pro，运行 visionOS 27 Beta；M1 先完成该设备的探针和真机路径。

## 初步产品原则
- **一个 Hub，多组展项：** 通过统一空间入口进入彼此独立、可增量扩展的小型体验。
- **共同语义，不强求共同实现：** “指向、抓取、捏合、拖动、双手缩放、菜单”等语义统一，底层按设备能力映射。
- **以真机事实为准：** 浏览器声称支持 WebXR 不等于所有会话模式和可选特性都可用。
- **零云依赖：** 默认在同一局域网通过 MacBook 的 HTTPS 服务访问；单机体验不依赖互联网。
- **渐进增强：** 没有沉浸式会话时仍提供桌面预览、设备诊断和展项说明。

## 待研究
- Safari 27 的“immersive website environments”与 WebXR 的关系及可编程边界。
- Meta Quest Browser 对 Layers、hit-test、anchors、plane/mesh detection 等相关扩展的当前支持信息。
- 本地 CA、HTTPS、局域网服务发现与头显证书信任的可行路径。
- 跨设备 3D 引擎及 WebXR 抽象层的取舍。

## 官方能力核验（2026-07-26）

### Apple Vision Pro / visionOS 27
- Apple 的 WWDC24 官方资料说明：Safari on visionOS 支持 WebXR `immersive-vr`，进入会话需要 HTTPS 和用户主动操作。
- Vision Pro 的默认自然输入是凝视 + 捏合，在 WebXR 中以 `targetRayMode = "transient-pointer"` 暴露。输入源只在捏合期间存在；`targetRaySpace` 表示用户开始捏合时的凝视目标，后续随手移动；`gripSpace` 表示捏合位置。
- 请求可选特性 `hand-tracking` 并获得授权后，可持续取得两只手的关节数据。关节输入本身不触发 `select` 事件，选择事件仍来自 transient pointer，因此输入适配层必须同时处理两种来源，不能固定读取 `inputSources[0]` 与 `[1]`。
- 2026 年 WebKit 的官方变更与缺陷记录明确表明：visionOS 不支持 WebXR `immersive-ar`；一度错误返回支持的行为已修复，并从公开设置中移除了会造成误解的 AR 开关。
- Safari 27 新增“immersive website environments”，但它不是 WebXR `immersive-ar`：它围绕 HTML `<model>`、USDZ 与 `requestImmersive()` 工作，模型环境出现在 Safari 窗口周围，网页窗口仍然保留。
- 该 Immersive API 适合加入 Vision Pro 专属的“空间网页环境”展项：可做内联预览→进入真实尺度环境、动画触发、视频停靠和空间照片展示。它由系统负责呈现，不等价于 WebGL/WebXR 中可自由编程的 MR 合成。
- visionOS 27 的 immersive website environment 坐标原点在用户脚下、使用真实世界比例；环境从 Safari 窗口后方展开，用户可随时通过 Digital Crown 退出。

### Meta Quest
- W3C WebXR Hand Input 定义通过会话特性 `hand-tracking` 暴露 `XRInputSource.hand` 与手部关节。
- Meta 官方维护的 Immersive Web Emulation Runtime（IWER）可在桌面模拟 Quest 的头显、控制器、手部、捏合及部分 WebXR 可选特性，适合纳入开发测试，但不能替代真机。
- Meta 官方原生文档确认 Quest 具备透视相机能力；但 WebXR 的原始相机访问仍需逐项真机核验，不能把原生 SDK 能力等同于浏览器能力。
- 公开资料长期显示 Quest Browser 支持 WebXR 沉浸式 VR、手部输入与 passthrough MR；精确扩展矩阵仍应由技术探针在目标 Quest 真机上生成。

### 对产品范围的影响
- **共同层（Quest + Vision Pro）：** `immersive-vr`、头部六自由度、凝视/射线选择、抓取语义、双手关节驱动的实验、空间音频、3D UI 与视觉渲染展项。
- **Quest 增强层：** `immersive-ar` passthrough、hit-test、anchors、平面/网格等经运行时验证可用的 MR 展项。
- **Vision Pro 增强层：** transient-pointer 自然输入、凝视意图 + 手部运动结合的交互，以及基于 `<model>` / USDZ / `requestImmersive()` 的空间网页环境。
- Hub 应按实际能力展示展项；不支持的展项应给出原因与另一设备上的演示说明，而不是尝试失败后才报错。

## 技术决策
| 决策 | 理由 |
|------|------|
| 暂不锁定 Three.js、Babylon.js 或其他引擎 | 先以官方能力与真机探针消除最大的不确定性 |
| 采用展项清单（manifest）与统一生命周期 | 便于按能力过滤、懒加载、独立测试和持续扩展 |
| 建立 Input Adapter | 将手、控制器、凝视/捏合、鼠标键盘映射为统一动作语义 |
| 将展项分为共同层与设备增强层 | visionOS 当前不支持 WebXR `immersive-ar`，无法让所有 MR 能力完全对称 |
| Vision Pro 同时监听 transient pointer 与 persistent hand tracking | 两者分别承担选择事件与持续手部姿态，且输入源索引并不固定 |
| 把 Safari 27 Immersive API 作为独立展项家族，而非 WebXR AR 兼容层 | 该 API 是 `<model>` 驱动的系统环境呈现，能力模型和 WebXR 不同 |
| 首版采用 TypeScript + Vite + Three.js，不使用 React 作为 XR 帧循环抽象 | 需要直接处理 XRSession、动态输入源和资源生命周期，同时保持展项模块轻量 |
| WebGL2 作为共同基线，WebGPU 仅作为后续实验展项 | 不把尚未形成跨设备稳定沉浸式基线的能力放进核心路径 |
| 物理与大型能力按展项懒加载 | 控制 Hub 首载、WASM 成本和内存峰值 |

## 本机开发环境
- Node.js `v22.22.3`
- pnpm `11.9.0`
- npm `10.9.8`
- Git `2.54.0`
- Mac Bonjour 主机名由启动脚本动态显示，不写死在公开仓库。
- `mkcert` 当前未安装，将在阶段 3 安装/配置或提供等价的本地证书方案。

## M1 实施方向
- 先实现通用安全上下文、WebGL、WebXR 会话模式与 Safari 27 Immersive API 探测。
- Vision Pro WebXR 会话同时请求 `hand-tracking` 等可选特性，动态记录 transient pointer、persistent hands、事件顺序和关节数据。
- Quest 3 使用同一探针与报告格式，当前不阻塞 Vision Pro 开发。

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 项目最终品牌名尚未确定 | 工作名与包名使用 `WebXR-Lab`，保留后续重命名空间 |

## 资源
- Apple WWDC24：Build immersive web experiences with WebXR  
  https://developer.apple.com/videos/play/wwdc2024/10066/
- WebKit：Introducing Natural Input for WebXR in Apple Vision Pro  
  https://webkit.org/blog/15162/introducing-natural-input-for-webxr-in-apple-vision-pro/
- Safari 27 Beta Release Notes  
  https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes
- Apple WWDC26：Explore immersive website environments in visionOS  
  https://developer.apple.com/videos/play/wwdc2026/320/
- Apple：Inspecting visionOS  
  https://developer.apple.com/documentation/safari-developer-tools/inspecting-visionos
- WebKit commit：Remove “WebXR Augmented Reality Module” option on visionOS  
  https://commits.webkit.org/313648@main
- WebKit bug 305459：visionOS 错误报告 `immersive-ar` 支持  
  https://bugs.webkit.org/show_bug.cgi?id=305459
- W3C WebXR Hand Input Module  
  https://www.w3.org/TR/webxr-hand-input-1/
- Meta Immersive Web Emulation Runtime  
  https://meta-quest.github.io/immersive-web-emulation-runtime/
- mkcert（开发用本地 CA）  
  https://github.com/FiloSottile/mkcert
- Apple Support：Trust manually installed certificate profiles in iOS, iPadOS and visionOS  
  https://support.apple.com/en-gb/102390

## 视觉/浏览器发现
- Apple 官方检索结果一致支持 `immersive-vr`、transient pointer 和授权后的持续手部关节数据。
- WebKit 2026 年提交明确写明 visionOS “no AR support”，因此不能把 Safari 27 的空间网页环境误读为 WebXR `immersive-ar`。
- Meta 的公开 WebXR 文档索引较分散，必须以目标 Quest Browser 上的自动能力报告补足精确矩阵。
- Apple 官方支持让 Mac 与 Vision Pro 在同一支持 Bonjour 的网络中无线配对，并通过 Mac Safari 的 Develop 菜单检查 Vision Pro 中的网页、Service Worker 与应用内网页。
- `mkcert` 可在 Mac 上生成本地 CA 和带局域网主机名/IP SAN 的证书；移动设备必须另行安装并信任根证书。只能分发 `rootCA.pem`，绝不能分发 `rootCA-key.pem`。
- M1 使用项目自建本地 CA 成功签发服务器证书，SAN 覆盖当前 Mac 的 `.local` 主机名、局域网 IP、`localhost` 与回环地址；curl 使用 `rootCA.pem` 可严格验证并访问 Vite HTTPS 服务。
- 桌面 Chromium 在 localhost 安全上下文中报告 `navigator.xr` 存在，但 `immersive-vr` / `immersive-ar` 均不支持；诊断页正确区分“API 存在”和“会话模式可用”。
- 1440×1000 桌面截图显示“空间仪器舱”视觉层级清晰：品牌/任务、主标题、系统就绪度、会话按钮与能力矩阵均在首屏可见，中央 Three.js 核心没有遮挡文本。
- Playwright 首次检查的唯一控制台错误是缺少 `/favicon.ico`；已添加项目 SVG favicon。
- 添加 favicon 并重载后，Playwright 控制台为 0 error / 0 warning。
- 390×844 响应式检查中页面切换为单列，没有水平溢出，主标题、系统就绪度和会话发射台保持清晰层级；Playwright 在改变视口时保留了 `scrollY=28`，导致首次移动截图顶部轻微裁切，元素布局本身未越界。
- 重置滚动位置后的 390×844 最终截图确认顶栏、标题、3D 核心和系统就绪度完整显示；移动端基线已保存。
- Playwright 点击“重新扫描”后能力矩阵和事件日志正常刷新；点击“导出 JSON”成功下载符合 `schemaVersion: 1` 的报告，包含安全上下文、WebXR 模式、Spatial Web 检测与事件记录，控制台仍为 0 error / 0 warning。
- Apple 官方确认 Apple Vision Pro 可手动接收并安装证书；手动安装的根证书不会自动获得 SSL/TLS 信任，必须在 `Settings > General > About > Certificate Trust Settings` 中开启 full trust。
- 为降低 Vision Pro 安装摩擦，M1 证书脚本除 PEM 外还生成 Apple 支持的 DER `.cer` 安装文件；根私钥仍只留在 Mac。
- M1 增加同源 `POST /api/reports` 接收端，限制为 1 MB 且只接受 `schemaVersion: 1` 报告；文件以 `0600` 权限保存在被 Git 忽略的 `reports/local/`。
- HTTPS curl 与 Playwright 页面按钮均已验证“保存至 Mac”；页面提示文件名、事件日志记录保存事件，接收端生成的 JSON 可正常解析。
- macOS LibreSSL 默认把 CA serial 文件落到当前工作目录；证书脚本已显式指定 `.certs/rootCA.srl`，并忽略所有 `.srl` 生成物。

---
*每执行 2 次查看/浏览器/搜索操作后更新此文件。*
# Vision Pro 证书安装补充（2026-07-26）

- 真机现象：首次通过 AirDrop 发送根证书后，Vision Pro 提示前往“设置”安装，但用户在“文件”中未找到；再次 AirDrop 同一文件失败，而发送到 iPhone 成功。
- Apple 官方说明：在 iOS、iPadOS 和 visionOS 下载配置描述文件后，应在“设置”账户信息下方点按“已下载描述文件（Profile Downloaded）”并安装；若 8 分钟内没有安装，系统会自动删除待安装描述文件。
- Apple 的配置描述文件规范使用 `.mobileconfig` 扩展名。M1 改为生成包含公开根证书的 `.mobileconfig`，并通过 Mac 局域网 HTTP 引导页分发；不再把裸 `.cer` AirDrop 作为首选路径。
- 描述文件安装与根证书“完全信任”是两个步骤：安装后仍需进入“设置 > 通用 > 关于本机 > 证书信任设置”启用完全信任。
- 参考：
  - https://support.apple.com/en-ie/102400
  - https://support.apple.com/guide/deployment/intro-to-device-management-profiles-depc0aadd3fe/web
  - https://support.apple.com/en-gb/102390

# Vision Pro 首轮真机反馈（2026-07-26）

- HTTPS、证书与 Vision Pro WebXR 沉浸式会话已由用户真机确认“完全可以用”，M1 的 Vision Pro 启动链路通过。
- 用户通过 Vision Pro 的系统按键退出场景，说明系统级退出路径有效；但场景内缺少清晰可发现的“退出并查看报告”入口。
- 用户没有找到“保存至 Mac”按钮。当前按钮位于退出沉浸模式后的普通网页，因此需要在场景中明确提示“先退出，再保存”，并在退出后把保存动作提升为醒目的主操作。
- 真机场景存在卡顿。优先排查：双眼高像素密度渲染成本、每帧手部关节矩阵/对象更新、事件日志与 DOM 更新频率、像素比和抗锯齿设置；不能仅凭 Mac 发热断言服务本身是原因。
- 8080 与 8443 服务已按用户要求在测试结束后关闭。
- Flomo 现有可复用标签包括 `#科研/项目/执行/VR开发`、`#科研/项目/执行/XR研究`、`#技术工具/开发/教程`；不需要创建新标签。

## 卡顿代码审计

- 当前每只手的每个关节都创建一个独立 `Mesh` 和一份独立球体几何体；双手约 50 个关节会带来约 50 次额外 draw call，并增加对象遍历和 GPU 资源数量。应改为每个输入源一个 `InstancedMesh`。
- `ReportStore.recordFrame()` 每帧都会对最多 1800 项数组执行 `slice()`，持续分配新数组；应改成固定容量循环缓冲区。
- 当前每 30 帧触发一次完整报告 `structuredClone` 和整页 DOM 重绘。在沉浸模式下页面不可见但主线程仍承担开销；应降低到约每 180 帧一次，并只把性能摘要低频推送给 UI。
- XR 渲染使用 `antialias: true`、最大 2 倍像素比，且没有设置 XR framebuffer scale。Vision Pro 双眼高分辨率下应先采用保守的 XR framebuffer scale，并保留真机报告来比较画质与帧时。
- 保存按钮目前位于页面靠后的局域网卡片中。下一版本应在任何 XR 退出（场景按钮或系统按键）后自动保存报告，并在场景内增加“退出并保存至 Mac”目标。
- M2 依照现有里程碑，先完成共同层基础设施：退出/返回语义、Input Adapter/Registry 与性能闸门，再扩展展项。

## M2 Hub 设计方向

- 产品蓝图把 WebXR-Lab 定义为“可以亲手进入的空间网页博物馆”，因此 Hub 的记忆点应是围绕能力核心排列的“轨道档案/展项门户”，而不是常规卡片商城。
- 桌面页保留现有“空间仪器舱”视觉语言，在能力探针上方或之后增加策展式展项目录；展项状态明确分为可进入、开发中、设备增强和不支持。
- 代码层先建立纯数据 `ExperienceRegistry` 与能力过滤，不依据 User-Agent。首批登记：手势序章、光之织机、动力工坊、口袋宇宙、Vision Pro 空间布景。
- 沉浸式场景先呈现轻量门户标记与能力核心，保持低 draw-call；后续再把每个门户绑定独立生命周期。
- 本阶段遵循 `frontend-design` 的方向选择：工业测量仪表 + 编辑式博物馆索引，薄荷为共同能力、琥珀为 Vision Pro 增强、冷蓝为视觉实验；避免通用 SaaS 卡片感。

## M2 Hub 浏览器回归

- Playwright 首次可访问性快照确认新增“空间实验馆”区域拥有独立 region、二级标题、5 个 article 展项以及清晰的设备/时长/舒适度/状态文本。
- 桌面 Chromium 不支持 immersive-vr，因此 Registry 正确把共同层展项标记为“当前设备不支持”；这证明能力过滤没有把普通桌面误判成头显。
- 原有能力矩阵、输入信号、本机链路与保存/导出操作仍在 Hub 区域之后完整存在。
- 1440×1000 视觉检查显示，轨道档案馆标题与 3 列展项建立了明确的第二章节，仍与原有能力核心、细网格和仪器字体保持一致；首屏能看到前三个展项的身份和状态。
- 390×844 窄屏检查显示没有水平溢出，标题、能力球体、就绪度与 Hub 章节按顺序进入视口；展项卡在后续滚动区域，不压缩首屏诊断信息。

## M2 首个可交互垂直切片

- 当前 `ProbeScene` 直接构造门户，但门户没有命中对象、加载行为或独立生命周期；`XRSessionProbe` 只识别退出按钮。
- 下一实现单元确定为“Hub → 手势序章 → 返回 Hub”，以此打通 Registry 到运行时的最后一段，而不是直接开始更重的粒子/物理展项。
- 运行时需要稳定的动作结果，不让 `XRSessionProbe` 了解具体展项业务：场景层返回 `exit-save`、`experience-entered`、`experience-progress`、`experience-completed`、`hub-returned` 或 `unavailable`。
- 手势序章采用三次凝视捏合校准：目标依次改变空间位置与颜色；每次命中推进一步，完成后显示返回 Hub。它能直接验证 Vision Pro transient pointer，也能映射 Quest 手势/控制器 select。
- 入口和返回按钮继续采用低成本 CanvasTexture 平面；交互目标使用简单几何体，避免在性能尚未真机签字前引入大型资源或后处理。

## M2 运行时实施结果

- `ExperienceRuntime` 成为 Hub 与展项之间的唯一切换点；`XRSessionProbe` 只提供 target-ray select，不导入或识别任何具体展项。
- 首个展项模块 `GesturePrologue` 已实现独立生命周期与可重复进入：每次 `enter()` 都重置三步序列，`exit()` 隐藏自身但不结束 XRSession。
- 返回 Hub 与退出应用被分成两个明确语义：前者保持沉浸会话，后者结束会话并触发 Mac 自动保存。
- 未完成门户仍可产生可解释的 `experience-unavailable` 事件，但不会进入空场景。
- 三步状态机独立于 Three.js，可在 Node/Vitest 中验证完成、上限和重复进入重置行为。

## 开发完成后集中真机验证（用户决策）

- 用户明确要求：先继续完成规划中的开发，再统一进入真机验证；后续小阶段不再等待 Vision Pro 签字。
- 开发期间继续执行单元测试、TypeScript 构建、桌面视觉回归和静态资源预算检查；Vision Pro / Quest 的未验证项保留为最终硬件验收闸门，不伪装成已通过。

## 光之织机实现策略

- `shader-dev` 路由到 particle-system、color-palette 与 WebGL pitfalls；为共同层采用 CPU 记录手势轨迹 + GPU 单次 Points 绘制，不引入 framebuffer ping-pong、全屏 bloom 或设备专属扩展。
- 每条光轨使用固定容量动态 `BufferGeometry`，避免每帧创建对象；限制同时保留的轨迹数量，超过预算时回收最旧轨迹。
- 位置优先使用 `gripSpace`（捏合点），不存在时使用 target ray 前方的保守投影点，使 Vision Pro transient pointer、Quest 手势和控制器都能映射。
- Shader 使用明确 `main()`、缓存 uniform、加色混合、平滑点精灵与余弦色带；亮度使用受控 alpha，避免多粒子累积洗白。
- 输入层增加设备无关语义：`select-start`、`select-end`、`grab-start`、`grab-end` 与 `source-lost`；展项不读取 XRInputSource 索引或设备名称。

## 动力工坊基础版策略

- 不在首个物理切片引入大型 WASM 物理引擎；先用固定数量刚体、半隐式 Euler、地面/边界碰撞和阻尼验证抓取生命周期。
- 抓取对象通过最新 target ray 选中，随后沿射线保持初始深度；释放速度由最近两次姿态位置与时间差估算。
- 物理状态与 Three.js Mesh 分离为可单测 `SimpleBody`，后续如切换 Rapier，不改变展项输入语义和生命周期。
- 对象掉出安全范围时自动复位，保证演示无法因一次错误抛掷而永久失去内容。

## 口袋宇宙基础版策略

- 单手捏合使用连续 grip 位置差驱动微缩宇宙旋转；双手同时捏合使用两捏合点距离比驱动统一缩放。
- 双手基线在第二个输入源拥有有效姿态后建立，避免事件先于首个 XRFrame 时出现无效距离。
- 缩放限制在舒适范围内，追踪丢失或任一手松开时清除双手基线，不延续陈旧变换。
- 行星运动与用户变换分层：轨道动画更新局部行星位置，用户只操纵外层宇宙组，避免两套旋转相互覆盖。

## 共同层四展项实施结果

- 手势序章、光之织机、动力工坊与口袋宇宙均使用同一 Registry、生命周期、返回 Hub 和输入语义。
- 输入姿态每帧携带稳定 sourceId、时间、target ray 与可选 grip；展项不读取设备名称。
- 物理与双手变换核心均可在无头 Node 测试中验证，渲染外壳保持 Three.js 隔离。
- 动态 import 已把四个展项拆为独立构建 chunk；主包剩余体积主要来自 Three.js 核心，后续应通过依赖粒度或构建策略继续优化，而不是把展项重新合并。

## visionOS 27 空间网页接口核对（2026-07-26）

- Apple WWDC26 明确：沉浸网页环境由原生 HTML `<model>` 元素承载，调用模型元素的 `requestImmersive()` 进入；调用必须直接响应用户操作。
- 应以浏览器实际能力而不是 UA 字符串判断支持情况；同时监听 `immersivechange` / 错误事件，并始终提供清晰的退出入口。用户也可通过 Vision Pro Digital Crown 退出，因此页面状态必须由事件同步。
- 内联模型和沉浸模型使用不同参考系：内联以元素中心和 CSS 比例呈现，沉浸时以用户脚下为原点、使用真实世界尺度；环境主视觉需避开 Safari 窗口所在方向。
- `<model>` 支持在元素内部放图片作为旧浏览器回退。当前项目还将保留 Three.js 实时预览，使 Chrome、Quest Browser 和旧版 Safari 仍可了解展项。
- 官方建议首选 USDZ，并在发布前用 `usdcrush` 优化；本地开发先生成极简、无外部纹理的空间环境，避免设备下载和解码压力。
- 官方资料：
  - https://developer.apple.com/videos/play/wwdc2026/320/
  - https://developer.apple.com/videos/play/wwdc2026/215/
  - https://webkit.org/demos/model-demos/index.html

## 空间布景接入点

- 浏览器能力探针已经分别记录 `modelElement` 与 `requestImmersive`，无需新增 UA 判断；Registry 也已有 `spatial-set` 清单项。
- 当前展项目录只渲染状态文本，尚无网页型展项的专用动作区；空间布景应在该卡片内挂载原生 `<model>`、WebGL/静态回退和进入/退出按钮，而不是塞进 WebXR Hub 的四个共同层门户。
- WebXR Hub 只展示前四个共同层展项，这与空间布景由 Safari 网页层启动的产品边界一致。
- WebKit 官方示例使用 `document.immersiveEnabled` 做入口门控、`document.immersiveElement` 读取当前状态、`model.requestImmersive()` 进入、`document.exitImmersive()` 退出；`model.ready` 是加载 Promise，状态变化由模型元素上的 `immersivechange` 事件驱动。
- 当前 Mac 已安装 `/usr/bin/usdzip`、`usdcat`、`usdcrush`、`usdrecord`，同时有 Blender；可以在本机从文本 USD 生成和检查 USDZ，无需购买或调用外部资产服务。
- 空间布景卡片的实现将复用现有能力报告和 Registry；补一个专用 Controller 管理模型加载、沉浸状态、事件记录与按钮，不把平台 API 逻辑散落到主页渲染函数。
- 首个空间环境 `OrbitalCourtyard` 已按 Y-up、1 米单位创建，包含 4 米半径地台、左右两座门户、侧向标记和少量卫星；焦点刻意分布在 Safari 窗口两侧。
- USD 源能被 `usdcat` 正常解析，`usdzip` 生成 8.2 KB USDZ，`usdcrush` 优化后约 3.7 KB 且仍可被 `usdcat` 展开；当前没有外部纹理依赖。
- 优化后的 USDZ 包内只有一个 3.7 KB 的 USDC 根层，没有散落依赖；单元测试增至 25/25，TypeScript 与生产构建通过。
- 临时桌面回归服务只绑定 `127.0.0.1:4173`；开始检查前 8080 与 8443 均未监听。
- Chromium 可访问性快照确认：空间布景拥有独立模型语义、替代图、加载说明、禁用的沉浸按钮与可下载 USDZ；不支持 `<model>` 时静态预览正常出现，没有把桌面误判为 visionOS 27。
- 1440×1100 全页视觉检查显示空间布景横跨整行，预览与展项说明保持清晰层级；390×844 下转为单列，没有水平溢出，按钮与下载链接仍可辨认。
- Playwright 浏览器和 4173 临时服务已在回归后主动关闭。

## Quest MR / WebXR Hit Test 实现边界

- W3C Hit Test Module 将 `hit-test` 定义为 WebXR 会话特性；会话中先取得 `viewer` reference space，再通过 `session.requestHitTestSource({ space })` 订阅，逐帧用 `frame.getHitTestResults(source)` 获取结果，并把首个结果相对应用 reference space 的 pose 用作放置矩阵。
- Hit test 是真实环境几何与理想射线的交点，不包含应用内虚拟物体；退出会话时必须 `cancel()` 订阅。
- 该能力只能在安全上下文、允许 `xr-spatial-tracking` 策略且设备原生支持时使用。项目继续以 `isSessionSupported("immersive-ar")` 门控入口，hit-test 作为会话内二级能力记录，不从 UA 推断。
- MR 采用透视优先渲染：进入 `immersive-ar` 时隐藏不透明 VR 背景、地面和 Hub；命中测试可用才显示表面 reticle 与放置操作，不可用时保留退出与诊断而不伪造表面。
- 规范资料：
  - https://immersive-web.github.io/hit-test/
  - https://immersive-web.github.io/hit-test/hit-testing-explainer.html
- 当前 `@types/webxr` 已覆盖可选 `requestHitTestSource`、`XRHitTestResult.createAnchor`、`trackedAnchors`、detected planes/meshes，无需自造冲突类型。
- MR 展项采用固定 18 个放置预算，按三种几何体分到 3 个 InstancedMesh；每次放置可绑定 hit result 创建的 anchor，追踪到 anchor pose 时更新实例，超预算回收最旧对象。
- 现有 `SpatialTextPanel` 足以提供“正在扫描 / 表面可用 / 已放置数量”提示；AR 会话仍复用统一退出并自动保存报告路径。
- 实施结果：VR 与 AR 使用不同会话特性集合；AR 会话清除 Three.js 不透明背景并隐藏 VR Hub，hit-test/anchor 缺失时只降级空间放置。
- 实例预算、anchor 回收与会话清理都有独立可测试数据层；当前 31/31 单元测试及生产构建通过，真机支持组合仍待 Quest 3 最终验收。

## 声音花园设计

- 为补齐“全面展示 WebXR”的听觉维度，下一共同层展项采用纯 Web Audio 合成，不下载音频文件：六个空间音种分别对应不同音高与颜色。
- Three.js `AudioListener` 挂到 XR camera，使 Web Audio listener 随头部姿态更新；每次选择创建短生命周期 oscillator + gain envelope + HRTF panner。
- 同时发声数固定为 8，超出时停止最旧 voice；离开展项立即停止全部节点并把 master gain 静音，避免后台发声和持续耗电。
- Hub 从固定取前四项改为筛选共同层 manifest，并扩展到五个门户；Quest MR 和 visionOS 空间布景仍不会混入 VR Hub。

## 引导与舒适设置

- `frontend-design` 延续现有工业测量仪表方向：设置区是同一发射台内的“体验档案”，首次引导使用三条信号记录，而不是独立的通用欢迎卡片。
- 渲染档位固定为 72%（流畅）、85%（平衡）、100%（画质），默认保持当前已验证的 85%；XR 会话中锁定档位，避免运行中修改 framebuffer scale。
- 减少动态会降低 Hub 背景核心与轨道的旋转/呼吸幅度，并遵从系统 `prefers-reduced-motion` 初值；不减慢物理模拟或输入采样。
- 讲解模式只改变提示密度，不改变输入语义；首次引导与偏好保存在浏览器 localStorage，不发送到 Mac 或第三方。
- Playwright 交互回归确认入馆 dialog 具有正确焦点与语义；关闭后可切换流畅档、减少动态和讲解模式，`aria-pressed`、72% SCALE 与事件日志同步更新。
- 1440×1100 下七个展项形成“3 + 2 + 两个设备增强章节”，发射台设置仍保持清晰；390×844 单列无水平溢出，三档与舒适开关改为适合触控的堆叠布局。

## 本地生产服务与缓存

- `pnpm services:start` 现在先生成带时间构建号的 production bundle，再启动 Vite HTTPS preview 与证书页；真机日常测试不再运行 HMR/源码文件监听。
- Vite manifest 已启用，五个共同展项保持按需哈希 chunk；只在探测到 immersive-vr 后预热 3.08 KB 的手势序章，其余仍在门户选择时加载。
- 哈希 JS/CSS 返回一年 immutable 缓存；可变 USDZ 等资产只缓存一小时，避免开发更新长期陈旧。
- 首次响应检查发现 Vite preview 未识别 USDZ MIME，已显式设置 `model/vnd.usdz+zip` 和 `nosniff`；这对 Safari 原生 `<model>` 解码比依赖扩展名猜测更稳妥。
- 证书服务只接受 GET，HEAD 返回 404 是预期的最小暴露策略；页面 GET 与描述文件下载需要分别验证。

## 局域网共创实施结果

- M5 不能在未征得用户同意时被改成“以后再做”；已补回规划内的第六个共同层展项“共振室”。
- Mac 新增 8444 WSS 房间：同源证书、4 KB 消息上限、无压缩、只接受 `/room` 与有界 `resonate` 消息；`/health` 只返回 ok 与当前连接数。
- 服务器维护单一权威 revision、六色色相、能量和匿名会话 actor；客户端只在进入展项时连接，退出断开，掉线时保留本地响应并以 0.5–8 秒指数退避自动重连。
- 两个真实 Node WebSocket 客户端通过项目根证书建立 TLS，初始 revision 均为 0；客户端 A 触发后客户端 B 收到 revision 1、colorIndex 1、lastActor `integration-a`，广播闭环通过。
- 协议校验、能量/色相边界与 malformed snapshot 已纳入单测；全套增至 39 项。

## 最终网页视觉回归

- 无障碍树确认网页共有 8 个入口：6 个跨设备共同展项、Quest MR 与 visionOS Spatial Set，顺序和能力门控正确。
- 1440×1100 下共同展项为三列布局，设备增强章节与诊断区对齐；390×844 下所有内容改为单列，未发现水平溢出或控件挤压。
- 首次入馆指南在桌面与窄屏都保持可读，关闭按钮和“开始探索”均可键盘/触控操作；最终归档的桌面与移动截图均已关闭弹窗，主体视觉证据完整。
