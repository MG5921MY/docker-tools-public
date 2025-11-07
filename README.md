# DockerTools - Docker 容器管理工具集

<div align="center">

**功能强大、安全可靠的 Docker 容器配置导出和管理工具**

[![Version](https://img.shields.io/badge/version-2.2-blue.svg)](export/sh/CHANGELOG_v2.2.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Shell](https://img.shields.io/badge/shell-bash-orange.svg)](export/sh/docker-export-compose.sh)
[![Security](https://img.shields.io/badge/security-enhanced-red.svg)](export/sh/SECURITY_GUIDE.md)

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [文档](#-文档) • [更新日志](#-更新日志)

</div>

---

## 📋 项目简介

DockerTools 是一个专业的 Docker 容器管理工具集，主要功能是将运行中的 Docker 容器导出为 docker-compose.yml 配置文件，帮助您：

- ✅ **迁移容器**：从 `docker run` 命令迁移到 Docker Compose
- ✅ **备份配置**：批量导出所有容器的配置
- ✅ **版本管理**：将容器配置纳入 Git 版本控制
- ✅ **团队协作**：安全地分享容器配置（自动处理敏感信息）
- ✅ **文档化**：自动生成完整的配置文档

### ⚠️ 重要提醒

**本工具仅导出容器配置信息，不包含持久化数据备份**

- 📋 **导出内容**：容器的配置、环境变量、端口映射、数据卷路径等配置信息
- 💾 **需手动备份**：数据卷中的实际数据、数据库文件等持久化内容
- 🔒 **使用前必读**：[数据备份重要提醒](DATA_BACKUP_NOTICE.md) | [免责声明](DISCLAIMER.md)

---

## 🔒 v2.2 重大安全更新

**最新版本引入了多项企业级安全特性**：

### 新增安全功能

1. **🔐 隐私模式** (`--privacy`) - 隐藏主机路径，保护隐私
2. **🛡️ 核心目录保护** - 防止误操作系统目录，需三次确认
3. **🔍 容器名验证** - 防止路径遍历攻击
4. **🔑 增强敏感检测** - 50+ 敏感关键词识别
5. **🎛️ 自定义关键词** - 支持 config 文件自定义敏感关键词 ⭐
6. **📝 智能配置提示** - 原容器不存在的配置以注释形式提供 ⭐
7. **🌐 UTF-8 编码** - 避免中文乱码
8. **📁 安全默认目录** - 输出到 `./output/` 而非当前目录
9. **🔗 环境变量引用** - env 模式使用 `${VAR}` 引用
10. **⚠️ 警告系统** - yml 模式自动标记敏感信息

**👉 详细说明请参阅 [安全使用指南](export/sh/docs/1_安全使用指南.md)**

---

## ✨ 功能特性

### 核心功能

| 功能 | 说明 | 支持版本 |
|------|------|---------|
| 单容器导出 | 导出单个容器配置 | v1.0+ |
| 批量导出 | 从文件或自动发现批量导出 | v1.0+ |
| 环境变量分离 | 敏感信息分离到 .env 文件 | v2.0+ |
| 隐私保护 | 隐藏主机路径信息 | v2.2+ ⭐ |
| 安全检查 | 路径验证、核心目录保护 | v2.2+ ⭐ |
| 中英双语 | 完整的中英文支持 | v2.0+ |
| 自动文档 | 生成 README 和使用说明 | v2.0+ |

### 导出模式

#### yml 模式（默认）
```bash
./docker-export-compose.sh my-container
```
- ✅ 快速简单
- ⚠️ 包含明文环境变量
- 📁 仅生成 docker-compose.yml

#### env 模式（生产推荐）⭐
```bash
./docker-export-compose.sh --type env --privacy my-container
```
- ✅ 敏感信息分离
- ✅ 路径隐私保护
- ✅ Git 友好
- 📁 生成完整文件集：
  - docker-compose.yml（使用 `${VAR}` 引用）
  - .env（实际敏感数据，自动 gitignore）
  - .env.example（安全模板）
  - .gitignore
  - README.md

---

## 🚀 快速开始

### 前提条件

- Docker 已安装并运行
- Bash 环境（Linux、macOS、WSL）
- 有运行中的 Docker 容器

### 安装

```bash
# 克隆或下载项目
git clone <repository-url>
cd DockerTools

# 进入脚本目录
cd export/sh

# 赋予执行权限
chmod +x docker-export-compose.sh
```

### 基础使用

```bash
# 1. 查看帮助（中文）
./docker-export-compose.sh --help-cn

# 2. 导出单个容器（开发环境）
./docker-export-compose.sh my-container

# 3. 导出单个容器（生产环境）⭐ 推荐
./docker-export-compose.sh --type env --privacy my-container

# 4. 批量导出所有运行中的容器
./docker-export-compose.sh --all-run --type env -o ~/backup

# 5. 从文件批量导出
echo "nginx-web" > containers.txt
echo "mysql-db" >> containers.txt
./docker-export-compose.sh --file containers.txt
```

### 输出结果

```
./output/
└── my-container/
    ├── docker-compose.yml  # Compose 配置（使用 ${VAR} 引用）
    ├── .env                # 实际敏感数据（已加入 .gitignore）
    ├── .env.example        # 安全模板（可分享）
    ├── .gitignore          # Git 忽略配置
    └── README.md           # 使用说明
```

---

## 📚 文档

### 📖 核心文档（必读）

| 文档 | 说明 | 时间投入 | 优先级 |
|------|------|---------|--------|
| [脚本使用说明](export/sh/README.md) | 快速开始和基础使用 | 10分钟 | ⭐⭐⭐ |
| [安全使用指南](export/sh/docs/1_安全使用指南.md) | 安全最佳实践和警告 | 15分钟 | ⭐⭐⭐ |
| [快速参考](export/sh/docs/3_快速参考.md) | 命令速查和故障排查 | 5分钟 | ⭐⭐ |
| [配置文件指南](export/sh/docs/2_配置文件指南.md) | config 文件和排除功能 | 15分钟 | ⭐⭐ |
| [Docker 基础教学](docs/Docker%20基础教学%20-%20Hello%20World%20入门指南.md) | Docker 入门教程 | 2小时 | ⭐⭐ |

### 📋 详细文档

- [完整使用指南](export/sh/docs/4_完整使用指南.md) - 所有功能详解
- [更新日志](export/sh/docs/5_更新日志.md) - 版本历史和新特性
- [脚本文档索引](export/sh/docs/0_README.md) - 脚本文档导航
- [项目文档中心](docs/README.md) - 完整文档索引

---

## 🎯 使用场景

### 场景 1：本地开发测试

```bash
# 快速导出查看配置
./docker-export-compose.sh my-dev-app
cd output/my-dev-app
docker compose up -d
```

**适用于**：快速测试、配置查看  
**⚠️ 注意**：不要提交到 Git（包含明文敏感信息）

---

### 场景 2：生产环境部署 ⭐

```bash
# 安全导出（推荐）
./docker-export-compose.sh --type env --privacy my-prod-app

# 查看生成的文件
cd output/my-prod-app
ls -la

# 提交到 Git（.env 自动被忽略）
git add docker-compose.yml .env.example README.md .gitignore
git commit -m "Add production config"
```

**适用于**：生产环境部署、团队协作  
**✅ 优势**：敏感信息安全分离，路径隐私保护

---

### 场景 3：批量备份

```bash
# 备份所有运行中的容器
./docker-export-compose.sh --all-run --type env --privacy -o ~/docker-backup

# 打包
cd ~
tar -czf docker-backup-$(date +%Y%m%d).tar.gz docker-backup/
```

**适用于**：定期备份、服务器迁移  
**✅ 优势**：完整保留配置，易于恢复

---

### 场景 4：团队协作分享

```bash
# 导出配置
./docker-export-compose.sh --type env --privacy shared-app

# 只分享这些文件（安全）
cd output/shared-app
git add docker-compose.yml .env.example README.md
# .env 会被自动忽略（包含敏感信息）

# 团队成员使用
# git clone <repo>
# cp .env.example .env
# nano .env  # 填写实际配置
# docker compose up -d
```

**适用于**：团队协作、配置分享  
**✅ 优势**：安全分享模板，各自填写敏感信息

---

## 🔧 高级用法

### 自定义敏感关键词 (v2.2 新增) ⭐

脚本支持通过 `config` 文件添加组织/项目特定的敏感关键词：

```bash
# 进入脚本目录
cd export/sh

# 编辑 config 文件（首次运行会自动创建模板）
nano config

# 添加自定义关键词（每行一个）
# 公司特定命名
MYCOMPANY_SECRET
COMPANY_API_KEY
INTERNAL_TOKEN

# 运行脚本，自动加载自定义关键词
./docker-export-compose.sh --type env my-container

# 输出示例：
# [INFO] 加载自定义敏感关键词：/path/to/config
# [SUCCESS] 成功加载 3 个自定义关键词
```

**详细说明**: 请参阅 [配置文件指南](export/sh/docs/2_配置文件指南.md)

### 组合参数使用

```bash
# 最安全的导出方式（推荐）
./docker-export-compose.sh --type env --privacy --quiet my-app

# 批量导出到指定目录（覆盖模式）
./docker-export-compose.sh --all-run --type env --overwrite -o /backup

# 预览不执行（dry-run）
./docker-export-compose.sh --dry-run --privacy my-app

# 从文件批量导出（安静模式）
./docker-export-compose.sh --file list.txt --type env --quiet
```

### 特殊场景

```bash
# 强制输出到系统目录（危险！需三次确认）
./docker-export-compose.sh -o /etc my-app
# 或跳过确认（非常危险！）
./docker-export-compose.sh -o /etc --must-output my-app
```

---

## 📊 性能说明

### 执行效率

| 操作 | 时间 | 说明 |
|------|------|------|
| 单容器导出 | 2-3秒 | 快速响应 |
| 10容器批量 | 25-30秒 | 线性增长 |
| 50容器批量 | 2分钟 | 可接受 |
| 100容器批量 | 4分钟 | 建议分批 |

### 资源占用

- **内存使用**: <10MB
- **CPU 使用**: 25-35%（主要等待 I/O）
- **磁盘 I/O**: 低

**详细性能分析**: 请参阅性能分析报告（已完成）

---

## 🛡️ 安全性

### v2.2 安全增强

| 安全特性 | 说明 | 状态 |
|---------|------|------|
| 路径遍历防护 | 验证容器名，防止 `../` 攻击 | ✅ |
| 核心目录保护 | 防止输出到 /etc、/bin 等系统目录 | ✅ |
| 敏感信息检测 | 50+ 敏感关键词自动识别 | ✅ |
| 隐私模式 | 隐藏主机路径信息 | ✅ |
| 环境变量分离 | .env 文件自动 gitignore | ✅ |
| 警告系统 | yml 模式标记敏感信息 | ✅ |

### 已修复的安全问题

| 问题 | 严重程度 | 状态 |
|------|---------|------|
| 敏感信息明文泄露 | 🔴 高危 | ✅ v2.2 已修复 |
| 路径遍历攻击 | 🔴 高危 | ✅ v2.2 已修复 |
| 核心目录写入风险 | 🟡 中危 | ✅ v2.2 已修复 |
| 数据卷路径暴露 | 🟡 中危 | ✅ v2.2 已修复 |

**完整安全报告**: [安全使用指南](export/sh/docs/1_安全使用指南.md)

---

## 📈 更新日志

### v2.2 (2025-11-06) - 重大安全更新 🔒

**新增功能**:
- ✅ 隐私模式（--privacy）
- ✅ 核心目录保护（三次确认）
- ✅ 容器名安全验证
- ✅ 增强敏感检测（50+ 关键词）
- ✅ UTF-8 编码支持
- ✅ 安全默认目录（./output）
- ✅ env 模式改进（${VAR} 引用）
- ✅ yml 模式警告系统

**新增文档**:
- ✅ SECURITY_GUIDE.md（安全使用指南）
- ✅ CHANGELOG_v2.2.md（更新日志）
- ✅ QUICK_REFERENCE.md（快速参考）
- ✅ UPGRADE_SUMMARY_v2.2.md（升级总结）

**详细变更**: [更新日志](export/sh/docs/5_更新日志.md)

---

## 🗂️ 项目结构

```
DockerTools/
├── README.md                           # 📖 项目总览（本文件）
├── .gitignore                          # 🚫 Git 忽略配置
├── LICENSE                             # 📄 MIT 许可证
├── DISCLAIMER.md                       # ⚠️ 免责声明（必读）
├── DATA_BACKUP_NOTICE.md               # 💾 数据备份重要提醒（必读）
├── CONTRIBUTING.md                     # 🤝 贡献指南
├── DIRECTORY_STRUCTURE.md              # 📂 目录结构说明
│
├── docs/                               # 📚 文档中心
│   ├── README.md                      # 📋 文档索引
│   ├── DockerTools 文档编写和维护指南.md  # 📝 文档编写指南
│   └── Docker 基础教学 - Hello World 入门指南.md  # 🎓 Docker 入门教程
│
├── export/                             # 🛠️ 导出工具
│   └── sh/                            # Shell 脚本
│       ├── docker-export-compose.sh  # 主脚本 v2.2 ⭐
│       ├── config.example             # 📝 配置文件示例
│       ├── README.md                 # 脚本使用说明
│       └── docs/                      # 📚 脚本详细文档
│           ├── 0_README.md           # 文档索引
│           ├── 1_安全使用指南.md     # 安全指南 ⭐⭐⭐
│           ├── 2_配置文件指南.md     # 配置指南
│           ├── 3_快速参考.md         # 快速参考
│           ├── 4_完整使用指南.md     # 详细说明
│           └── 5_更新日志.md         # 更新日志
│
└── output/                             # 📁 默认输出目录（自动创建）
    └── (导出的容器配置)
```

---

## 🎓 学习路径

### 🆕 新手用户

```
第1步 (15分钟)
└─ 阅读：docs/Docker 基础教学 - Hello World 入门指南.md
   重点：第 1-5 章基础概念

第2步 (30分钟)
└─ 实践：跟随教程完成 Hello World 示例
   重点：理解镜像、容器、Compose

第3步 (15分钟)
└─ 阅读：export/sh/README.md
   重点：基础使用方法

第4步 (15分钟)
└─ 实践：导出第一个容器
   命令：./docker-export-compose.sh my-container
```

### 🔧 有经验用户

```
第1步 (15分钟) ⭐ 必读
└─ 阅读：export/sh/docs/1_安全使用指南.md
   重点：安全警告和最佳实践

第2步 (5分钟)
└─ 阅读：export/sh/docs/3_快速参考.md
   重点：命令速查和场景选择

第3步 (10分钟)
└─ 实践：使用推荐的安全模式
   命令：./docker-export-compose.sh --type env --privacy my-app
```

### 🏢 生产环境用户

```
第1步 (20分钟) ⭐⭐⭐ 必读
└─ 完整阅读：export/sh/docs/1_安全使用指南.md
   重点：全部内容，特别是安全检查清单

第2步 (10分钟)
└─ 阅读：export/sh/docs/5_更新日志.md
   重点：了解 v2.2 新增安全特性

第3步 (10分钟)
└─ 实践：批量导出并验证
   命令：./docker-export-compose.sh --all-run --type env --privacy -o ~/backup
```

---

## 💡 最佳实践

### ✅ 推荐做法

```bash
# 1. 生产环境使用 env + privacy 模式
./docker-export-compose.sh --type env --privacy my-app

# 2. 定期备份所有容器
./docker-export-compose.sh --all-run --type env -o ~/backup-$(date +%Y%m%d)

# 3. 提交到 Git 时只包含安全文件
git add docker-compose.yml .env.example README.md .gitignore
# .env 会被自动忽略

# 4. 使用 dry-run 预览
./docker-export-compose.sh --dry-run my-app

# 5. 验证生成的配置
cd output/my-app
docker compose config
```

### ❌ 避免的做法

```bash
# ❌ 不要：yml 模式提交到 Git（泄露敏感信息）
git add output/my-app/docker-compose.yml  # 包含明文密码！

# ❌ 不要：分享 .env 文件
scp .env user@server:/tmp/  # 危险！

# ❌ 不要：输出到系统目录
./docker-export-compose.sh -o /etc my-app  # 会被拦截

# ❌ 不要：忽略安全警告
# 总是重视脚本的安全警告信息
```

---

## 🆘 获取帮助

### 查看内置帮助

```bash
# 中文帮助（推荐）
./docker-export-compose.sh --help-cn

# 英文帮助
./docker-export-compose.sh --help

# 版本信息（包含新特性列表）
./docker-export-compose.sh --version
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 容器名被拒绝 | 使用 `docker ps` 查看正确的容器名 |
| 输出被拦截 | 不要输出到系统核心目录，使用安全目录 |
| 中文乱码 | v2.2 已自动设置 UTF-8 |
| .env 无法加载 | 确认文件在 docker-compose.yml 同级目录 |

**完整故障排查**: [安全使用指南 - 故障排查章节](export/sh/docs/1_安全使用指南.md#-故障排查--troubleshooting)

---

## 🤝 贡献

欢迎提供反馈和建议！

### 报告问题

如果您发现问题或有改进建议：
1. 检查文档是否已有相关说明
2. 查看已知问题列表
3. 提供详细的复现步骤

### 文档改进

文档改进建议：
- 错误修正
- 示例补充
- 翻译改进
- 新功能建议

---

## 📄 许可证与免责

### 开源许可

本项目采用 **MIT License** 许可证。详见 [LICENSE](LICENSE) 文件。

### 重要声明

- ⚠️ 本项目仅导出容器配置信息，不负责数据备份
- ⚠️ 使用前请阅读 [免责声明](DISCLAIMER.md)
- ⚠️ 数据安全是用户自己的责任，请查阅 [数据备份重要提醒](DATA_BACKUP_NOTICE.md)
- ⚠️ 使用前请在测试环境充分验证
- ⚠️ 本工具"按原样"提供，不提供任何保证

---

## 🙏 致谢

感谢以下方面的支持：

- Docker 社区的最佳实践分享
- 安全研究社区的警示和建议
- 所有用户的反馈和测试
- 开源社区的贡献

---

## 📞 联系方式

- **作者**: clearlove.ymg
- **版本**: v2.2
- **更新日期**: 2025-11-06
- **许可证**: MIT License

---

## 🎉 开始使用

选择适合您的起点：

### 🆕 我是新手
👉 从 [Docker 基础教学](docs/Docker%20基础教学%20-%20Hello%20World%20入门指南.md) 开始

### 🔧 我想导出容器
👉 查看 [快速参考卡片](export/sh/docs/3_快速参考.md)

### 🔒 我关注安全
👉 阅读 [安全使用指南](export/sh/docs/1_安全使用指南.md) ⭐

### 📚 我想了解全部
👉 浏览 [文档中心](docs/README.md)

---

<div align="center">

**享受更安全、更便捷的 Docker 配置管理！** 🚀

[⬆ 返回顶部](#dockertools---docker-容器管理工具集)

</div>

