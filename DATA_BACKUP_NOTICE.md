# ⚠️ 数据备份重要提醒

## 📋 重要说明

**本工具仅导出 Docker 容器的配置信息，不包含持久化数据本身。**

---

## 🔍 本工具导出的内容

### ✅ 导出的配置信息

本工具会导出以下配置信息到 `docker-compose.yml` 文件：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 镜像信息 | 容器使用的镜像名称和标签 | `nginx:latest` |
| 端口映射 | 容器端口与主机端口的映射关系 | `8080:80` |
| 环境变量 | 容器的环境变量配置 | `MYSQL_ROOT_PASSWORD` |
| 数据卷路径 | 数据卷的挂载路径配置 | `/data:/app/data` |
| 网络配置 | 容器的网络设置 | `network_mode: bridge` |
| 重启策略 | 容器重启规则 | `restart: unless-stopped` |
| 资源限制 | CPU、内存限制配置 | `cpus: '0.5'` |
| 其他配置 | 命令、工作目录等 | `command: npm start` |

### ❌ 不导出的内容

**重要：本工具不会备份以下内容**：

| 不包含的内容 | 说明 | 需要手动备份 |
|-------------|------|-------------|
| 数据卷中的实际数据 | 挂载到容器的文件和数据库 | ✅ 必须手动备份 |
| 容器内部修改 | 容器运行时产生的临时数据 | ✅ 如有需要需手动备份 |
| 镜像本身 | Docker 镜像文件 | ✅ 建议导出镜像 |
| 自定义网络配置 | Docker 网络的详细配置 | ✅ 记录网络设置 |

---

## 🛡️ 数据备份最佳实践

### 1. 导出容器配置

```bash
# 使用本工具导出配置
cd export/sh
./docker-export-compose.sh --type env --privacy my-container
```

**作用**：保存容器的配置信息，方便重建容器。

### 2. 备份数据卷数据 ⭐ 重要

根据导出的 `docker-compose.yml` 中的数据卷配置，手动备份实际数据：

#### 方法 1：直接复制数据卷目录（推荐）

```bash
# 查看 docker-compose.yml 中的数据卷配置
# 例如：volumes: - ./data:/app/data

# 停止容器（可选，确保数据一致性）
docker stop my-container

# 备份数据卷目录
tar -czf data-backup-$(date +%Y%m%d).tar.gz ./data/

# 重启容器
docker start my-container
```

#### 方法 2：使用 docker cp 命令

```bash
# 从容器中复制数据
docker cp my-container:/app/data ./backup/data

# 打包备份
tar -czf data-backup-$(date +%Y%m%d).tar.gz ./backup/data
```

#### 方法 3：使用专业备份工具

**数据库类容器**：

```bash
# MySQL/MariaDB
docker exec my-mysql mysqldump -u root -p'password' dbname > backup.sql

# PostgreSQL
docker exec my-postgres pg_dump -U postgres dbname > backup.sql

# MongoDB
docker exec my-mongo mongodump --out /backup
```

**文件存储类容器**：

```bash
# 使用 rsync 增量备份
rsync -avz ./data/ /backup/data/
```

### 3. 导出 Docker 镜像（可选）

```bash
# 查看容器使用的镜像
docker inspect my-container | grep Image

# 导出镜像
docker save nginx:latest -o nginx-latest.tar

# 压缩镜像
gzip nginx-latest.tar
```

### 4. 记录网络和其他配置

```bash
# 导出网络配置信息
docker network ls > networks.txt
docker network inspect my-network > my-network.json
```

---

## 📦 完整备份方案示例

### 场景：备份一个包含数据库的 Web 应用

```bash
#!/bin/bash
# 完整备份脚本示例

BACKUP_DIR="/backup/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# 1. 导出容器配置
cd /path/to/DockerTools/export/sh
./docker-export-compose.sh --type env --privacy my-webapp
cp -r output/my-webapp "$BACKUP_DIR/config"

# 2. 备份数据库
docker exec my-webapp-db mysqldump -u root -p'password' --all-databases > "$BACKUP_DIR/database.sql"

# 3. 备份应用数据
tar -czf "$BACKUP_DIR/app-data.tar.gz" /path/to/webapp/data

# 4. 导出镜像（可选）
docker save my-webapp:latest | gzip > "$BACKUP_DIR/my-webapp-image.tar.gz"

# 5. 创建备份清单
cat > "$BACKUP_DIR/README.txt" <<EOF
备份时间: $(date)
容器配置: config/
数据库备份: database.sql
应用数据: app-data.tar.gz
镜像文件: my-webapp-image.tar.gz
EOF

echo "备份完成: $BACKUP_DIR"
```

---

## 🔄 从备份恢复

### 1. 恢复容器配置

```bash
# 进入备份的配置目录
cd backup/config/my-webapp

# 修改 .env 文件（填入实际的敏感信息）
nano .env

# 启动容器（不包含数据）
docker compose up -d
```

### 2. 恢复数据

```bash
# 停止容器
docker compose down

# 恢复数据卷数据
tar -xzf data-backup.tar.gz -C ./

# 恢复数据库（如适用）
docker compose up -d db
docker exec -i my-webapp-db mysql -u root -p'password' < database.sql

# 启动所有服务
docker compose up -d
```

---

## ⚠️ 常见误解

### ❌ 误解 1：导出配置 = 完整备份

**错误认识**：
> "我用工具导出了 docker-compose.yml，数据已经备份了。"

**正确认识**：
> docker-compose.yml 只包含配置信息，实际数据需要单独备份。

### ❌ 误解 2：重建容器会恢复数据

**错误认识**：
> "我可以用 docker-compose.yml 重建容器，数据会自动回来。"

**正确认识**：
> 重建容器只会创建一个新的空容器，原有数据不会自动恢复。

### ❌ 误解 3：数据卷路径就是备份

**错误认识**：
> "配置文件里有数据卷路径，数据就安全了。"

**正确认识**：
> 数据卷路径只是配置信息，实际数据文件需要单独复制备份。

---

## 📋 备份检查清单

在迁移或恢复容器之前，请确认：

- [ ] ✅ 已使用本工具导出容器配置（docker-compose.yml）
- [ ] ✅ 已备份所有数据卷的实际数据文件
- [ ] ✅ 已备份数据库数据（如适用）
- [ ] ✅ 已记录或导出使用的 Docker 镜像
- [ ] ✅ 已记录网络配置（如有自定义网络）
- [ ] ✅ 已测试备份文件的完整性
- [ ] ✅ 已在测试环境验证恢复流程
- [ ] ✅ 备份文件已安全存储（多地备份）

---

## 💡 推荐的备份策略

### 定期备份

```bash
# 每日自动备份脚本（cron job）
# 添加到 crontab: 0 2 * * * /path/to/backup-script.sh

#!/bin/bash
# backup-script.sh

DATE=$(date +%Y%m%d)
BACKUP_ROOT="/backup"

# 导出配置
cd /path/to/DockerTools/export/sh
./docker-export-compose.sh --all-run --type env -o "$BACKUP_ROOT/$DATE/configs"

# 备份数据（根据实际情况调整）
tar -czf "$BACKUP_ROOT/$DATE/data.tar.gz" /path/to/data

# 保留最近 30 天的备份
find $BACKUP_ROOT -type d -mtime +30 -exec rm -rf {} +
```

### 3-2-1 备份规则

遵循专业的 3-2-1 备份原则：

- **3** 份副本：原始数据 + 2 份备份
- **2** 种介质：本地磁盘 + 云存储/移动硬盘
- **1** 份异地：至少一份备份存储在不同物理位置

---

## 🆘 数据丢失风险场景

### 高风险操作

以下操作可能导致数据丢失，请务必先备份：

| 操作 | 风险 | 建议 |
|------|------|------|
| `docker rm -v container` | 🔴 高危 - 删除数据卷 | 先备份数据卷 |
| `docker system prune -a --volumes` | 🔴 极高危 - 删除所有未使用资源 | 谨慎使用，提前全面备份 |
| 重装系统/Docker | 🔴 高危 - 丢失所有数据 | 必须提前备份 |
| 修改数据卷挂载点 | 🟡 中危 - 可能找不到数据 | 记录原始路径 |
| 升级容器镜像 | 🟡 中危 - 兼容性问题 | 测试环境先验证 |

---

## 📞 获取帮助

如果您对数据备份有疑问：

1. **查看容器数据卷配置**
   ```bash
   docker inspect my-container | grep -A 10 Mounts
   ```

2. **查看数据卷实际位置**
   ```bash
   docker volume inspect volume-name
   ```

3. **参考 Docker 官方文档**
   - [Docker Volumes](https://docs.docker.com/storage/volumes/)
   - [Backup and Restore](https://docs.docker.com/storage/volumes/#backup-restore-or-migrate-data-volumes)

---

## 📄 免责声明

**重要提示**：

1. 本工具仅负责导出容器配置信息
2. 数据备份是用户的责任
3. 使用前请充分测试备份和恢复流程
4. 建议在测试环境先验证完整性
5. 重要数据请遵循 3-2-1 备份原则
6. 本工具不对任何数据丢失负责

**使用本工具前，请确保您已经理解：**
- ✅ 配置导出 ≠ 数据备份
- ✅ 需要单独备份数据卷中的实际数据
- ✅ 需要测试备份的可恢复性
- ✅ 数据安全是您自己的责任

---

**文档版本**: v1.0  
**创建日期**: 2025-11-07  
**维护者**: clearlove.ymg  
**许可证**: MIT License

---

<div align="center">

**请务必在使用前阅读并理解本文档！**

[返回主文档](README.md) | [查看使用指南](export/sh/README.md)

</div>

