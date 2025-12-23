## Docker Export WebUI 容器部署说明

本目录包含用于打包 `docker-export-compose.sh` + WebUI 的 Docker 相关文件：

- `Dockerfile`：构建镜像。
- `docker-compose.yml`：示例编排（可按需调整）。
- `server.js`：Node.js 后端服务（同时托管 WebUI）。

镜像内包含内容：

- `sh/docker-export-compose.sh`（原始导出脚本）。
- `webui/`（前端页面）。
- `server.js`（HTTP API + 静态文件服务）。

---

## 一、构建镜像

在 `export` 目录下执行（`Dockerfile` 位于 `export/docker/`）：

```bash
cd export
docker build -f docker/Dockerfile -t docker-export-webui .
```

> 镜像基于 `node:20-alpine`，额外安装 `bash` 与 `docker-cli`，用于在容器内执行脚本和调用 Docker。
>
> **注意**：构建镜像时宿主机不需要安装 Node.js，只需要 Docker 即可。

---

## 二、直接运行容器

### 1. Linux / WSL / Docker Desktop（Linux 容器）

在这些环境下，Docker Engine 通常通过 `/var/run/docker.sock` 暴露 Unix Socket。为了让容器内的脚本操作宿主机的 Docker，需将该 Socket 挂载进容器：

```bash
docker run -d \
  --name docker-export-webui \
  -p 3080:3080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd)/output:/app/output" \
  --restart unless-stopped \
  docker-export-webui
```

- `-p 3080:3080`：浏览器访问 `http://localhost:3080` 即可打开 WebUI。
- `-v /var/run/docker.sock:/var/run/docker.sock`：
  - 容器内 `docker` 命令会通过这个 Socket 直接操作宿主机 Docker。
  - **高权限操作，仅适用于受信任环境。**
- `-v "$(pwd)/output:/app/output"`：
  - 将容器内默认输出目录 `/app/output` 映射到宿主机当前目录的 `output/`。

### 2. Windows + Docker Desktop 注意事项

- Docker Desktop（Linux 容器模式）本质上在一个 Linux 虚拟机内运行 Docker Engine：
  - 对容器来说，`/var/run/docker.sock` 仍然是有效的 Unix Socket。
  - 挂载 `-v /var/run/docker.sock:/var/run/docker.sock` 可以正常工作。
- 但需要注意：
  - 容器内的 Docker 操作用的是 Docker Desktop 管理的引擎，而不是“裸金属”Windows。
  - 文件路径、卷挂载等仍按 Linux/WSL 的方式处理。

如果你在 Windows 上使用的是 **Windows 容器模式**，则无法通过 `/var/run/docker.sock` 这种方式访问 Docker Engine，此时不建议使用本镜像模式调用宿主 Docker，应考虑改为“宿主机直接部署”模式（见下文结论）。

---

## 三、使用 docker-compose（示例）

在 `export/docker` 目录下已经提供了一个示例 `docker-compose.yml`：

```bash
cd export/docker
docker compose up -d
```

### 认证（默认开启）与 data 持久化

镜像方式默认启用 **WebUI 登录**（页面内登录界面：账号+密码），用于避免在内网环境被随意访问。

- 默认账号：`admin`（可用环境变量 `DOCKER_EXPORT_AUTH_USER` 覆盖）
- 密码：
  - 推荐在 `docker-compose.yml` 显式配置 `DOCKER_EXPORT_AUTH_PASSWORD`
  - 如果未配置，则首次启动会生成随机密码并打印到容器日志（请在 1Panel/`docker logs` 中查看）

认证状态会写入容器内的 `/app/data/auth.json`。因此 **需要挂载 `./data:/app/data`**，否则删除容器后会丢失认证数据（会再次生成随机密码）。

### 安全策略（可选）：会话过期与登录失败限制（持久化配置）

服务会在 `/app/data/security.json` 写入并读取安全策略配置（首次启动如果不存在会自动生成）。

- 会话过期（默认 12 小时）：`sessionTtlSeconds`
- 登录失败限制（默认 30 分钟窗口内失败 3 次，锁定 30 分钟）：
  - `loginFailWindowSeconds`
  - `loginFailMaxAttempts`
  - `loginLockSeconds`

示例（默认值）：

```json
{
  "sessionTtlSeconds": 43200,
  "loginFailWindowSeconds": 1800,
  "loginFailMaxAttempts": 3,
  "loginLockSeconds": 1800
}
```

注意：登录失败限制按 IP 统计。在反向代理场景下，请确保代理正确传递 `X-Forwarded-For`。

### 可选：启用 MFA（TOTP）

MFA（TOTP）**必须在 WebUI 中手动开启**，不会通过环境变量默认开启。

在页面中点击：

- `安全设置` → `MFA 安全设置（TOTP）`
- 点击“生成二维码”
- 使用手机验证器扫码
- 输入 6 位验证码，点击“确认启用 MFA”

开启状态会写入 `/app/data/auth.json`，因此必须保留 `./data:/app/data` 挂载，否则重建容器会丢失 MFA 状态。

启用 MFA 后，登录流程变为“两步”：

1. 先在 WebUI 登录界面输入 **账号+密码**（通过后）
2. 再额外输入一次 **6 位动态验证码（OTP）** 完成登录

验证码通常只需要在本次会话中验证一次（会话过期/退出登录后会再次要求验证）。

### 额外：清理缓存并强制重建（更新不生效时）

如果你修改了 `Dockerfile` / `server.js` / `webui` 等内容，但在 1Panel 或 `docker compose up -d` 后发现容器仍然在跑旧版本（例如日志显示的路径/输出不符合预期），可以在 `export/docker` 目录下执行以下命令强制清理并重建：

```bash
cd export/docker
docker compose down
docker image rm -f docker-export-webui 2>/dev/null || true
docker compose build --no-cache
docker compose up -d
```

该示例默认：

- 构建服务 `docker-export-webui`，上下文为 `export` 目录。
- 暴露端口 `3080`。
- 挂载：
  - `/var/run/docker.sock:/var/run/docker.sock`
  - `./output:/app/output`

如需调整路径或端口，可直接编辑 `docker-compose.yml`。

> 当前示例 **没有对配置文件做持久化挂载**，即：容器内的 `sh/config` 如果被修改，删除容器后会随容器一起消失。这样可以减少意外覆盖宿主机文件的风险，适合作为“开箱即用”的默认行为。

---

## 四、容器内访问宿主机 Docker 的可行性与限制

### 1. 可行性（推荐场景）

在以下环境中，通过挂载 `/var/run/docker.sock`，**容器内访问宿主机 Docker 是可行的**：

- Linux 原生 Docker。
- WSL2 + Docker Desktop（Linux 容器）。
- Docker Desktop on Windows / macOS（Linux 容器模式）。

前提条件：

- 启动容器时挂载 `-v /var/run/docker.sock:/var/run/docker.sock`。
- 容器内安装了 `docker-cli`（`Dockerfile` 已处理）。

此时：

- 容器内执行的 `sh/docker-export-compose.sh` 通过 `docker` 命令直接操作宿主 Docker。
- 导出的 `docker-compose.yml` 等文件写入容器内 `/app/output`，若挂载了卷，则同步到宿主机。

### 2. 潜在问题与不推荐场景

以下场景中，不建议或无法可靠使用“容器内访问宿主 Docker”的模式：

- Windows 容器模式（非 Linux 容器）：
  - 不提供 `/var/run/docker.sock` 这种 Unix Socket 方式。
  - 即使有类似命名管道映射，方案复杂且平台相关，不适合作为通用默认方案。
- 对安全性有严格要求的生产环境：
  - 挂载 Docker Socket 等同于把宿主机的 Docker 控制权交给容器。
  - 风险：容器内一旦被入侵，可直接控制宿主机所有容器甚至主机环境。

在这些情况下，更推荐使用**宿主机直接部署模式**（见下一节）。

---

## 五、推荐部署模式对比（结论）

### 模式 A：宿主机直接部署（推荐为通用默认）

- 在宿主机直接运行：

  ```bash
  cd export
  node docker/server.js
  # 浏览器访问：http://localhost:3080
  ```

- 特点：
  - 不依赖容器内访问宿主 Docker，逻辑最直观。
  - 只要宿主机有 Node.js 和 Docker CLI，即可使用。
  - 配置、路径与脚本行为与文档完全一致。

### 模式 B：Docker 镜像封装 WebUI + 后端 + 脚本

- 使用 `docker run` 或 `docker compose` 运行镜像。
- 优点：
  - 易于在一台统一的“工具机”上部署。
  - 不污染宿主机环境（Node 与脚本都在容器中）。
- 局限与风险：
  - 需要挂载 `/var/run/docker.sock` 赋予容器高权限。
  - 在 Windows 容器模式等特殊环境下可能不可用或配置复杂。

> 综合考虑：**推荐优先使用“宿主机直接部署”运行 Node 后端 + WebUI**，将 Docker 镜像视作一个“可选的封装方式”，而不是强制依赖。

---

## 六、访问与使用流程（镜像方式）

1. 启动容器（以 `docker compose` 为例）：

   ```bash
   cd export/docker
   docker compose up -d
   ```

2. 在浏览器访问：

   ```text
   http://localhost:3080/
   ```

3. 在 WebUI 上：

   - 选择导出模式与参数。
   - 点击“开始导出”。
   - 观察命令预览和执行日志。

4. 在宿主机查看导出结果：

   ```bash
   cd export
   ls output/
   ```

   或者按你在 `docker-compose.yml` 中配置的挂载路径查看。

---

## 七、后续扩展建议

- 如需更细粒度的权限控制，可以考虑：
  - 使用专门的“中间代理”限制可执行的 Docker 命令。
  - 为导出工具单独准备一台“导出机”，与生产环境隔离。
- 如需集成身份认证（登录保护 WebUI）：
  - 可以在 `server.js` 外增加反向代理（Nginx / Traefik），接入现有认证体系。

### 8. 隐私词（config）文件的持久化与导入导出

`docker-export-compose.sh` 会在脚本目录下使用 `config` 文件来自定义敏感关键词与排除规则（在 WebUI 的“敏感关键词配置”中可视化编辑）。在 Docker 镜像中：

- 默认情况下：
  - 首次运行如果没有 `config`，脚本会在容器内 `/app/sh/config` 自动生成一个模板。
  - 你在 WebUI 中保存的修改，只写入容器内部文件系统。
  - **删除容器后，这些修改会丢失**（因为我们没有为它挂载卷）。

> 这是刻意的默认设计：避免一开始就把敏感配置写到宿主机磁盘上，同时让新用户可以“玩坏就删容器重来”。

如果你希望在 Docker 环境下**持久化 config 文件**，可以按需增加挂载，例如：

```yaml
services:
  docker-export-webui:
    # ... 其他配置省略 ...
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./output:/app/output
      # ⭐ 可选：持久化 config 文件（建议你手动创建一个空文件再挂载）
      # - ./config/config.conf:/app/sh/config
```

推荐做法：

1. 在 `export/docker` 目录创建一个专门的配置目录和空文件：

   ```bash
   cd export/docker
   mkdir -p config
   touch config/config.conf
   ```

2. 在 `docker-compose.yml` 中手动取消注释或添加这行挂载：

   ```yaml
   - ./config/config.conf:/app/sh/config
   ```

3. 使用 WebUI 的“敏感关键词配置（config 文件）”界面编辑并保存：
   - 你的修改会写入容器内的 `/app/sh/config`，实际是写到了宿主机 `export/docker/config/config.conf`。
   - 之后删除并重建容器，config 内容仍然保留。

4. 如需备份或迁移：
   - 可以直接备份上述 `config.conf` 文件；
   - 或在 WebUI 中使用“下载 config 文件”按钮，将当前内容导出为文本文件，下次在宿主机或其他环境挂载为 `/app/sh/config` 即可。

> 再次强调：**默认提供的 `docker-compose.yml` 没有开启 config 持久化**，是为了避免无意间在宿主机写入包含敏感信息的文件。只有在你明确理解风险并手动修改 compose 时，才会真正持久化该文件。


