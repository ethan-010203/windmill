# 内部自动化平台

这是公司内部使用的自动化与工具平台二次开发项目，用于集中管理脚本、流程、应用、资源、变量、定时任务和运行记录。

当前主线以免费开源社区版为基础，重点目标是：

- 提供部门内部可用的脚本运行入口
- 支持 Python、TypeScript/JavaScript、Bash、SQL 等脚本能力
- 保留 workspace、用户、分组、权限、脚本、流程、应用、worker 等核心链路
- 收敛外部入口、官方品牌痕迹和付费功能提示
- 提供 Windows 本地 Docker 部署包

## 分支与版本

日常二开分支：

```bash
custom/product-main
```

已验证部署标签：

```bash
internal-v0.1.0
internal-v0.2.0
```

当前开发目标：

```bash
internal-v0.3.0
```

开发时优先保持小步提交。每一阶段验证通过后再推送远程，稳定版本再打 tag。

## 部署入口

Windows 本地 Docker 部署说明在：

```bash
deploy/internal/README.md
```

标准部署流程：

```powershell
git clone <repo-url>
cd <repo>\deploy\internal
copy .env.example .env
.\build-image.ps1
.\start.ps1
```

常用脚本：

```powershell
.\start.ps1
.\stop.ps1
.\restart.ps1
.\logs.ps1
.\backup.ps1
.\restore.ps1
```

部署前不要把真实密码提交到仓库。`.env.example` 只保留示例值，实际密码写入本机 `.env`。

## Mac 开发流程

同步远程主线：

```bash
git fetch origin --tags
git switch custom/product-main
git pull origin custom/product-main
```

查看最近提交和内部 tag：

```bash
git log --oneline --decorate -5
git tag --list "internal-v*"
```

前端开发服务：

```bash
cd frontend
REMOTE=http://localhost:8000 npm run dev
```

如果本机后端由 Docker 提供，开发时通常访问前端开发服务地址，例如：

```bash
http://127.0.0.1:3000
```

## 验证要求

前端改动后至少运行：

```bash
cd frontend
npm run check
npm run build
```

通用提交前检查：

```bash
git diff --check
git status -sb
git diff --stat
```

后端改动后至少运行：

```bash
cd backend
cargo check
```

仅修改 `deploy/internal` 或文档时，可以只运行 `git diff --check`，必要时再补充 Docker 配置验证。

## 当前裁剪原则

优先处理用户可见表面：

- 菜单入口
- 页面入口
- 帮助文案
- 官方外链
- 付费功能提示
- Hub/Public App 等外部使用入口

暂不改动高风险区域：

- 数据库迁移
- OpenAPI 生成文件
- worker 核心链路
- 权限模型
- workspace 核心能力
- 脚本、流程、应用核心运行链路
- 后端大规模裁剪

如果删除一个前端模块会牵出大量无关文件，先停止删除，改为隐藏入口或路由禁用。

## 提交流程

推荐提交粒度：

```bash
chore(frontend): remove disabled hub surfaces
chore(frontend): remove disabled public app surfaces
chore(frontend): clean remaining visible help copy
chore(deploy): align internal deployment scripts and docs
docs: add internal project README
```

提交时只 stage 当前阶段相关文件，不使用 `git add .`。

推送主线：

```bash
git push origin custom/product-main
```

稳定版本打 tag：

```bash
git tag internal-v0.3.0
git push origin internal-v0.3.0
```

## 许可证与声明

本仓库保留上游开源项目的许可证和第三方声明文件。后续二开不要删除这些文件：

- `LICENSE`
- `LICENSE-AGPL`
- `LICENSE-APACHE`
- `NOTICE`

内部部署、修改和分发前，应确认使用方式符合仓库内许可证文件的要求。
