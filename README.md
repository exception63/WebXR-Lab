# WebXR-Lab

一个以 Web 为入口、由本地 MacBook 提供服务、面向 Meta Quest 与 Apple Vision Pro 的沉浸式体验集合。

它不是单一游戏，而是一座可扩展的“空间实验馆”：用户从统一 Hub 进入不同展项，通过视觉、声音、物理、双手、凝视、捏合、控制器与混合现实，理解 WebXR 和空间网页能做到什么。

## 当前结论

- Quest 与 Vision Pro 的共同主线是 WebXR `immersive-vr` 和手部/空间输入。
- Quest 额外承担 WebXR `immersive-ar` / passthrough MR 展项。
- visionOS 当前不支持 WebXR `immersive-ar`；visionOS 27 的 `<model>` + Immersive API 将作为独立的空间网页展项，而不是伪装成 WebXR AR。
- 不购买云服务器。MacBook 提供 HTTPS 应用、WSS 共创房间、证书页与诊断记录。
- 所有入口都依据浏览器实时能力开放，不依赖设备名称猜测。

## 文档导航

- [小白使用教程：安装、启动、测试与关闭](docs/BEGINNER_GUIDE.md)
- [产品蓝图](docs/PRODUCT_BLUEPRINT.md)
- [技术架构](docs/TECHNICAL_ARCHITECTURE.md)
- [设备能力矩阵](docs/DEVICE_CAPABILITY_MATRIX.md)
- [里程碑与验收](docs/MILESTONES.md)
- [真机测试协议](docs/TEST_PROTOCOL.md)
- [任务计划](task_plan.md)
- [研究发现](findings.md)
- [进度日志](progress.md)

## 当前状态

功能开发已完成，等待集中真机验收：

- 六个共同层门户：手势序章、光之织机、动力工坊、口袋宇宙、声音花园、共振室。
- Quest 增强：透视 MR、hit-test、可选 anchor 与平面/网格诊断。
- Vision Pro 27 增强：原生 `<model>` 预览与 `requestImmersive()` 空间布景。
- 首次引导、三档渲染、减少动态、讲解模式、自动报告保存与资源预算。
- Vision Pro 的证书、HTTPS 与首轮 WebXR 启动链路已通过；完整新版本和 Quest 3 留待最后统一测试。

## 启动与关闭

```bash
cd "/path/to/WebXR-Lab"
pnpm install
pnpm services:start
```

这会先生成带构建号的生产包，再启动：

- `8080`：证书安装页；
- `8443`：WebXR HTTPS 应用；
- `8444`：局域网 WSS 共创房间。

Vision Pro 使用：

- 终端显示的 `https://<Mac-主机名>.local:8443`
- `.local` 无法解析时，使用终端显示的 `https://<局域网 IP>:8443`

测试结束时，在运行服务的终端按一次 `Control + C` 即可关闭全部服务。

开发者完整自检：

```bash
pnpm verify
```

完整步骤见 [小白使用教程](docs/BEGINNER_GUIDE.md) 和 [真机测试协议](docs/TEST_PROTOCOL.md)。
