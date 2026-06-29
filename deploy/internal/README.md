# 内部 Docker 部署与运维手册

这个目录用于在公司内网服务器或本地电脑上部署内部工具平台。Windows 和 Linux 都使用同一份 `docker-compose.yml`、同一份 `.env` 配置，只是执行脚本不同。

## 部署模式

- Windows：使用 PowerShell 脚本，例如 `.\start.ps1`
- Linux/macOS：使用 shell 脚本，例如 `./start.sh`
- 默认从当前源码构建本地镜像：`internal-platform:ce-source`
- 数据库存放在 Docker volume 中，停止服务不会删除数据

不要在服务器上直接部署未验证的开发中工作区。稳定版本建议使用 `internal-v*` tag。

## 前置要求

Windows：

- Windows 10/11 或 Windows Server
- Git
- Docker Desktop
- Docker Desktop 使用 Linux containers
- 建议 16GB 内存以上用于本地构建镜像

Linux Server：

- Git
- Docker Engine
- Docker Compose v2
- 当前用户可以执行 `docker compose`
- 建议 16GB 内存以上用于本地构建镜像

首次构建镜像需要联网下载基础镜像、Rust/Node 依赖和系统依赖。

## 首次部署

Windows：

```powershell
git clone https://github.com/你的账号/你的仓库.git
cd 仓库
git switch custom/product-main
git pull origin custom/product-main
cd deploy\internal
copy .env.example .env
notepad .env
.\build-image.ps1
.\start.ps1
```

Linux：

```bash
git clone https://github.com/你的账号/你的仓库.git
cd 仓库
git switch custom/product-main
git pull origin custom/product-main
cd deploy/internal
cp .env.example .env
vi .env
chmod +x ./*.sh
./build-image.sh
./start.sh
```

默认访问地址：

```text
http://127.0.0.1:8000
```

首次打开页面时，按页面提示创建管理员账号。`.env` 中的 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 只用于部署记录，程序不会自动创建该账号。

## .env 配置

启动前必须修改这些值：

- `POSTGRES_PASSWORD`：数据库密码
- `DATABASE_URL`：数据库连接串，密码要和 `POSTGRES_PASSWORD` 保持一致
- `BASE_URL` / `WM_BASE_URL`：浏览器访问地址
- `SECRET_KEY`：应用密钥，建议使用 32 位以上随机字符串
- `SUPERADMIN_SECRET`：虚拟超级管理员 token，建议使用长随机字符串
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`：首次初始化管理员账号时使用的记录值
- `WINDMILL_IMAGE`：运行镜像；本地源码构建默认使用 `internal-platform:ce-source`

局域网访问时，把地址改成服务器 IP：

```env
APP_PORT=8000
BASE_URL=http://192.168.1.10:8000
WM_BASE_URL=http://192.168.1.10:8000
```

如果服务器端口被占用：

```env
APP_PORT=8080
BASE_URL=http://127.0.0.1:8080
WM_BASE_URL=http://127.0.0.1:8080
```

## 常用命令

Windows：

```powershell
.\build-image.ps1
.\start.ps1
.\start.ps1 -NoBuild
.\stop.ps1
.\restart.ps1
.\logs.ps1
.\logs.ps1 windmill_server
```

Linux：

```bash
./build-image.sh
./start.sh
./start.sh --no-build
./stop.sh
./restart.sh
./logs.sh
./logs.sh windmill_server
```

直接查看容器状态：

```bash
docker compose ps
```

## 初始化检查

首次部署完成后至少验证：

- 可以打开 `BASE_URL`
- 可以创建管理员账号并登录
- 可以创建 workspace
- 可以创建并运行 Python 脚本
- 可以创建并运行 JavaScript/Bun 脚本
- 可以创建流程
- 可以创建应用
- 重启后数据仍然存在

## 备份

Windows：

```powershell
.\backup.ps1
```

Linux：

```bash
./backup.sh
```

备份文件默认保存到：

```text
deploy/internal/backups/
```

备份文件名类似：

```text
internal-platform-YYYYMMDD-HHMMSS.dump
```

建议在这些操作前备份：

- 升级版本
- 回滚版本
- 修改数据库相关配置
- 迁移服务器

## 恢复

恢复会覆盖当前数据库。先停止业务使用，再执行。

Windows：

```powershell
.\restore.ps1 .\backups\internal-platform-YYYYMMDD-HHMMSS.dump
```

Linux：

```bash
./restore.sh ./backups/internal-platform-YYYYMMDD-HHMMSS.dump
```

脚本会要求输入 `RESTORE` 才会继续。

## 版本升级流程

推荐升级到明确 tag，不建议服务器直接跟随开发分支。

Windows：

```powershell
cd 仓库
git fetch --all --tags
git checkout internal-v0.4.0
cd deploy\internal
.\backup.ps1
.\build-image.ps1
.\restart.ps1 -NoBuild
```

Linux：

```bash
cd 仓库
git fetch --all --tags
git checkout internal-v0.4.0
cd deploy/internal
./backup.sh
./build-image.sh
./restart.sh --no-build
```

升级后验证：

- 可以登录
- 可以打开已有 workspace
- 可以运行已有脚本
- 可以创建并运行新脚本
- 可以查看运行记录
- `docker compose ps` 中服务状态正常

## 回滚流程

先确认要回滚到的 tag，例如 `internal-v0.3.0`。

Windows：

```powershell
cd 仓库\deploy\internal
.\backup.ps1
.\stop.ps1
cd ..\..
git fetch --all --tags
git checkout internal-v0.3.0
cd deploy\internal
.\build-image.ps1
.\start.ps1 -NoBuild
```

Linux：

```bash
cd 仓库/deploy/internal
./backup.sh
./stop.sh
cd ../..
git fetch --all --tags
git checkout internal-v0.3.0
cd deploy/internal
./build-image.sh
./start.sh --no-build
```

如果回滚后无法正常启动，或新版本已经写入了不兼容数据，再恢复升级前备份：

Windows：

```powershell
.\restore.ps1 .\backups\internal-platform-YYYYMMDD-HHMMSS.dump
```

Linux：

```bash
./restore.sh ./backups/internal-platform-YYYYMMDD-HHMMSS.dump
```

## 数据持久化

Docker volume：

- PostgreSQL 数据：`postgres_data`
- worker 依赖缓存：`worker_dependency_cache`
- worker 日志：`worker_logs`

`stop.ps1` / `stop.sh` 只执行 `docker compose down`，不会删除 volume。

不要随意执行：

```bash
docker compose down -v
```

这会删除数据库数据。

## 常见问题

### 打不开页面

```bash
docker compose ps
docker compose logs --tail=200 windmill_server
```

确认访问地址和 `.env` 中的 `BASE_URL` 一致。

### start 提示找不到镜像

如果 `WINDMILL_IMAGE=internal-platform:ce-source`，先运行构建脚本：

Windows：

```powershell
.\build-image.ps1
```

Linux：

```bash
./build-image.sh
```

如果使用远程镜像，把 `WINDMILL_IMAGE` 改成完整镜像地址，例如：

```env
WINDMILL_IMAGE=registry.example.com/internal-platform:internal-v0.4.0
```

### 首次构建很慢

正常。首次构建会下载依赖并编译后端，耗时较长。后续构建会复用 Docker 缓存。

### 忘记管理员账号

先确认是否还有其他管理员账号可以登录。没有可用管理员时，不要直接改数据库，先从最近备份恢复到可登录状态，或在测试环境验证修复方案后再处理生产数据。

### 需要迁移服务器

1. 旧服务器执行备份。
2. 新服务器 clone 仓库并 checkout 相同 tag。
3. 新服务器复制 `.env`，确认地址和密钥。
4. 新服务器构建镜像并启动 PostgreSQL。
5. 执行恢复脚本。
6. 验证登录、脚本运行和历史数据。
