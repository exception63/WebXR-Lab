# 设备能力矩阵

状态说明：

- **已确认：** 有当前官方资料支持，仍需项目真机回归。
- **待真机：** 公开资料不足或浏览器版本差异较大，必须由技术探针确认。
- **不支持：** 当前官方资料明确不可用。
- **增强项：** 不是跨设备共同基线。

| 能力 | Meta Quest Browser | Safari / visionOS 27 | 项目策略 |
|------|--------------------|----------------------|----------|
| WebXR `immersive-vr` | 已确认 | 已确认 | 共同基线 |
| WebXR `immersive-ar` | 已确认，细节待真机 | 不支持 | Quest 增强 |
| 头部 6DoF | 已确认 | 已确认 | 共同基线 |
| WebXR Hand Input | 已确认，细节待真机 | 已确认，需授权 | 共同基线 |
| `transient-pointer` | 待真机 | 已确认 | Vision Pro 自然输入主路径 |
| 控制器输入 | 已确认 | 非目标 | Quest 兼容输入 |
| 手/控制器动态切换 | 待真机 | 不适用 | Input Adapter 必须支持 |
| WebXR hit-test | 待真机 | `immersive-ar` 不支持 | Quest 增强 |
| anchors | 待真机 | WebXR AR 路径不支持 | Quest 增强 |
| plane detection | 待真机 | WebXR AR 路径不支持 | Quest 增强 |
| mesh detection | 待真机 | WebXR AR 路径不支持 | Quest 增强 |
| depth sensing | 待真机 | WebXR AR 路径不支持 | 仅实验，不作首版承诺 |
| raw camera access | WebXR 待真机；原生能力不能类推 | 不作承诺 | 排除在首版 |
| WebXR Layers | 待真机 | 待真机 | 可选优化，不作基线 |
| 空间音频 | Web Audio 可用，真机调参 | Web Audio 可用，真机调参 | 共同基线 |
| `<model>` 元素 | 非共同基线 | 已确认 | Vision Pro 27 增强 |
| `requestImmersive()` 空间网页环境 | 不支持 | 已确认 | Vision Pro 27 增强 |
| 远程网页检查 | Quest 调试方式待记录 | Mac Safari 官方支持 | 阶段 3 验证 |
| 本地 CA HTTPS | 待真机 | 可安装并完全信任 | 阶段 3 首要闸门 |

## 技术探针输出

每台设备生成一个 JSON 报告，至少包括：

- 时间、构建号、页面 URL、User-Agent；
- `navigator.xr` 与安全上下文状态；
- VR/AR 会话模式支持；
- 用户授权结果；
- 请求并实际取得的 reference space 与可选特性；
- 每次 `inputsourceschange` 的 source 类型、handedness、profiles、targetRayMode、hand/grip/gamepad 可用性；
- 双手关节数量和跟踪稳定性；
- 帧率、p50/p95 帧时间、推荐渲染尺寸；
- WebGL 版本、扩展和压缩纹理能力；
- `<model>` / Immersive API 存在性；
- 错误名称、消息与复现步骤。

## 首轮真机必须回答的问题

### Quest
1. 用户 CA 是否能让局域网地址成为可靠 secure context？
2. 目标 Quest 型号与 Browser 版本是什么？
3. VR/AR 会话分别能取得哪些 optional features？
4. 手与控制器切换时 input source 事件顺序如何？
5. passthrough、hit-test、anchors、planes/meshes 的实际组合是否稳定？

### Vision Pro
1. WebXR 是否默认开启，还是仍需 Safari 功能开关？
2. `hand-tracking` 授权、拒绝和再次进入的行为是什么？
3. transient pointer 与两只 persistent hands 的事件顺序和 profiles 是什么？
4. `<model>.requestImmersive()` 在当前 Safari 27 构建上的状态与资源限制是什么？
5. Mac Safari 无线 Web Inspector 是否稳定，断线后能否快速恢复？
