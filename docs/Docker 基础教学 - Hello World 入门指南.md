# Docker 基础教学 - Hello World 入门指南

## 📌 文档信息

- **创建日期**：2025-11-06
- **最后更新**：2025-11-06
- **文档版本**：v1.2（新增 Docker Compose 章节和容器命名详解）
- **适用对象**：Docker 初学者
- **文档目的**：通过官方 hello-world 镜像学习 Docker 基础操作

---

## 📋 目录

- [1. Docker 简介](#1-docker-简介)
- [2. Hello World 快速开始](#2-hello-world-快速开始)
- [3. Docker 基础概念](#3-docker-基础概念)
- [4. 镜像管理](#4-镜像管理)
- [5. 容器管理](#5-容器管理)
- [6. 重启策略详解](#6-重启策略详解)
- [7. 日志管理](#7-日志管理)
- [8. 资源限制](#8-资源限制)
- [9. Docker Compose 入门](#9-docker-compose-入门)
- [10. 实战练习](#10-实战练习)
- [11. 常见问题](#11-常见问题)

---

## 1. Docker 简介

### 1.1 什么是 Docker

```
Docker 是一个开源的容器化平台

传统虚拟机 vs Docker：

┌─────────────────────────┐  ┌─────────────────────────┐
│   虚拟机（VM）           │  │   Docker 容器            │
├─────────────────────────┤  ├─────────────────────────┤
│  应用 A    应用 B        │  │  应用 A    应用 B        │
│  ├──────┐  ├──────┐     │  │  ├──────┐  ├──────┐     │
│  │依赖  │  │依赖  │     │  │  │依赖  │  │依赖  │     │
│  └──────┘  └──────┘     │  │  └──────┘  └──────┘     │
├─────────────────────────┤  ├─────────────────────────┤
│  Guest OS  Guest OS      │  │    Docker Engine        │
├─────────────────────────┤  ├─────────────────────────┤
│     Hypervisor           │  │    Host OS              │
├─────────────────────────┤  ├─────────────────────────┤
│     Host OS              │  │    Infrastructure       │
├─────────────────────────┤  └─────────────────────────┘
│    Infrastructure        │
└─────────────────────────┘

优势：
✅ 更轻量（MB级 vs GB级）
✅ 启动更快（秒级 vs 分钟级）
✅ 资源占用少
✅ 易于分发和部署
```

### 1.2 核心概念

```
三个核心概念：

1. 镜像（Image）
   - 只读的模板
   - 包含运行应用所需的一切
   - 可以理解为"安装包"

2. 容器（Container）
   - 镜像的运行实例
   - 可以启动、停止、删除
   - 可以理解为"正在运行的程序"

3. 仓库（Registry）
   - 存储和分发镜像的地方
   - Docker Hub 是官方仓库
   - 可以理解为"应用商店"
```

---

## 2. Hello World 快速开始

### 2.1 第一个 Docker 命令

```bash
# 运行 hello-world 镜像
docker run hello-world
```

**完整输出解读**：

```
Unable to find image 'hello-world:latest' locally
# ↑ 本地没有找到镜像

latest: Pulling from library/hello-world
# ↑ 从 Docker Hub 拉取镜像

719385e32844: Pull complete
# ↑ 下载镜像层完成

Digest: sha256:...
# ↑ 镜像的唯一标识

Status: Downloaded newer image for hello-world:latest
# ↑ 下载完成

Hello from Docker!
# ↑ 容器运行输出

This message shows that your installation appears to be working correctly.
# ↑ Docker 安装正常
```

### 2.2 执行流程图

```
用户执行命令
    ↓
docker run hello-world
    ↓
┌─────────────────────────────────────────┐
│ 步骤 1：检查本地镜像                     │
│   - 查找 hello-world:latest             │
│   - 如果不存在 → 继续步骤 2              │
│   - 如果存在 → 跳到步骤 3                │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 步骤 2：从 Docker Hub 下载镜像           │
│   - 连接到 registry.hub.docker.com      │
│   - 下载 library/hello-world:latest     │
│   - 保存到本地                           │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 步骤 3：创建容器                         │
│   - 基于镜像创建可写层                   │
│   - 分配网络、存储等资源                 │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 步骤 4：运行容器                         │
│   - 执行容器的默认命令                   │
│   - 输出 "Hello from Docker!"           │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 步骤 5：容器退出                         │
│   - 任务完成                             │
│   - 容器停止（状态：Exited）            │
└─────────────────────────────────────────┘
```

---

## 3. Docker 基础概念

### 3.1 镜像（Image）

```bash
# 查看本地所有镜像
docker images

# 输出示例：
# REPOSITORY    TAG       IMAGE ID       CREATED         SIZE
# hello-world   latest    feb5d9fea6a5   2 years ago     13.3kB

# 列说明：
# REPOSITORY - 镜像名称
# TAG        - 镜像标签（版本）
# IMAGE ID   - 镜像唯一标识
# CREATED    - 创建时间
# SIZE       - 镜像大小
```

**镜像的分层结构**：

```
hello-world 镜像结构：

┌─────────────────────────────────┐
│  可写层（容器运行时创建）         │ ← 容器层
├─────────────────────────────────┤
│  应用层（hello 可执行文件）       │
├─────────────────────────────────┤
│  基础层（最小系统文件）           │
└─────────────────────────────────┘
         ↑
    只读层（镜像）

特点：
✅ 分层存储，节省空间
✅ 只读镜像 + 可写容器层
✅ 多个容器可共享同一镜像
```

### 3.2 容器（Container）

```bash
# 查看正在运行的容器
docker ps

# 查看所有容器（包括已停止）
docker ps -a

# 输出示例：
# CONTAINER ID   IMAGE         COMMAND    CREATED          STATUS                      PORTS     NAMES
# a1b2c3d4e5f6   hello-world   "/hello"   10 seconds ago   Exited (0) 8 seconds ago              clever_euler

# 列说明：
# CONTAINER ID - 容器短 ID
# IMAGE        - 基于的镜像
# COMMAND      - 容器运行的命令
# CREATED      - 创建时间
# STATUS       - 当前状态
# PORTS        - 端口映射
# NAMES        - 容器名称（自动生成或手动指定）
```

**容器的生命周期**：

```
容器状态转换：

    [创建]
       ↓
    Created（已创建）
       ↓ docker start
    Running（运行中）
       ↓
   ┌───┴───┐
   ↓       ↓
正常退出   异常退出
   ↓       ↓
Exited    Exited
   (0)     (非0)
   ↓       ↓
   └───┬───┘
       ↓
   可以删除（docker rm）
   或重新启动（docker start）
```

---

## 4. 镜像管理

### 4.1 拉取镜像

```bash
# 拉取最新版本
docker pull hello-world

# 拉取特定标签
docker pull hello-world:latest

# 拉取特定版本（如果有）
docker pull hello-world:linux

# 指定平台（可选）
docker pull --platform linux/amd64 hello-world
```

### 4.2 查看镜像详情

```bash
# 查看镜像详细信息
docker inspect hello-world

# 输出 JSON 格式信息：
# {
#     "Id": "sha256:...",
#     "RepoTags": ["hello-world:latest"],
#     "Size": 13336,
#     "Architecture": "amd64",
#     "Os": "linux",
#     ...
# }

# 只查看特定字段
docker inspect hello-world --format='{{.Size}}'
# 输出：13336

docker inspect hello-world --format='{{.Architecture}}'
# 输出：amd64
```

### 4.3 镜像历史

```bash
# 查看镜像构建历史
docker history hello-world

# 输出示例：
# IMAGE          CREATED       CREATED BY                                      SIZE      COMMENT
# feb5d9fea6a5   2 years ago   /bin/sh -c #(nop)  CMD ["/hello"]               0B
# <missing>      2 years ago   /bin/sh -c #(nop) COPY file:... in /           13.3kB

# 显示完整命令
docker history --no-trunc hello-world
```

### 4.4 删除镜像

```bash
# 删除镜像（通过名称）
docker rmi hello-world

# 删除镜像（通过 ID）
docker rmi feb5d9fea6a5

# 强制删除（即使有容器使用）
docker rmi -f hello-world

# 删除所有未使用的镜像
docker image prune

# 删除所有镜像（危险）
docker rmi $(docker images -q)
```

---

## 5. 容器管理

### 5.1 创建和运行容器

```bash
# 最简单的运行方式
docker run hello-world

# 指定容器名称
docker run --name my-hello hello-world

# 运行并自动删除
docker run --rm hello-world
# --rm: 容器退出后自动删除

# 交互模式（对于需要交互的镜像）
docker run -it alpine sh
# -i: 保持 STDIN 开启
# -t: 分配伪终端
```

**run 命令的完整流程**：

```
docker run = docker create + docker start

等价于：
docker create hello-world  # 创建容器
docker start -a <容器ID>   # 启动并附加输出
```

### 5.2 容器生命周期管理

```bash
# 启动已停止的容器
docker start <容器ID或名称>

# 停止运行中的容器
docker stop <容器ID或名称>

# 强制停止
docker kill <容器ID或名称>

# 重启容器
docker restart <容器ID或名称>

# 暂停容器
docker pause <容器ID或名称>

# 恢复暂停的容器
docker unpause <容器ID或名称>
```

### 5.3 查看容器信息

```bash
# 查看容器详细信息
docker inspect <容器ID>

# 查看容器日志
docker logs <容器ID>

# 实时查看日志
docker logs -f <容器ID>

# 查看最后 10 行日志
docker logs --tail 10 <容器ID>

# 查看容器资源使用
docker stats <容器ID>

# 查看容器内进程
docker top <容器ID>
```

### 5.4 删除容器

```bash
# 删除已停止的容器
docker rm <容器ID>

# 强制删除运行中的容器
docker rm -f <容器ID>

# 删除所有已停止的容器
docker container prune

# 删除所有容器（危险）
docker rm -f $(docker ps -aq)
```

---

## 6. 重启策略详解

### 6.1 四种重启策略

```bash
# 1. no - 不自动重启（默认）
docker run --restart=no hello-world

# 2. always - 总是重启
docker run --restart=always hello-world

# 3. unless-stopped - 除非手动停止
docker run --restart=unless-stopped hello-world

# 4. on-failure - 失败时重启
docker run --restart=on-failure hello-world

# 失败时重启（最多 5 次）
docker run --restart=on-failure:5 hello-world
```

### 6.2 重启策略对比表

| 策略             | 容器异常退出      | 容器正常退出 | 手动停止后 | 系统重启后 |
| ---------------- | ----------------- | ------------ | ---------- | ---------- |
| `no`             | ❌ 不重启          | ❌ 不重启     | ❌ 不重启   | ❌ 不启动   |
| `always`         | ✅ 重启            | ✅ 重启       | ✅ 重启     | ✅ 启动     |
| `unless-stopped` | ✅ 重启            | ✅ 重启       | ❌ 不重启   | ✅ 启动     |
| `on-failure`     | ✅ 重启            | ❌ 不重启     | ❌ 不重启   | ❌ 不启动   |
| `on-failure:5`   | ✅ 重启（最多5次） | ❌ 不重启     | ❌ 不重启   | ❌ 不启动   |

### 6.3 重启策略示例

```bash
# 示例 1：测试 no 策略
docker run --name test-no --restart=no hello-world
docker ps -a | grep test-no
# 状态：Exited (0)
# 不会自动重启

# 示例 2：测试 always 策略
docker run -d --name test-always --restart=always alpine sleep 5
# 5秒后容器退出
sleep 6
docker ps | grep test-always
# 容器会自动重启，仍在运行

# 示例 3：测试 unless-stopped 策略
docker run -d --name test-unless --restart=unless-stopped alpine sleep 5
sleep 6
docker ps | grep test-unless
# 容器重启
docker stop test-unless
docker ps -a | grep test-unless
# 手动停止后，不会再重启

# 示例 4：测试 on-failure 策略
docker run --name test-failure --restart=on-failure:3 alpine sh -c "exit 1"
# 容器会重启 3 次后停止
docker inspect test-failure --format='{{.RestartCount}}'
# 输出：3
```

### 6.4 修改重启策略

```bash
# 修改现有容器的重启策略
docker update --restart=unless-stopped <容器ID>

# 批量修改所有容器
docker update --restart=unless-stopped $(docker ps -aq)

# 查看当前重启策略
docker inspect <容器ID> --format='{{.HostConfig.RestartPolicy.Name}}'
```

---

## 7. 日志管理

### 7.1 查看日志

```bash
# 查看所有日志
docker logs <容器ID>

# 实时跟踪日志
docker logs -f <容器ID>

# 显示时间戳
docker logs -t <容器ID>

# 只显示最后 N 行
docker logs --tail 100 <容器ID>

# 显示特定时间后的日志
docker logs --since 2024-01-01 <容器ID>
docker logs --since 1h <容器ID>  # 最近1小时

# 显示特定时间前的日志
docker logs --until 2024-01-01 <容器ID>
```

### 7.2 日志驱动配置

```bash
# 运行时指定日志驱动
docker run --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  hello-world

# 日志选项说明：
# max-size=10m  - 单个日志文件最大 10MB
# max-file=3    - 最多保留 3 个日志文件

# 查看日志配置
docker inspect <容器ID> --format='{{.HostConfig.LogConfig}}'
```

### 7.3 日志位置

```bash
# 日志存储位置（默认）
# Linux: /var/lib/docker/containers/<容器ID>/<容器ID>-json.log
# Windows: C:\ProgramData\Docker\containers\<容器ID>\<容器ID>-json.log

# 查找容器日志文件
find /var/lib/docker/containers -name "*-json.log"

# 直接查看日志文件
cat /var/lib/docker/containers/<容器完整ID>/<容器完整ID>-json.log
```

---

## 8. 资源限制

### 8.1 内存限制

```bash
# 限制内存为 100MB
docker run -m 100m hello-world

# 限制内存和 swap
docker run -m 100m --memory-swap 200m hello-world

# 查看内存限制
docker inspect <容器ID> --format='{{.HostConfig.Memory}}'
```

### 8.2 CPU 限制

```bash
# 限制 CPU 使用（相对权重）
docker run --cpu-shares 512 hello-world

# 限制 CPU 核心数
docker run --cpus 1.5 hello-world

# 绑定到特定 CPU 核心
docker run --cpuset-cpus 0,1 hello-world

# 查看 CPU 限制
docker inspect <容器ID> --format='{{.HostConfig.CpuShares}}'
```

### 8.3 资源监控

```bash
# 实时查看资源使用
docker stats

# 查看特定容器
docker stats <容器ID>

# 输出格式化
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# 只显示一次（不持续刷新）
docker stats --no-stream
```

---

## 9. Docker Compose 入门

### 9.1 什么是 Docker Compose

```
Docker Compose 是什么？

Docker Compose 是一个用于定义和运行多容器 Docker 应用的工具。

单容器 vs 多容器：

传统方式（单个容器）：
docker run --name web -d nginx
docker run --name db -d mysql
docker run --name redis -d redis
# ↑ 需要多次执行命令

Docker Compose 方式：
docker-compose up -d
# ↑ 一个命令启动所有容器

优势：
✅ 一个文件定义所有服务
✅ 一个命令管理所有容器
✅ 配置可重复使用
✅ 易于版本管理
```

### 9.2 Docker Compose 版本

```bash
# Compose V1（旧版，独立命令）
docker-compose --version
# docker-compose version 1.29.2

# Compose V2（新版，Docker 子命令，推荐）
docker compose version
# Docker Compose version v2.20.0

# 注意：
# - V1 使用：docker-compose
# - V2 使用：docker compose（无连字符）
# - 本文档使用 V2 语法
```

### 9.3 安装 Docker Compose

```bash
# Linux - Compose V2（推荐，通常已包含在 Docker 中）
docker compose version

# 如果未安装，手动安装：
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 验证安装
docker compose version

# macOS / Windows
# Docker Desktop 已包含 Compose V2
# 无需额外安装
```

### 9.4 docker-compose.yml 文件详解

#### 基础结构

```yaml
# docker-compose.yml - 最简单的示例

version: '3.8'  # Compose 文件版本

services:       # 定义服务
  hello:        # 服务名称
    image: hello-world  # 使用的镜像
```

#### 完整示例（使用 hello-world 和 alpine）

```yaml
# docker-compose.yml - 教学示例

version: '3.8'

services:
  # 服务 1：hello-world（运行一次就退出）
  hello:
    image: hello-world
    container_name: my-hello
    restart: "no"

  # 服务 2：alpine（持续运行）
  alpine:
    image: alpine
    container_name: my-alpine
    restart: unless-stopped
    command: sh -c "while true; do echo 'Hello from Alpine'; sleep 5; done"
    
    # 日志配置
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    
    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 100M
        reservations:
          cpus: '0.25'
          memory: 50M

  # 服务 3：另一个 alpine（演示多个相同镜像）
  alpine2:
    image: alpine
    container_name: my-alpine2
    restart: unless-stopped
    command: sh -c "while true; do date; sleep 10; done"
```

### 9.5 Docker Compose 基础命令

```bash
# 启动所有服务（前台运行）
docker compose up

# 启动所有服务（后台运行，推荐）
docker compose up -d

# 停止所有服务
docker compose stop

# 停止并删除容器
docker compose down

# 重启所有服务
docker compose restart

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs

# 实时跟踪日志
docker compose logs -f

# 查看特定服务日志
docker compose logs alpine

# 停止并删除所有内容（包括数据卷）
docker compose down -v
```

### 9.6 实战练习：创建第一个 Compose 项目

#### 步骤 1：创建项目目录

```bash
# 创建项目目录
mkdir ~/docker-compose-demo
cd ~/docker-compose-demo
```

#### 步骤 2：创建 docker-compose.yml

```bash
# 创建配置文件
cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  # Hello World 容器
  hello:
    image: hello-world
    container_name: demo-hello
    restart: "no"

  # 持续运行的 Alpine 容器
  worker:
    image: alpine
    container_name: demo-worker
    restart: unless-stopped
    command: sh -c "while true; do echo '[Worker] Running at' \$(date); sleep 5; done"
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"

  # 另一个 Alpine 容器（演示多服务）
  logger:
    image: alpine
    container_name: demo-logger
    restart: unless-stopped
    command: sh -c "while true; do echo '[Logger] Log entry:' \$(date); sleep 3; done"
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"
EOF
```

#### 步骤 3：启动项目

```bash
# 启动所有服务
docker compose up -d

# 输出示例：
# [+] Running 3/3
#  ✔ Container demo-hello   Started    0.5s
#  ✔ Container demo-worker  Started    0.6s
#  ✔ Container demo-logger  Started    0.7s
```

#### 步骤 4：查看状态

```bash
# 查看所有服务
docker compose ps

# 输出示例：
# NAME           IMAGE         COMMAND                  STATUS              PORTS
# demo-hello     hello-world   "/hello"                 Exited (0)
# demo-worker    alpine        "sh -c 'while true..."   Up 10 seconds
# demo-logger    alpine        "sh -c 'while true..."   Up 10 seconds
```

#### 步骤 5：查看日志

```bash
# 查看所有日志
docker compose logs

# 只查看 worker 服务的日志
docker compose logs worker

# 实时跟踪 logger 服务
docker compose logs -f logger

# 查看最后 10 行
docker compose logs --tail 10
```

#### 步骤 6：管理服务

```bash
# 停止特定服务
docker compose stop worker

# 启动特定服务
docker compose start worker

# 重启特定服务
docker compose restart logger

# 查看特定服务的详细信息
docker compose ps worker
```

#### 步骤 7：清理

```bash
# 停止并删除所有容器
docker compose down

# 输出示例：
# [+] Running 3/3
#  ✔ Container demo-logger  Removed    0.3s
#  ✔ Container demo-worker  Removed    0.4s
#  ✔ Container demo-hello   Removed    0.1s
```

### 9.7 docker-compose.yml 配置详解

#### 常用配置选项

```yaml
version: '3.8'

services:
  myservice:
    # 镜像
    image: alpine:latest
    
    # 容器名称
    container_name: my-container
    
    # 重启策略
    restart: unless-stopped  # no | always | on-failure | unless-stopped
    
    # 执行的命令
    command: echo "Hello World"
    
    # 工作目录
    working_dir: /app
    
    # 环境变量
    environment:
      - ENV_VAR1=value1
      - ENV_VAR2=value2
    
    # 端口映射
    ports:
      - "8080:80"      # 宿主端口:容器端口
      - "443:443"
    
    # 数据卷
    volumes:
      - ./data:/data
      - ./logs:/var/log
    
    # 网络
    networks:
      - mynetwork
    
    # 依赖关系
    depends_on:
      - db
    
    # 日志配置
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    
    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    
    # 健康检查
    healthcheck:
      test: ["CMD", "echo", "healthy"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

# 网络定义
networks:
  mynetwork:
    driver: bridge

# 数据卷定义
volumes:
  myvolume:
    driver: local
```

### 9.8 容器命名规则详解（重要）⭐

#### 问题：容器名称为什么是 `项目名-服务名-序号`？

```
Docker Compose 的自动命名规则：

容器名称 = 项目名 + 服务名 + 序号

例如：
docker-compose.yml 所在目录：easytier-web/
服务名：easytier-web
序号：1

生成的容器名：easytier-web-easytier-web-1
                ─────────── ─────────── ─
                   ↑           ↑        ↑
                 项目名      服务名    序号

这就是为什么容器名看起来重复了！
```

#### 使用 hello-world 演示

```bash
# 创建测试目录
mkdir ~/hello-world-test
cd ~/hello-world-test

# 创建 docker-compose.yml
cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  hello-world:
    image: hello-world
    restart: "no"
EOF

# 启动
docker compose up -d

# 查看容器名称
docker ps -a
# 输出：
# CONTAINER ID   IMAGE         NAMES
# a1b2c3d4e5f6   hello-world   hello-world-test-hello-world-1
#                                ─────────────  ───────────  ─
#                                   项目名        服务名     序号
#                                (目录名)
```

#### 三种解决方案

##### 方案 1：使用 `container_name`（最简单，推荐）✅

```yaml
version: '3.8'

services:
  hello-world:
    image: hello-world
    container_name: my-hello  # 明确指定容器名
    restart: "no"

  alpine:
    image: alpine
    container_name: my-alpine  # 明确指定容器名
    restart: unless-stopped
    command: sh -c "while true; do echo 'Hello'; sleep 5; done"
# 启动后查看
docker compose up -d
docker ps -a

# 输出：
# CONTAINER ID   IMAGE         NAMES
# a1b2c3d4e5f6   hello-world   my-hello       ← 使用指定的名称
# b2c3d4e5f6a7   alpine        my-alpine      ← 使用指定的名称
```

**优点**：

- ✅ 容器名清晰、简洁
- ✅ 易于管理和识别
- ✅ 可以用名称直接操作容器

**缺点**：

- ⚠️ 不能使用 `--scale` 扩展（容器名会冲突）
- ⚠️ 需要手动确保名称唯一

##### 方案 2：修改项目名（使用 `-p` 参数）

```bash
# 创建配置文件（不指定 container_name）
cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  hello-world:
    image: hello-world
    restart: "no"
  
  alpine:
    image: alpine
    restart: unless-stopped
    command: sh -c "while true; do echo 'Hello'; sleep 5; done"
EOF

# 使用 -p 参数指定项目名
docker compose -p myproject up -d

# 查看容器名
docker ps -a

# 输出：
# CONTAINER ID   IMAGE         NAMES
# a1b2c3d4e5f6   hello-world   myproject-hello-world-1  ← 项目名变短了
# b2c3d4e5f6a7   alpine        myproject-alpine-1
```

**管理时也要加 `-p`**：

```bash
docker compose -p myproject ps
docker compose -p myproject logs
docker compose -p myproject down
```

##### 方案 3：使用 `.env` 文件设置项目名

```bash
# 创建 .env 文件
cat > .env <<'EOF'
COMPOSE_PROJECT_NAME=myapp
EOF

# 创建 docker-compose.yml
cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  hello-world:
    image: hello-world
    restart: "no"
  
  alpine:
    image: alpine
    restart: unless-stopped
    command: sh -c "while true; do echo 'Hello'; sleep 5; done"
EOF

# 启动（自动读取 .env）
docker compose up -d

# 查看容器名
docker ps -a

# 输出：
# CONTAINER ID   IMAGE         NAMES
# a1b2c3d4e5f6   hello-world   myapp-hello-world-1  ← 使用 .env 中的项目名
# b2c3d4e5f6a7   alpine        myapp-alpine-1
```

#### 实战对比：三种方案效果

```bash
# 方案对比演示

# 准备：创建测试目录
mkdir -p ~/compose-naming-test/{test1,test2,test3}

# ════════════════════════════════════════
# 测试 1：默认命名（目录名作为项目名）
# ════════════════════════════════════════
cd ~/compose-naming-test/test1

cat > docker-compose.yml <<'EOF'
version: '3.8'
services:
  hello-world:
    image: hello-world
EOF

docker compose up -d
docker ps -a --filter "ancestor=hello-world" --format "{{.Names}}"
# 输出：test1-hello-world-1

docker compose down

# ════════════════════════════════════════
# 测试 2：使用 container_name（推荐）✅
# ════════════════════════════════════════
cd ~/compose-naming-test/test2

cat > docker-compose.yml <<'EOF'
version: '3.8'
services:
  hello-world:
    image: hello-world
    container_name: my-custom-hello  # 自定义名称
EOF

docker compose up -d
docker ps -a --filter "ancestor=hello-world" --format "{{.Names}}"
# 输出：my-custom-hello  ← 清晰简洁！

docker compose down

# ════════════════════════════════════════
# 测试 3：使用项目名参数
# ════════════════════════════════════════
cd ~/compose-naming-test/test3

cat > docker-compose.yml <<'EOF'
version: '3.8'
services:
  hello-world:
    image: hello-world
EOF

docker compose -p myapp up -d
docker ps -a --filter "ancestor=hello-world" --format "{{.Names}}"
# 输出：myapp-hello-world-1

docker compose -p myapp down

# 清理测试目录
cd ~
rm -rf ~/compose-naming-test
```

#### 您的 EasyTier 配置修复

```yaml
# 原配置（容器名：easytier-web-easytier-web-1）
version: '3.8'

services:
  easytier-web:
    image: easytier/easytier:latest
    restart: always
    volumes:
      - ./easytier/app:/app
      - ./easytier/logs:/logs
    ports:
      - "11211:11211"
      - "22020:22020/udp"
      - "22020:22020/tcp"
    environment:
      - TZ=Asia/Shanghai
    entrypoint: easytier-web-embed
    command: 
      - --console-log-level
      - info
      - --file-log-level
      - info
      - --file-log-dir
      - /logs
      - --config-server-protocol
      - udp

# 修复后配置（方法 1：添加 container_name）✅
version: '3.8'

services:
  easytier-web:
    image: easytier/easytier:latest
    container_name: easytier-web  # 添加这行！
    restart: unless-stopped  # 推荐改为 unless-stopped
    volumes:
      - ./easytier/app:/app
      - ./easytier/logs:/logs
    ports:
      - "11211:11211"
      - "22020:22020/udp"
      - "22020:22020/tcp"
    environment:
      - TZ=Asia/Shanghai
    entrypoint: easytier-web-embed
    command: 
      - --console-log-level
      - info
      - --file-log-level
      - info
      - --file-log-dir
      - /logs
      - --config-server-protocol
      - udp
    
    # 建议添加日志限制
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

# 修复后配置（方法 2：使用 .env 设置项目名）
# 创建 .env 文件：
# COMPOSE_PROJECT_NAME=et

# docker-compose.yml 保持不变
# 容器名会变成：et-easytier-web-1
```

#### 命名最佳实践

```yaml
# 推荐做法

version: '3.8'

services:
  # 方式 1：服务名简短 + container_name
  web:
    image: hello-world
    container_name: my-web  # 简洁明了
  
  # 方式 2：服务名描述性 + container_name
  database:
    image: alpine
    container_name: my-database
  
  # 方式 3：不指定 container_name（允许扩展）
  worker:
    image: alpine
    # 不指定 container_name
    # 可以使用 docker compose up --scale worker=3
    # 会创建：myproject-worker-1, myproject-worker-2, myproject-worker-3

# 项目名设置（.env 文件）
# COMPOSE_PROJECT_NAME=myproject
```

#### 快速诊断命令

```bash
# 查看当前项目的所有容器名
docker compose ps --format "{{.Name}}"

# 查看项目名
docker compose config --format json | grep -i project

# 查看完整配置（包括自动生成的名称）
docker compose config
```

### 9.9 实用示例：多服务编排

```yaml
# docker-compose.yml - 多服务示例

version: '3.8'

services:
  # Web 服务（使用 Alpine）
  web:
    image: alpine
    container_name: demo-web
    restart: unless-stopped
    command: sh -c "while true; do echo '[Web] Serving requests'; sleep 2; done"
    networks:
      - app-network
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"

  # Worker 服务
  worker:
    image: alpine
    container_name: demo-task-worker
    restart: unless-stopped
    command: sh -c "while true; do echo '[Worker] Processing task'; sleep 5; done"
    depends_on:
      - web
    networks:
      - app-network
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"

  # Monitor 服务
  monitor:
    image: alpine
    container_name: demo-monitor
    restart: unless-stopped
    command: sh -c "while true; do echo '[Monitor] Checking health'; sleep 10; done"
    depends_on:
      - web
      - worker
    networks:
      - app-network
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"

networks:
  app-network:
    driver: bridge
```

### 9.10 Docker Compose 常用命令总结

```bash
# === 启动和停止 ===
docker compose up              # 启动（前台）
docker compose up -d           # 启动（后台）
docker compose down            # 停止并删除容器
docker compose stop            # 停止容器
docker compose start           # 启动已停止的容器
docker compose restart         # 重启容器

# === 查看状态 ===
docker compose ps              # 查看服务状态
docker compose ps -a           # 查看所有服务（包括已停止）
docker compose top             # 查看进程
docker compose images          # 查看使用的镜像

# === 日志 ===
docker compose logs            # 查看日志
docker compose logs -f         # 实时跟踪日志
docker compose logs <服务名>   # 查看特定服务日志
docker compose logs --tail 50  # 查看最后 50 行

# === 执行命令 ===
docker compose exec <服务名> <命令>   # 在运行的容器中执行命令
docker compose run <服务名> <命令>    # 创建新容器并执行命令

# === 构建和拉取 ===
docker compose pull            # 拉取所有镜像
docker compose build           # 构建镜像（如果有 Dockerfile）

# === 扩展 ===
docker compose up -d --scale worker=3   # 扩展服务到 3 个实例

# === 验证 ===
docker compose config          # 验证并查看配置
docker compose version         # 查看版本
```

### 9.11 Docker Compose vs Docker Run 对比

#### 使用 docker run（传统方式）

```bash
# 需要多个命令
docker run -d --name web \
  --restart=unless-stopped \
  --network my-network \
  --log-opt max-size=10m \
  alpine sh -c "while true; do echo 'Web'; sleep 5; done"

docker run -d --name worker \
  --restart=unless-stopped \
  --network my-network \
  --log-opt max-size=10m \
  alpine sh -c "while true; do echo 'Worker'; sleep 5; done"

docker run -d --name monitor \
  --restart=unless-stopped \
  --network my-network \
  --log-opt max-size=10m \
  alpine sh -c "while true; do echo 'Monitor'; sleep 5; done"

# 创建网络
docker network create my-network
```

#### 使用 Docker Compose（推荐）

```yaml
# docker-compose.yml - 一个文件定义所有
version: '3.8'

services:
  web:
    image: alpine
    restart: unless-stopped
    command: sh -c "while true; do echo 'Web'; sleep 5; done"
    networks: [app-net]
    logging:
      options:
        max-size: "10m"

  worker:
    image: alpine
    restart: unless-stopped
    command: sh -c "while true; do echo 'Worker'; sleep 5; done"
    networks: [app-net]
    logging:
      options:
        max-size: "10m"

  monitor:
    image: alpine
    restart: unless-stopped
    command: sh -c "while true; do echo 'Monitor'; sleep 5; done"
    networks: [app-net]
    logging:
      options:
        max-size: "10m"

networks:
  app-net:
# 一个命令启动所有
docker compose up -d

# 一个命令停止所有
docker compose down
```

### 9.12 最佳实践

```yaml
# docker-compose.yml - 最佳实践示例

version: '3.8'

services:
  myapp:
    image: alpine:latest
    container_name: myapp    # 明确命名
    restart: unless-stopped  # 推荐的重启策略
    
    # 使用环境变量文件
    env_file:
      - .env
    
    # 健康检查
    healthcheck:
      test: ["CMD", "echo", "ok"]
      interval: 30s
      timeout: 10s
      retries: 3
    
    # 日志限制（重要）
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    
    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
    
    # 标签（便于管理）
    labels:
      - "com.example.description=My Application"
      - "com.example.version=1.0"

# 命名网络
networks:
  default:
    name: myapp-network
```

### 9.13 练习：创建一个完整项目

```bash
# 任务：创建一个包含 3 个服务的项目

# 步骤 1：创建项目目录
mkdir ~/my-compose-project
cd ~/my-compose-project

# 步骤 2：创建 docker-compose.yml
cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  service1:
    image: alpine
    container_name: service1
    restart: unless-stopped
    command: sh -c "while true; do echo '[Service1] Working...'; sleep 3; done"
    networks:
      - mynetwork
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"

  service2:
    image: alpine
    container_name: service2
    restart: unless-stopped
    command: sh -c "while true; do echo '[Service2] Processing...'; sleep 5; done"
    depends_on:
      - service1
    networks:
      - mynetwork
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"

  service3:
    image: alpine
    container_name: service3
    restart: unless-stopped
    command: sh -c "while true; do echo '[Service3] Monitoring...'; sleep 7; done"
    depends_on:
      - service1
      - service2
    networks:
      - mynetwork
    logging:
      driver: json-file
      options:
        max-size: "5m"
        max-file: "2"

networks:
  mynetwork:
    driver: bridge
EOF

# 步骤 3：验证配置
docker compose config

# 步骤 4：启动项目
docker compose up -d

# 步骤 5：查看状态
docker compose ps

# 步骤 6：查看日志
docker compose logs -f --tail 10

# 步骤 7：测试重启
docker compose restart service2

# 步骤 8：停止特定服务
docker compose stop service3

# 步骤 9：重新启动
docker compose start service3

# 步骤 10：完全清理
docker compose down
```

### 9.14 Docker Compose 速查表

```bash
# === 项目管理 ===
docker compose up -d              # 启动项目
docker compose down               # 停止并删除项目
docker compose down -v            # 停止并删除（包括数据卷）
docker compose restart            # 重启项目

# === 服务管理 ===
docker compose ps                 # 查看服务状态
docker compose logs -f            # 查看日志
docker compose exec <服务> sh     # 进入容器
docker compose stop <服务>        # 停止服务
docker compose start <服务>       # 启动服务

# === 配置 ===
docker compose config             # 验证配置
docker compose config --services  # 列出所有服务
docker compose version            # 查看版本

# === 其他 ===
docker compose pull               # 拉取镜像
docker compose top                # 查看进程
docker compose images             # 查看镜像
```

---

## 10. 实战练习

### 10.1 练习 1：基础操作

```bash
# 任务：完成 hello-world 的完整生命周期

# 步骤 1：拉取镜像
docker pull hello-world

# 步骤 2：查看镜像
docker images | grep hello-world

# 步骤 3：运行容器（指定名称）
docker run --name my-first-hello hello-world

# 步骤 4：查看容器状态
docker ps -a | grep my-first-hello

# 步骤 5：查看日志
docker logs my-first-hello

# 步骤 6：删除容器
docker rm my-first-hello

# 步骤 7：删除镜像
docker rmi hello-world
```

### 10.2 练习 2：重启策略测试

```bash
# 任务：测试不同重启策略的行为

# 测试 1：no 策略
docker run --name test-no --restart=no alpine sh -c "echo 'No restart'; exit 1"
sleep 2
docker ps -a | grep test-no
# 预期：Exited (1)，不会重启

# 测试 2：on-failure:3 策略
docker run --name test-failure --restart=on-failure:3 alpine sh -c "echo 'Will retry'; exit 1"
sleep 10
docker inspect test-failure --format='重启次数: {{.RestartCount}}'
# 预期：重启次数: 3

# 测试 3：unless-stopped 策略
docker run -d --name test-unless --restart=unless-stopped alpine sh -c "while true; do echo 'Running'; sleep 2; done"
sleep 5
docker stop test-unless
docker ps -a | grep test-unless
# 预期：Exited，不会重启

# 清理
docker rm -f test-no test-failure test-unless
```

### 10.3 练习 3：容器管理综合

```bash
# 任务：完整的容器管理流程

# 1. 创建多个容器
for i in {1..5}; do
    docker run -d --name hello-$i --restart=unless-stopped alpine sh -c "echo 'Container $i'; sleep 3600"
done

# 2. 查看所有容器
docker ps

# 3. 查看特定容器日志
docker logs hello-1

# 4. 停止部分容器
docker stop hello-1 hello-2

# 5. 重启一个容器
docker restart hello-3

# 6. 查看容器资源使用
docker stats --no-stream

# 7. 查看容器详细信息
docker inspect hello-4 --format='{{.State.Status}}'

# 8. 批量删除容器
docker rm -f $(docker ps -aq --filter "name=hello-")

# 验证
docker ps -a
```

### 10.4 练习 4：日志管理

```bash
# 任务：日志查看和管理

# 1. 创建产生日志的容器
docker run -d --name log-test \
  --log-opt max-size=1m \
  --log-opt max-file=3 \
  alpine sh -c 'while true; do echo "Log entry at $(date)"; sleep 1; done'

# 2. 等待产生日志
sleep 5

# 3. 查看最后 10 行日志
docker logs --tail 10 log-test

# 4. 实时跟踪日志
docker logs -f log-test
# 按 Ctrl+C 停止

# 5. 查看带时间戳的日志
docker logs -t --tail 5 log-test

# 6. 查看日志配置
docker inspect log-test --format='{{.HostConfig.LogConfig}}'

# 7. 清理
docker rm -f log-test
```

---

## 11. 常见问题

### 11.1 镜像相关问题

#### Q1：无法拉取镜像

```bash
# 问题
docker pull hello-world
# Error: Get https://registry-1.docker.io: net/http: request canceled

# 解决方案 1：检查网络连接
ping registry-1.docker.io

# 解决方案 2：使用国内镜像源（修改 /etc/docker/daemon.json）
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}

# 重启 Docker
sudo systemctl restart docker

# 解决方案 3：使用代理
docker pull hello-world --platform linux/amd64
```

#### Q2：镜像占用空间

```bash
# 查看 Docker 占用空间
docker system df

# 输出示例：
# TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
# Images          5         2         1.5GB     500MB (33%)
# Containers      10        3         100MB     50MB (50%)
# Local Volumes   3         1         200MB     100MB (50%)

# 清理未使用的资源
docker system prune

# 清理所有未使用的镜像
docker image prune -a

# 清理所有未使用的资源（包括数据卷）
docker system prune -a --volumes
```

### 11.2 容器相关问题

#### Q3：容器无法启动

```bash
# 问题
docker start <容器ID>
# Error response from daemon: ...

# 查看错误日志
docker logs <容器ID>

# 查看容器详细信息
docker inspect <容器ID>

# 常见原因：
# 1. 端口被占用
# 2. 资源不足
# 3. 配置错误
# 4. 权限问题
```

#### Q4：容器自动退出

```bash
# 查看退出原因
docker ps -a
# 查看 STATUS 列的退出码

# 常见退出码：
# 0   - 正常退出
# 1   - 应用错误
# 125 - Docker daemon 错误
# 126 - 命令无法执行
# 127 - 命令未找到
# 137 - 被 SIGKILL 杀死（内存不足）
# 139 - 段错误

# 查看详细退出信息
docker inspect <容器ID> --format='{{.State.ExitCode}}'
docker inspect <容器ID> --format='{{.State.Error}}'
```

#### Q5：清理所有容器和镜像

```bash
# 警告：这会删除所有 Docker 资源！

# 停止所有运行的容器
docker stop $(docker ps -q)

# 删除所有容器
docker rm $(docker ps -aq)

# 删除所有镜像
docker rmi $(docker images -q)

# 一键清理（慎用）
docker system prune -a --volumes -f
```

### 11.3 权限相关问题

#### Q6：需要 sudo 才能运行

```bash
# 问题
docker ps
# Got permission denied while trying to connect to the Docker daemon socket

# 解决方案：将用户添加到 docker 组
sudo usermod -aG docker $USER

# 重新登录或刷新组
newgrp docker

# 验证
docker ps
```

#### Q7：Docker 服务未启动

```bash
# 检查 Docker 服务状态
sudo systemctl status docker

# 启动 Docker 服务
sudo systemctl start docker

# 设置开机自启
sudo systemctl enable docker

# 查看 Docker 版本
docker version
```

---

## 📚 附录

### A. 常用命令速查表

```bash
# === 镜像操作 ===
docker pull <镜像名>          # 拉取镜像
docker images                 # 列出镜像
docker rmi <镜像ID>           # 删除镜像
docker image prune            # 清理未使用镜像

# === 容器操作 ===
docker run <镜像名>           # 运行容器
docker ps                     # 列出运行中容器
docker ps -a                  # 列出所有容器
docker stop <容器ID>          # 停止容器
docker start <容器ID>         # 启动容器
docker restart <容器ID>       # 重启容器
docker rm <容器ID>            # 删除容器
docker logs <容器ID>          # 查看日志

# === 信息查看 ===
docker inspect <容器/镜像ID>  # 查看详细信息
docker stats                  # 查看资源使用
docker top <容器ID>           # 查看容器进程

# === 系统管理 ===
docker system df              # 查看磁盘使用
docker system prune           # 清理未使用资源
docker version                # 查看版本
docker info                   # 查看系统信息

# === Docker Compose ===
docker compose up -d          # 启动项目
docker compose down           # 停止并删除
docker compose ps             # 查看服务状态
docker compose logs -f        # 查看日志
docker compose restart        # 重启服务
docker compose config         # 验证配置
```

### B. run 命令常用参数

```bash
# 基础参数
-d                    # 后台运行
-i                    # 保持 STDIN 开启
-t                    # 分配伪终端
--rm                  # 容器退出后自动删除
--name <名称>         # 指定容器名称

# 网络参数
-p <宿主端口>:<容器端口>   # 端口映射
-P                          # 随机映射所有端口
--network <网络名>          # 指定网络

# 资源限制
-m, --memory <大小>         # 限制内存
--cpus <数量>               # 限制 CPU
--cpu-shares <权重>         # CPU 相对权重

# 重启策略
--restart no                 # 不重启（默认）
--restart always             # 总是重启
--restart unless-stopped     # 除非手动停止
--restart on-failure[:次数]  # 失败时重启

# 环境变量
-e <变量名>=<值>             # 设置环境变量

# 数据卷
-v <宿主路径>:<容器路径>     # 挂载目录
--mount type=bind,source=<源>,target=<目标>

# 日志
--log-driver <驱动>          # 日志驱动
--log-opt max-size=<大小>    # 日志文件大小
--log-opt max-file=<数量>    # 日志文件数量
```

### C. 重启策略决策树

```
需要自动重启吗？
    ├─ 否 → --restart=no
    └─ 是 → 继续
        │
        手动停止后还要重启吗？
        ├─ 是 → --restart=always
        └─ 否 → 继续
            │
            只在失败时重启吗？
            ├─ 是 → --restart=on-failure[:5]
            └─ 否 → --restart=unless-stopped

推荐：
✅ 生产环境：unless-stopped
✅ 测试环境：on-failure:5
✅ 临时任务：no
```

### D. Docker Compose 容器命名问题速查

```
问题：容器名称太长或重复？

示例问题：
容器名：easytier-web-easytier-web-1
       ─────────── ─────────── ─
         项目名      服务名     序号

解决方案速查：

方案 1：添加 container_name ✅（最推荐）
────────────────────────────────────
container_name: easytier-web

方案 2：使用 -p 参数缩短项目名
────────────────────────────────────
docker compose -p et up -d
# 容器名：et-easytier-web-1

方案 3：使用 .env 文件
────────────────────────────────────
# .env
COMPOSE_PROJECT_NAME=et

# 容器名：et-easytier-web-1

对比：
┌──────────────┬────────────────────────────────┐
│ 方案         │ 容器名                         │
├──────────────┼────────────────────────────────┤
│ 默认         │ easytier-web-easytier-web-1    │
│ container_name│ easytier-web                  │
│ -p et        │ et-easytier-web-1              │
│ .env         │ et-easytier-web-1              │
└──────────────┴────────────────────────────────┘

推荐：使用 container_name（最清晰）
```

### E. 学习资源

```
官方文档：
- Docker 官网：https://www.docker.com
- Docker Hub：https://hub.docker.com
- Docker 文档：https://docs.docker.com
- Docker Compose 文档：https://docs.docker.com/compose/

在线学习：
- Play with Docker：https://labs.play-with-docker.com
- Docker 官方教程：https://docs.docker.com/get-started/

进阶学习：
- Docker Compose
- Docker Swarm
- Kubernetes
```

---

## ✅ 总结

### 核心要点

```
1. Docker 三大概念
   ✅ 镜像（Image）- 只读模板
   ✅ 容器（Container）- 运行实例
   ✅ 仓库（Registry）- 存储分发

2. 基础命令
   ✅ docker pull - 拉取镜像
   ✅ docker run - 运行容器
   ✅ docker ps - 查看容器
   ✅ docker logs - 查看日志

3. 重启策略（重要）
   ✅ no - 不重启
   ✅ unless-stopped - 推荐
   ✅ on-failure - 限制次数
   ✅ always - 总是重启

4. Docker Compose（重要）
   ✅ 使用 YAML 文件定义多容器应用
   ✅ container_name - 自定义容器名
   ✅ docker compose up/down - 一键管理
   ✅ 命名规则：项目名-服务名-序号

5. 最佳实践
   ✅ 使用 --name 命名容器
   ✅ 使用 --restart 设置重启策略
   ✅ 使用 --log-opt 限制日志大小
   ✅ 使用 container_name 避免重复命名
   ✅ 定期清理未使用资源
```

### 下一步学习

```
基础 → 进阶 → 高级

✅ 已掌握：基础操作
    - 镜像管理
    - 容器管理
    - 日志查看
    - Docker Compose 基础

→ 下一步：进阶操作
    - 数据卷管理
    - 网络配置
    - 自定义镜像
    - Docker Compose 高级功能

→ 高级：生产环境
    - 容器编排（Kubernetes）
    - CI/CD 集成
    - 监控和日志
    - 安全加固
```

---

**文档作者**：clearlove.ymg 
**最后更新**：2025-11-06  
**版本**：v1.2（新增 Docker Compose 章节和容器命名详解）  
**许可证**：CC BY-SA 4.0

---

## 🎓 课后练习题

### 练习 1：基础操作（必做）

```bash
# 完成以下任务：
# 1. 拉取 hello-world 镜像
# 2. 运行容器并命名为 my-hello
# 3. 查看容器状态
# 4. 查看容器日志
# 5. 删除容器
# 6. 删除镜像

# 参考答案：
docker pull hello-world
docker run --name my-hello hello-world
docker ps -a | grep my-hello
docker logs my-hello
docker rm my-hello
docker rmi hello-world
```

### 练习 2：重启策略（推荐）

```bash
# 创建三个容器，分别使用不同的重启策略：
# 1. no
# 2. unless-stopped
# 3. on-failure:3

# 观察它们的行为差异

# 参考答案在文档第 10.2 节
```

### 练习 3：综合应用（挑战）

```bash
# 创建一个容器，要求：
# - 名称：my-alpine
# - 镜像：alpine
# - 重启策略：unless-stopped
# - 后台运行
# - 每秒输出一次时间
# - 日志限制：最大 5MB，最多 3 个文件

# 提示：使用 docker run 的多个参数组合

# 参考答案：
docker run -d \
  --name my-alpine \
  --restart unless-stopped \
  --log-opt max-size=5m \
  --log-opt max-file=3 \
  alpine sh -c 'while true; do echo "Time: $(date)"; sleep 1; done'
```

### 练习 4：Docker Compose 容器命名（重要）⭐

```bash
# 任务：理解和解决容器命名问题

# 步骤 1：创建测试目录
mkdir ~/hello-naming-test
cd ~/hello-naming-test

# 步骤 2：创建配置文件（不指定 container_name）
cat > docker-compose.yml <<'EOF'
version: '3.8'
services:
  hello-world:
    image: hello-world
EOF

# 步骤 3：启动并查看容器名
docker compose up -d
docker ps -a | grep hello-world
# 问题：容器名是什么？为什么？

# 步骤 4：清理
docker compose down

# 步骤 5：修改配置（添加 container_name）
cat > docker-compose.yml <<'EOF'
version: '3.8'
services:
  hello-world:
    image: hello-world
    container_name: my-hello  # 添加这行
EOF

# 步骤 6：再次启动并查看
docker compose up -d
docker ps -a | grep hello
# 观察：容器名变成什么了？

# 步骤 7：清理
docker compose down
cd ~
rm -rf ~/hello-naming-test

# 思考题：
# 1. 默认的容器名规则是什么？
# 2. 如何自定义容器名？
# 3. 使用 container_name 的优缺点是什么？

# 参考答案在文档第 9.8 节
```

**继续学习，祝您掌握 Docker！** 🐳