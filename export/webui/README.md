## Docker Export WebUI 使用说明（前端部分）

本目录包含基于 `export/sh/docker-export-compose.sh` 的 Web 前端界面，提供一个可视化的参数配置与执行入口。

### 1. 目录结构

- `index.html`：单页 WebUI 入口。
- `assets/style.css`：样式文件。
- `js/config-model.js`：脚本参数模型，仅前端使用。
- `js/api-client.js`：与后端 HTTP 服务交互的简单封装。
- `js/ui-render.js`：页面交互逻辑（表单、命令预览、日志轮询等）。

### 2. WebUI 能做什么

- 选择导出模式：
  - 单个容器（对应脚本 `<CONTAINER_NAME>`）。
  - 批量导出（前端粘贴容器列表，后端生成临时文件，对应 `--file`）。
  - 导出所有运行中容器（`--all-run`）。
  - 导出所有容器（`--all`）。
  - 导出所有已停止容器（`--all-stop`）。
- 配置主要选项：
  - 输出目录 `-o/--output`（默认 `./output`）。
  - 导出类型 `--type yml|env`。
  - `--privacy`、`--clean`、`--dry-run`、`--overwrite`、`--quiet`、`--must-output`。
- 预览将要执行的命令行。
- 查看执行日志与最终退出码（轮询 `/api/status` 和 `/api/logs`）。

### 3. 依赖的后端接口

WebUI 依赖一个本地 HTTP 服务（可以直接在宿主机运行，也可以放到 Docker 镜像中），开放端口 `3080`，并实现以下接口：

- `POST /api/run`
  - Request Body（JSON，大致结构）：
    - `mode`: `"single" | "batchFromList" | "all-run" | "all" | "all-stop"`
    - `options`:
      - `outputDir`, `exportType`, `privacy`, `clean`, `dryRun`, `overwrite`, `quiet`, `mustOutput`
    - `containerName`：单个容器模式需要。
    - `containerList`：批量模式需要（前端文本，多行）。
  - Response：
    - `{ "taskId": "<任务 ID>" }`

- `GET /api/status?task_id=<ID>`
  - Response：
    - `{ "found": boolean, "finished": boolean, "exitCode": number | null, "startedAt": number }`

- `GET /api/logs?task_id=<ID>`
  - Response：
    - `{ "found": boolean, "log": "完整日志文本" }`

### 4. 本地直接运行（宿主机直接部署）

> 适合你已经在宿主机安装了 Node.js（推荐 18+）与 Docker 的场景。

1. 在 `export` 目录下运行后端服务：

   ```bash
   cd export
   node docker/server.js
   ```

   - 服务默认监听 `http://localhost:3080`。
   - 会自动从 `export/sh/docker-export-compose.sh` 调用脚本。

2. 打开浏览器访问 WebUI：

   - 方式 A：直接通过后端内置静态服务访问  
     在浏览器打开：`http://localhost:3080/`。
   - 方式 B：使用其他静态服务器（如 VSCode Live Server），保持 API 指向 `http://localhost:3080` 即可。

3. 在 WebUI 中填写参数，点击“开始导出”，等待日志与退出状态。

### 5. 通过 Docker 运行（镜像方式）

> 详细见 `export/docker/README-docker.md`。简要说明：

- WebUI 镜像中已经包含：
  - Node 后端服务（`docker/server.js`）。
  - 前端静态文件（本目录）。
  - 原始脚本 `export/sh/docker-export-compose.sh`。
- 运行容器时：
  - 需要挂载 `/var/run/docker.sock` 才能在容器内访问宿主 Docker。
  - 建议再挂载一个输出目录，例如 `./output:/app/output`。

### 6. 安全与限制说明

- WebUI **不会修改脚本本身逻辑**，只是把 CLI 选项映射成表单，组合为命令行调用。
- `--must-output` 非常危险，会跳过脚本内部的三重确认，**仅在完全理解风险时使用**。
- 宿主机部署方式下，Node 后端进程拥有调用 Docker 的能力，应当只在受信任环境中使用。


