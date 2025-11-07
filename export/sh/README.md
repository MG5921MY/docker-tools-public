# Docker 转换脚本使用说明

## 📌 文档信息

- **创建日期**：2025-11-06
- **最后更新**：2025-11-06
- **脚本版本**：v2.2 ⭐ (重大安全更新)
- **适用系统**：Linux、macOS、WSL
- **文档目的**：说明如何使用 docker run 转 Compose 脚本

---

## 🔒 v2.2 重大安全更新 / Major Security Update

**v2.2 是一个专注于安全性的重大更新！**

### 🆕 新增安全特性

1. **🔐 隐私模式** (`--privacy`) - 隐藏主机路径，保护隐私
2. **🛡️ 核心目录保护** - 防止误操作系统目录，需三次确认
3. **🔍 容器名验证** - 防止路径遍历攻击
4. **🌐 UTF-8 编码** - 避免中文乱码
5. **🔑 增强敏感检测** - 50+ 敏感关键词识别
6. **📁 安全默认目录** - 输出到 `./output/` 而非当前目录
7. **🔗 环境变量引用** - env 模式使用 `${VAR}` 引用
8. **⚠️ 警告系统** - yml 模式自动标记敏感信息

### 📚 重要文档

- **[安全使用指南 (SECURITY_GUIDE.md)](SECURITY_GUIDE.md)** ⭐ 必读！
- **[更新日志 (CHANGELOG_v2.2.md)](CHANGELOG_v2.2.md)** - 详细变更说明

---

## 📦 包含的脚本

### 1. `docker-export-compose.sh` ⭐（推荐使用）

**功能**：功能完善的融合脚本，支持单个、批量、全部导出

**v2.2 核心特性**：
- ✅ **安全性增强**：路径验证、目录保护、敏感信息检测
- ✅ **隐私保护**：隐私模式隐藏主机路径
- ✅ **自定义关键词**：支持 config 文件自定义敏感关键词 ⭐
- ✅ **智能配置**：原容器不存在的配置以注释形式提供 ⭐
- ✅ **自动目录管理**：输出到 ./output/，冲突自动递增
- ✅ **中英文双语**：帮助、警告、错误信息
- ✅ **多种导出模式**：yml（开发）/ env（生产）
- ✅ **模拟运行**：--dry-run 预览
- ✅ **不影响原容器**：只读取配置

**用法**：
```bash
# 单个容器
./docker-export-compose.sh <容器名>

# 批量导出
./docker-export-compose.sh --file containers.txt

# 导出所有运行中容器
./docker-export-compose.sh --all-run

# 查看帮助
./docker-export-compose.sh --help-cn
```

### 2. `docker-run-to-compose.sh`（简化版）

**功能**：将单个容器转换为 docker-compose.yml 配置

**用法**：
```bash
./docker-run-to-compose.sh <容器名> > docker-compose.yml
```

### 3. `batch-convert-to-compose.sh`（简化版）

**功能**：批量转换所有运行中的容器

**用法**：
```bash
./batch-convert-to-compose.sh > docker-compose.yml
```

### 推荐使用

```
推荐：docker-export-compose.sh（功能最完善）✅

其他脚本保留用于学习和特殊场景。
```

---

## 🚀 快速开始（推荐：使用 docker-export-compose.sh）

### ⚠️ 重要提示：请先阅读安全指南！

在使用脚本前，**强烈建议**先阅读 [安全使用指南 (SECURITY_GUIDE.md)](SECURITY_GUIDE.md)

### 步骤 1：赋予执行权限

```bash
# 进入脚本目录
cd /path/to/docker-export-scripts

chmod +x docker-export-compose.sh
chmod +x docker-run-to-compose.sh
chmod +x batch-convert-to-compose.sh
```

### 步骤 2：查看帮助

```bash
# 中文帮助（推荐）
./docker-export-compose.sh --help-cn

# 英文帮助
./docker-export-compose.sh --help

# 查看版本
./docker-export-compose.sh --version
```

### 步骤 3：使用脚本

#### 导出单个容器（最常用）

```bash
# v2.2 基础导出（默认输出到 ./output/）
./docker-export-compose.sh my-container
# 输出：./output/my-container/docker-compose.yml
# ⚠️ 警告：包含明文环境变量！

# ✅ 生产环境推荐：使用 env 模式 + 隐私模式
./docker-export-compose.sh --type env --privacy my-container
# 输出：./output/my-container/
#   ├── docker-compose.yml (使用 ${VAR} 引用)
#   ├── .env (敏感数据，已加入 .gitignore)
#   ├── .env.example (安全模板)
#   ├── .gitignore
#   └── README.md

# 导出到指定目录
./docker-export-compose.sh -o ~/backup my-container

# 查看生成的配置
cat output/my-container/docker-compose.yml
```

#### 批量导出（从文件）

```bash
# 1. 创建容器列表文件
cat > my-containers.txt <<'EOF'
# 我的容器
nginx-web
mysql-db
redis-cache
EOF

# 2. 批量导出
./docker-export-compose.sh --file my-containers.txt

# 3. 查看结果
ls -la */docker-compose.yml
```

#### 导出所有容器

```bash
# 导出所有运行中的容器
./docker-export-compose.sh --all-run

# 导出所有容器（包括已停止）
./docker-export-compose.sh --all

# 导出已停止的容器
./docker-export-compose.sh --all-stop
```

---

## 📝 使用示例

### 示例 1：导出单个 EasyTier 容器

```bash
# 假设您有一个运行中的 EasyTier 容器
docker ps | grep easytier

# 使用融合脚本导出
./docker-export-compose.sh easytier-web

# 输出：
# [INFO] 转换容器：easytier-web → ./easytier-web/docker-compose.yml
# [SUCCESS] 导出成功：./easytier-web/docker-compose.yml

# 查看生成的文件
cat easytier-web/docker-compose.yml

# 进入目录测试
cd easytier-web
docker compose config  # 验证配置
docker compose up -d   # 测试启动

# 验证
docker compose ps

# 如果测试成功，停止原容器
docker stop easytier-web
docker rm easytier-web

# 保持 Compose 容器运行
docker compose ps
```

### 示例 2：批量导出多个容器

```bash
# 场景：您有多个容器需要迁移到 Compose

# 步骤 1：创建容器列表
cat > my-containers.txt <<'EOF'
# 我的容器列表
nginx-web
mysql-db
redis-cache
easytier-web
EOF

# 步骤 2：批量导出
./docker-export-compose.sh --file my-containers.txt

# 输出：
# [INFO] 从文件读取容器列表：my-containers.txt
# [INFO] 文件包含 5 行，有效容器 4 个
# [INFO] 转换容器：nginx-web → ./nginx-web/docker-compose.yml
# [SUCCESS] 导出成功：./nginx-web/docker-compose.yml
# ...

# 步骤 3：查看结果
ls -la */docker-compose.yml

# 步骤 4：逐个验证和迁移
for dir in */; do
    echo "处理: $dir"
    cd "$dir"
    docker compose config && echo "✅ 配置正确"
    cd ..
done
```

### 示例 3：导出所有运行中的容器

```bash
# 导出所有运行中的容器到备份目录
./docker-export-compose.sh --all-run -o /backup/docker-configs

# 输出：
# [INFO] 导出所有运行中的容器
# [INFO] 找到 5 个容器
# 
# 容器列表：
#   - nginx-web (nginx:latest) [running]
#   - mysql-db (mysql:8.0) [running]
#   - redis-cache (redis:alpine) [running]
#   - easytier-web (easytier/easytier:latest) [running]
#   - portainer (portainer/portainer-ce:latest) [running]
# 
# [INFO] 转换容器：nginx-web → /backup/docker-configs/nginx-web/docker-compose.yml
# [SUCCESS] 导出成功：/backup/docker-configs/nginx-web/docker-compose.yml
# ...

# 查看备份结构
tree /backup/docker-configs/
```

### 示例 4：处理目录冲突

```bash
# 第一次导出
./docker-export-compose.sh my-container
# 输出：./my-container/docker-compose.yml

# 第二次导出（不覆盖）
./docker-export-compose.sh my-container
# 输出：./my-container_1/docker-compose.yml

# 第三次导出
./docker-export-compose.sh my-container
# 输出：./my-container_2/docker-compose.yml

# 使用覆盖模式
./docker-export-compose.sh --overwrite my-container
# 输出：./my-container/docker-compose.yml（覆盖）

# 查看目录
ls -d my-container*/
# my-container/
# my-container_1/
# my-container_2/
```

---

## ⚙️ 命令选项详解

### docker-export-compose.sh 完整选项

```bash
# 基础选项
-h, --help              # 显示英文帮助
--help-cn               # 显示中文帮助
-v, --version           # 显示版本信息

# 输出选项
-o, --output <目录>     # 指定输出目录（默认：当前目录）
--overwrite             # 覆盖已存在的文件（默认：自动递增）

# 输入选项
<容器名>                # 导出单个容器
-f, --file <文件>       # 从文件批量导出
--all                   # 导出所有容器
--all-run               # 导出所有运行中的容器
--all-stop              # 导出所有已停止的容器

# 运行模式
--dry-run               # 模拟运行，不实际创建文件
--quiet                 # 安静模式，最小化输出
```

### 自动提取的配置

脚本会自动提取以下配置：

- ✅ 镜像名称和标签
- ✅ 容器名称
- ✅ 重启策略（自动优化 always → unless-stopped）
- ✅ 网络模式（host、bridge 等）
- ✅ 端口映射（TCP/UDP）
- ✅ 数据卷挂载
- ✅ 环境变量（过滤系统变量）
- ✅ 工作目录
- ✅ Capabilities (NET_ADMIN 等)
- ✅ Devices (/dev/net/tun 等)
- ✅ 入口点 (entrypoint)
- ✅ 命令 (command)
- ✅ 资源限制（内存、CPU）
- ✅ 自动添加日志配置建议

### 脚本输出示例

```yaml
version: '3.8'

services:
  my-container:
    image: alpine:latest
    container_name: my-container
    restart: unless-stopped
    network_mode: "host"
    
    ports:
      - "8080:80"
      - "22020:22020/udp"
    
    volumes:
      - ./data:/app
      - ./logs:/logs
    
    environment:
      - TZ=Asia/Shanghai
      - APP_ENV=production
    
    cap_add:
      - NET_ADMIN
      - NET_RAW
    
    devices:
      - /dev/net/tun:/dev/net/tun
    
    command:
      - sh
      - -c
      - while true; do echo 'Running'; sleep 5; done
    
    # 建议添加日志限制
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    
    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 512M
```

---

## ⚠️ 注意事项

### 1. 检查生成的配置

```bash
# 验证配置文件语法
docker compose config

# 如果有错误，会显示具体位置
```

### 2. 调整建议

生成的配置可能需要手动调整：

```yaml
# 建议修改：
1. restart: always → restart: unless-stopped

2. 检查端口映射格式
   - "8080:80"      # 正确
   - "8080:80/tcp"  # 如果明确指定 TCP
   - "22020:22020/udp"  # UDP 端口必须标注

3. 检查相对路径
   - ./data:/app    # 相对路径（相对于 docker-compose.yml）
   - /data:/app     # 绝对路径

4. 添加健康检查（可选）
   healthcheck:
     test: ["CMD", "echo", "ok"]
     interval: 30s

5. 添加依赖关系（如果有多个服务）
   depends_on:
     - database
```

### 3. 数据迁移

```bash
# 如果使用了数据卷，确保数据路径正确

# 查看原容器的数据卷
docker inspect <容器名> --format='{{range .Mounts}}{{.Source}} → {{.Destination}}{{"\n"}}{{end}}'

# 确保 docker-compose.yml 中的路径与原容器一致
```

### 4. 网络配置

```bash
# 如果多个容器需要互相通信，添加网络配置

# 在 docker-compose.yml 末尾添加：
networks:
  app-network:
    driver: bridge

# 在每个服务中添加：
services:
  service1:
    ...
    networks:
      - app-network
```

---

## 🔧 故障排查

### 问题 1：脚本没有执行权限

```bash
# 错误
-bash: ./docker-run-to-compose.sh: Permission denied

# 解决
chmod +x docker-run-to-compose.sh
```

### 问题 2：容器不存在

```bash
# 错误
错误：容器 'xxx' 不存在

# 解决
# 查看所有容器
docker ps -a

# 使用正确的容器名或 ID
./docker-run-to-compose.sh <正确的容器名>
```

### 问题 3：生成的配置无法启动

```bash
# 验证配置语法
docker compose config

# 查看错误信息
docker compose up

# 常见问题：
# - 端口已被占用 → 修改端口映射
# - 数据卷路径不存在 → 创建目录或修改路径
# - 环境变量缺失 → 添加必要的环境变量
```

---

## 📊 实战对比

### 使用 docker run（复杂）

```bash
# 需要记住所有参数
docker run -d \
  --name myapp \
  --restart unless-stopped \
  -p 8080:80 \
  -p 22020:22020/udp \
  -v /data/app:/app \
  -v /data/logs:/logs \
  -e TZ=Asia/Shanghai \
  -e APP_ENV=production \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  --memory 512m \
  --cpus 1.5 \
  alpine sh -c "while true; do echo 'Running'; sleep 5; done"

# 难以管理和复制
```

### 转换为 Compose（简单）

```bash
# 1. 转换
./docker-run-to-compose.sh myapp > docker-compose.yml

# 2. 以后只需
docker compose up -d    # 启动
docker compose down     # 停止
docker compose restart  # 重启
docker compose logs -f  # 查看日志

# 3. 配置可版本管理
git add docker-compose.yml
git commit -m "Add Docker Compose config"

# 4. 易于分享和复制
```

---

## 🎯 最佳实践

### 1. 转换后的优化建议

```yaml
# 生成的基础配置
version: '3.8'

services:
  myapp:
    image: alpine
    container_name: myapp
    restart: unless-stopped

# 建议添加：

# 1. 健康检查
    healthcheck:
      test: ["CMD", "ping", "-c", "1", "127.0.0.1"]
      interval: 30s
      timeout: 10s
      retries: 3

# 2. 资源限制
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

# 3. 标签（便于管理）
    labels:
      - "com.example.description=My Application"
      - "com.example.version=1.0"

# 4. 网络
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### 2. 版本管理

```bash
# 将配置纳入 Git 管理
git init
git add docker-compose.yml
git add .env
git commit -m "Initial Docker Compose configuration"

# 创建 .gitignore
cat > .gitignore <<'EOF'
# 数据目录
data/
logs/

# 环境变量（如包含敏感信息）
.env.local
.env.production

# Docker 数据卷
volumes/
EOF
```

### 3. 环境分离

```bash
# 为不同环境创建不同配置

# docker-compose.yml - 基础配置
# docker-compose.dev.yml - 开发环境
# docker-compose.prod.yml - 生产环境

# 使用开发配置
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 使用生产配置
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 📊 命令速查表

```bash
# ═══════════════════════════════════════════
# v2.2 推荐命令
# ═══════════════════════════════════════════

# 开发环境：快速导出
./docker-export-compose.sh <容器名>

# 生产环境：安全导出（推荐）⭐
./docker-export-compose.sh --type env --privacy <容器名>

# ═══════════════════════════════════════════
# 基础命令
# ═══════════════════════════════════════════

# 单个容器导出
./docker-export-compose.sh <容器名>

# 指定输出目录
./docker-export-compose.sh -o <目录> <容器名>

# 批量导出（从文件）
./docker-export-compose.sh --file <文件>

# 导出所有运行中容器
./docker-export-compose.sh --all-run

# 导出所有容器
./docker-export-compose.sh --all

# 导出已停止容器
./docker-export-compose.sh --all-stop

# ═══════════════════════════════════════════
# v2.2 新增选项
# ═══════════════════════════════════════════

# 隐私模式（隐藏主机路径）
./docker-export-compose.sh --privacy <容器名>

# env 模式（分离敏感信息）
./docker-export-compose.sh --type env <容器名>

# 组合使用（最安全）⭐
./docker-export-compose.sh --type env --privacy <容器名>

# 强制输出到核心目录（危险！）
./docker-export-compose.sh -o /etc --must-output <容器名>

# ═══════════════════════════════════════════
# 其他选项
# ═══════════════════════════════════════════

# 模拟运行（预览）
./docker-export-compose.sh --dry-run <容器名>

# 覆盖模式
./docker-export-compose.sh --overwrite <容器名>

# 安静模式
./docker-export-compose.sh --quiet --all-run

# 组合使用
./docker-export-compose.sh --file list.txt -o ~/backup --type env --privacy

# ═══════════════════════════════════════════
# 帮助和信息
# ═══════════════════════════════════════════

# 中文帮助
./docker-export-compose.sh --help-cn

# 英文帮助
./docker-export-compose.sh --help

# 版本信息（查看 v2.2 新特性）
./docker-export-compose.sh --version
```

## 🔐 安全使用建议 / Security Recommendations

### 根据场景选择合适的命令

| 场景 | 推荐命令 | 说明 |
|------|---------|------|
| 本地开发测试 | `./docker-export-compose.sh my-app` | 快速导出，仅限本地使用 |
| 生产环境部署 | `./docker-export-compose.sh --type env --privacy my-app` | 最安全，推荐 ⭐ |
| 分享配置 | `./docker-export-compose.sh --type env --privacy my-app` | 只分享 .env.example |
| 批量备份 | `./docker-export-compose.sh --all-run --type env -o ~/backup` | 完整备份 |
| 查看配置 | `./docker-export-compose.sh --dry-run my-app` | 预览不创建文件 |

---

## 📖 相关文档

### 📚 详细文档（docs/ 目录）

- **[1_安全使用指南](docs/1_安全使用指南.md)** ⭐⭐⭐ 必读！
  - 安全性增强概述
  - 重要安全警告
  - 安全最佳实践
  - 使用场景示例
  - 安全检查清单
  - 故障排查指南

- **[2_配置文件指南](docs/2_配置文件指南.md)** ⭐⭐
  - config 文件完整说明
  - 自定义敏感关键词
  - 排除功能详解（! 前缀）⭐
  - 格式要求和示例
  - 最佳实践和故障排查

- **[3_快速参考](docs/3_快速参考.md)** ⭐⭐
  - 命令速查表
  - 场景选择指南
  - 故障快速排查
  - 安全警告速查

- **[4_完整使用指南](docs/4_完整使用指南.md)**
  - 详细功能说明
  - 完整使用示例
  - 高级技巧
  - 实战案例

- **[5_更新日志](docs/5_更新日志.md)**
  - 版本历史
  - 新特性详解
  - 迁移指南
  - 已修复问题

- **[文档索引](docs/0_README.md)**
  - 完整文档导航
  - 推荐阅读顺序

### 📚 推荐阅读顺序

**新手用户**:
1. 本文档 README.md（10分钟）- 快速上手
2. [3_快速参考](docs/3_快速参考.md)（5分钟）- 命令速查
3. [1_安全使用指南](docs/1_安全使用指南.md)（15分钟）- 安全实践

**生产环境用户** ⭐:
1. [1_安全使用指南](docs/1_安全使用指南.md)（15分钟）- 必读
2. [2_配置文件指南](docs/2_配置文件指南.md)（15分钟）- 自定义配置
3. [3_快速参考](docs/3_快速参考.md)（5分钟）- 快速查阅

**高级用户**:
1. [3_快速参考](docs/3_快速参考.md)（5分钟）- 快速上手
2. [4_完整使用指南](docs/4_完整使用指南.md)（30分钟）- 全面了解
3. [5_更新日志](docs/5_更新日志.md)（10分钟）- 版本历史

---

## 🆘 获取帮助

### 脚本内置帮助

```bash
# 查看中文帮助（推荐）
./docker-export-compose.sh --help-cn

# 查看英文帮助
./docker-export-compose.sh --help

# 查看版本
./docker-export-compose.sh --version
```

### 常见问题

**Q: 脚本在 Windows 上能用吗？**  
A: 需要在 WSL（Windows Subsystem for Linux）或 Git Bash 中运行

**Q: 转换后的配置一定能用吗？**  
A: 大部分情况可以，但建议先验证配置：`docker compose config`

**Q: 能转换已停止的容器吗？**  
A: 可以！使用 `./docker-export-compose.sh --all-stop`

**Q: 会影响原容器运行吗？**  
A: 不会！脚本只读取容器配置，不修改或停止容器

**Q: 目录已存在怎么办？**  
A: 默认自动递增（容器名_1, 容器名_2...），或使用 `--overwrite` 覆盖

**Q: 如何批量导出？**  
A: 使用 `--file` 选项或 `--all-run` 选项

---

## ✅ 总结

### v2.2 核心优势

```
docker-export-compose.sh v2.2 - 企业级安全的转换工具

🔒 安全性增强（v2.2 新增）
   - 隐私模式保护路径信息
   - 核心目录保护（三次确认）
   - 路径遍历攻击防护
   - 50+ 敏感关键词检测
   - 环境变量引用（${VAR}）
   - 警告系统（明文敏感信息）

✅ 功能完善
   - 单个、批量、全部导出
   - 自动目录管理（./output/）
   - 中英文双语支持
   - UTF-8 编码避免乱码

✅ 安全可靠
   - 不影响原容器
   - 支持模拟运行
   - 自动备份（递增）
   - 敏感信息分离（env 模式）

✅ 智能优化
   - 自动优化重启策略
   - 过滤系统变量
   - 添加配置建议
   - 生成完整文档
```

### v2.2 推荐安全工作流 ⭐

```
1. 阅读安全指南
   查看 SECURITY_GUIDE.md

2. 选择合适的模式
   开发：./docker-export-compose.sh <容器名>
   生产：./docker-export-compose.sh --type env --privacy <容器名>

3. 导出配置
   ./docker-export-compose.sh --type env --privacy my-app

4. 检查敏感信息
   确认 .env 已被 .gitignore
   确认 docker-compose.yml 使用 ${VAR} 引用

5. 验证配置
   cd output/my-app
   docker compose config

6. 测试启动
   docker compose up -d

7. 确认无误
   docker compose ps
   docker compose logs

8. 迁移（可选）
   docker stop <原容器>
   docker rm <原容器>

9. 版本管理（如果需要）
   git add docker-compose.yml .env.example README.md .gitignore
   git commit -m "Add Docker Compose config"
   # 注意：.env 会被自动忽略
```

---

**最后更新**：2025-11-06  
**版本**：v2.2 (重大安全更新)  
**许可证**：MIT License  
**作者**：clearlove.ymg

