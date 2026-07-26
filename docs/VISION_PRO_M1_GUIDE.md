# Vision Pro M1 真机指南

适用设备：Apple Vision Pro，visionOS 27 Beta。  
目标：验证 Safari 的 WebXR、自然输入、完整手部追踪与 Spatial Web 接口，并把报告直接保存回 Mac。

## 1. 在 Mac 启动服务

```bash
cd "/path/to/WebXR-Lab"
pnpm install
pnpm services:start
```

这条命令会先生成生产测试包，再同时启动 8080 证书安装页、8443 WebXR HTTPS 应用和 8444 WSS 共创房间。测试结束后，在同一个终端按一次 `Control + C` 即可关闭三项服务。

当前首选地址：

```text
https://<Mac-主机名>.local:8443
```

若 `.local` 无法解析，使用 Vite 终端列出的 `192.168.x.x` 局域网地址。Mac 与 Vision Pro 必须连接同一个允许设备互访的 Wi‑Fi；访客网络通常不适用。

## 2. 安装项目根证书（推荐方式）

保持 Mac 的 `pnpm profile:serve` 终端运行，在 Vision Pro Safari 打开终端显示的局域网地址，例如：

```text
http://192.168.x.x:8080
```

然后：

1. 点“下载描述文件”并允许下载。
2. **立即**打开 Vision Pro 的“设置”。无需去“文件”App 查找。
3. 在设置顶部的 Apple Account 账户信息下方，点“已下载描述文件（Profile Downloaded）”。
4. 点右上角“安装”，按屏幕提示完成安装。
5. 打开“设置 → 通用 → 关于本机 → 证书信任设置”。
6. 在“启用根证书完全信任”下打开 **WebXR-Lab Local Development CA**。
7. 确认警告后返回 Safari。

Apple 官方说明：下载的描述文件若 8 分钟内未安装，会被 visionOS 自动删除。因此首次 AirDrop 后在“设置”中找不到，通常不是文件丢失，而是待安装项已经过期。  
https://support.apple.com/en-ie/102400

备用方式：从 Mac Finder 将下面的 `.mobileconfig` AirDrop 到 Vision Pro，接收后同样立即去“设置”安装：

```text
WebXR-Lab/.certs/WebXR-Lab-Root-CA.mobileconfig
```

只传 `.mobileconfig`。绝不要复制或分享 `rootCA-key.pem`。

Apple 官方说明：手动安装的 visionOS 根证书不会自动取得网站 SSL/TLS 信任，必须单独开启完全信任。  
https://support.apple.com/en-gb/102390

## 3. 打开诊断页

在 Vision Pro Safari 打开：

```text
https://<Mac-主机名>.local:8443
```

正常状态至少应显示：

- 安全上下文：YES
- WebGL 2：YES
- WebXR API：YES
- Immersive VR：预计 YES
- Immersive AR：按当前 WebKit 结论预计不支持，但以设备报告为准
- HTML Model / Spatial Immersive API：visionOS 27 Beta 上应由实际构建决定

如果 Safari 报证书错误：

1. 重新确认“证书信任设置”中的完全信任已经打开。
2. 改用 Vite 终端显示的局域网 IP 地址。
3. 确认 Vision Pro 没有连接隔离设备的访客 Wi‑Fi。

如果 `WebXR API` 不存在，先记录当前能力矩阵和 Safari 版本。Beta 版的开关名称可能变化，可再检查“设置 → Apps → Safari → Advanced → Feature Flags”中的 WebXR 相关项，不要打开与 WebXR 无关的实验开关。

## 4. 执行 WebXR 手势测试

1. 点击“进入 VR 探针”。
2. 允许 Safari 启动沉浸式会话。
3. 如果出现 hand tracking 授权，选择允许。
4. 观察空间中央的发光核心。
5. 分别用左手、右手各捏合三次。
6. 捏合后缓慢左右移动手，观察射线和 grip 光点。
7. 把双手同时放入视野，确认两组关节光点。
8. 将一只手移出视野两秒，再放回，检查输入是否恢复。
9. 使用 Digital Crown 或系统入口退出沉浸会话。

预期报告会记录：

- `transient-pointer` 的 added → selectstart → select → selectend → removed 顺序；
- persistent hand 输入的 handedness、profiles 和关节数量；
- `gripSpace` / `targetRaySpace` 可用性；
- reference space；
- p50、p95 和最大帧时间；
- 追踪丢失与恢复时的输入源变化。

## 5. 把报告保存回 Mac

退出沉浸模式后：

1. 点击“保存至 Mac”。
2. 页面应显示生成的文件名。
3. Mac 中的报告位于：

```text
WebXR-Lab/reports/local/
```

该目录不会提交到 Git，也不会上传第三方。

“导出 JSON”仍可把同一报告下载到 Vision Pro，作为备用路径。

## 6. 启用远程 Web Inspector

Vision Pro：

1. “设置 → Apps → Safari → Advanced → Web Inspector”。
2. “设置 → 通用 → Remote Devices”，停留在配对页面。

Mac：

1. 确认 Safari 已显示 Develop 菜单。
2. 在 Develop 菜单中选择 Vision Pro。
3. 选择 **Use for Development** 并输入 Vision Pro 显示的六位 PIN。
4. 从设备子菜单选择当前 WebXR-Lab 页面。

Apple 官方文档：  
https://developer.apple.com/documentation/safari-developer-tools/inspecting-visionos

## 7. 完成标准

Vision Pro 的 M1 真机闸门满足以下条件：

- 受信任 HTTPS 地址可稳定打开；
- 页面确认 `immersive-vr`；
- VR 会话能重复进入和退出；
- transient pointer 与 hand tracking 均产生可解释记录；
- 报告成功保存到 Mac；
- Safari Web Inspector 可查看页面，无阻断性控制台错误。
