# 内部 Docker 部署包

这个目录用于在公司 Windows 电脑或 Windows Server 上启动内部系统。`start.ps1` 依赖已经存在的本地镜像，或 `.env` 中配置的可拉取远程镜像；从源码构建本地镜像请使用 `build-image.ps1`。

## 前置要求

- Windows 10/11 或 Windows Server
- 已安装 Git
- 已安装 Docker Desktop
- Docker Desktop 使用 Linux containers
- 机器至少 8GB 内存；如果要本地构建镜像，建议 16GB 以上
- 首次构建镜像需要联网下载 Docker 基础镜像、Rust/Node 依赖和系统依赖

## 快速启动

```powershell
git clone https://github.com/你的账号/你的仓库.git
cd 仓库\deploy\internal
copy .env.example .env
notepad .env
.\build-image.ps1
.\start.ps1
```

默认访问地址：

```text
http://127.0.0.1:8000
```

首次打开页面时，按页面提示创建管理员账号。`.env` 里的 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 只是给部署人员记录初始化账号用，程序不会自动用这两个变量创建账号。

## 配置说明

启动前必须修改 `.env` 中的密码和密钥：

- `POSTGRES_PASSWORD`：数据库密码
- `DATABASE_URL`：数据库连接串，密码要和 `POSTGRES_PASSWORD` 保持一致
- `BASE_URL` / `WM_BASE_URL`：浏览器访问地址
- `SECRET_KEY`：应用密钥，建议使用 32 位以上随机字符串
- `SUPERADMIN_SECRET`：虚拟超级管理员 token，建议使用长随机字符串
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`：首次初始化管理员账号时使用的记录值
- `WINDMILL_IMAGE`：运行镜像。使用本地构建时默认是 `internal-windmill:ce-source`

如果要改端口，修改：

```env
APP_PORT=8000
BASE_URL=http://127.0.0.1:8000
WM_BASE_URL=http://127.0.0.1:8000
```

## 常用命令

从当前源码构建本地运行镜像：

```powershell
.\build-image.ps1
```

启动：

```powershell
.\start.ps1
```

跳过镜像检查或远程镜像拉取，直接启动：

```powershell
.\start.ps1 -NoBuild
```

停止：

```powershell
.\stop.ps1
```

重启：

```powershell
.\restart.ps1
```

查看全部日志：

```powershell
.\logs.ps1
```

查看单个服务日志：

```powershell
.\logs.ps1 windmill_server
.\logs.ps1 windmill_worker
.\logs.ps1 postgres
```

## 备份

```powershell
.\backup.ps1
```

备份文件会保存到宿主机目录：

```text
deploy\internal\backups\
```

也可以指定目录；脚本会在该目录中生成 dump 文件。

## 恢复

恢复会覆盖当前数据库。先停止业务使用，再执行：

```powershell
.\restore.ps1 .\backups\windmill-YYYYMMDD-HHMMSS.dump
```

脚本会要求输入 `RESTORE` 才会继续。

## 升级

在源码目录拉取最新内部分支后，先备份，再重新构建镜像并启动：

```powershell
git pull origin custom/product-main
cd deploy\internal
.\backup.ps1
.\build-image.ps1
.\start.ps1
```

升级前建议先备份数据库。

## 数据持久化

以下数据保存在 Docker volume 中：

- PostgreSQL 数据：`postgres_data`
- worker 依赖缓存：`worker_dependency_cache`
- worker 日志：`worker_logs`

执行 `.\stop.ps1` 不会删除 volume，数据会保留。不要随意运行 `docker compose down -v`，否则会删除数据库数据。

## 常见问题

### 打不开页面

先查看服务状态：

```powershell
docker compose ps
.\logs.ps1 windmill_server
```

确认浏览器访问的是 `.env` 中的 `BASE_URL`。

### 端口被占用

修改 `.env`：

```env
APP_PORT=8080
BASE_URL=http://127.0.0.1:8080
WM_BASE_URL=http://127.0.0.1:8080
```

然后重新启动：

```powershell
.\restart.ps1
```

### 首次构建镜像很慢

这是正常现象。首次构建会下载依赖并编译后端，耗时可能较长。后续构建会复用 Docker 缓存。

### start.ps1 提示找不到镜像

如果 `.env` 中的 `WINDMILL_IMAGE` 是 `internal-windmill:ce-source`，请先运行：

```powershell
.\build-image.ps1
```

如果你使用远程镜像，请把 `WINDMILL_IMAGE` 改成完整镜像地址，例如 `registry.example.com/internal-windmill:版本号`。

### 登录账号是什么

首次访问页面时创建管理员账号。创建后使用该账号登录。

### 需要让局域网其他电脑访问

把 `.env` 中的地址改成服务器 IP，例如：

```env
APP_PORT=8000
BASE_URL=http://192.168.1.10:8000
WM_BASE_URL=http://192.168.1.10:8000
```

同时确认 Windows 防火墙允许该端口访问。
