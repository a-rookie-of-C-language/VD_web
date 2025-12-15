# VolunteerDashboard (VD)

志愿者活动管理与统计平台，基于 Vue 3 + Vite 构建前端，支持 Electron 桌面端打包与 Capacitor 移动端集成。提供活动发布、导入、报名、审核、时长统计、系统监控等功能。

## 技术栈

- Vue 3、TypeScript、Vite
- UI：Element Plus
- 数据可视化：ECharts
- 路由：Vue Router
- 网络：Axios
- 桌面端：Electron + electron-builder + electron-updater
- 移动端：Capacitor（Android/iOS）

## 运行要求

- Node：`^20.19.0` 或 `>=22.12.0`（见 `package.json`）
- 包管理器：建议使用 `npm`

## 快速开始

```bash
# 安装依赖
npm install

# Web 开发（Vite 开发服务器，默认 5173 端口）
npm run dev

# 桌面开发（同时启动 Vite 和 Electron）
npm run electron:dev

# 预览已构建的 Web 资源
npm run preview
```

## 构建与打包

- Web 构建：`npm run build`（输出到 `dist/`）
- 桌面打包：`npm run electron:build`（先构建 Web，再用 electron-builder 打包，输出到 `release/`）
  - Windows：`nsis`
  - macOS：`dmg`
  - Linux：`AppImage`

## 目录结构

```
VD/
├─ src/                      # 前端源码
│  ├─ components/            # 通用组件
│  ├─ pages/                 # 业务页面（活动列表、发布、导入、我的项目、时长、审核、监控等）
│  ├─ router/                # 路由配置（见 src/router/index.ts）
│  ├─ services/              # 接口服务（axios 调用）
│  ├─ stores/                # 状态管理
│  ├─ util/                  # 工具函数
│  ├─ main.ts                # 应用入口（挂载 Element Plus、路由）
│  └─ App.vue
├─ electron/main.cjs         # Electron 主进程入口
├─ android/                  # Capacitor Android 工程
├─ ios/                      # Capacitor iOS 工程
├─ dist/                     # Web 构建产物（vite build）
├─ release/                  # 桌面打包产物（electron-builder）
├─ vite.config.ts            # Vite 配置
└─ package.json
```

## 常用脚本

- `npm run dev`：启动 Vite 开发服务器
- `npm run build`：构建 Web
- `npm run preview`：预览构建后的 Web
- `npm run electron:dev`：并发启动 Vite 与 Electron（开发桌面端）
- `npm run electron:build`：构建 Web 并打包 Electron 应用
- `npm run typecheck`：TypeScript 类型检查（vue-tsc）

## 桌面端与自动更新

- 主进程入口：`electron/main.cjs`（如 `electron/main.cjs:24` 开始初始化与检查更新）
- 开发模式会加载 `VITE_DEV_SERVER_URL` 指向的 Vite 地址（见 `electron/main.cjs:16-21`）
- 生产模式自动更新：
  - 通过环境变量 `UPDATE_BASE_URL` 配置更新源（generic provider），例如：
    - Windows PowerShell：`$Env:UPDATE_BASE_URL = "https://your-domain/updates/"`
  - 应用启动后，若 `app.isPackaged` 且存在 `UPDATE_BASE_URL`，会：
    - 设置更新源并在启动约 5 秒后检测更新（见 `electron/main.cjs:24-61`）
    - 提示“发现新版本”→下载→“更新已下载”→安装并重启
  - 注意：`package.json` 的 `build.publish` 当前为 `null`，意味着未内置发布渠道。部署时需将 `electron-builder` 生成的产物（如 `latest.yml` 与安装包）放到 `UPDATE_BASE_URL` 对应的静态可访问目录。

## 后端接口与配置

- 活动相关接口的默认地址：`http://localhost:8080/api`（见 `src/services/activityService.ts:6`）
- 用户相关接口的默认地址：`http://localhost:8080`（见 `src/services/userService.ts:5`）
- 如需更改后端地址，可直接调整上述文件中的常量，或改造成读取环境变量。

## 路由与页面

- 路由配置：`src/router/index.ts` 使用 `createWebHistory`，主布局为 `MainLayout`。
- 主要页面示例：活动列表、发布活动、后台导入、我的项目、我的时长、管理员审核、系统监控、详情页等。

## 开发提示

- 角色与权限：部分菜单仅对特定角色可见（如负责人、管理员、超级管理员）。
- 本地存储：登录后会在 `localStorage` 中保存 `token` 与 `userInfo`，路由守卫会依据角色做跳转。

## 许可

- 项目同时包含第三方组件与 Electron 运行时，打包目录 `release/` 会附带相关许可证文件。

