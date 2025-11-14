#!/bin/bash
# docker-export-compose.sh - Docker 容器导出为 Compose 配置融合工具
# 版本：v2.2
# 作者：clearlove.ymg
# 日期：2025-11-06
# 许可证：MIT License

set -e

# ============================================
# 设置输出编码为 UTF-8，避免乱码
# ============================================
export LANG=C.UTF-8
export LC_ALL=C.UTF-8

# ============================================
# 颜色定义
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ============================================
# 全局变量
# ============================================
SCRIPT_NAME=$(basename "$0")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="2.3.0"
OUTPUT_DIR="./output"  # 默认输出到 ./output 目录
EXPORT_TYPE="yml"  # 默认类型：yml
EXPORT_COUNT=0
FAILED_COUNT=0
SKIPPED_COUNT=0
PRIVACY_MODE="false"     # 隐私模式：默认关闭
MUST_OUTPUT="false"      # 强制输出到核心目录：默认关闭
QUIET_MODE="false"       # 安静模式：默认关闭
DRY_RUN="false"          # 模拟运行：默认关闭
OVERWRITE_MODE="false"   # 覆盖模式：默认关闭
CLEAN_MODE="false"       # 清洁模式：默认关闭（启用后不生成注释和建议）
CONFIG_FILE="$SCRIPT_DIR/config"  # 自定义敏感关键词配置文件
CUSTOM_KEYWORDS=()  # 自定义敏感关键词数组
EXCLUDED_KEYWORDS=()  # 排除的关键词数组（不视为敏感）

# ============================================
# 核心系统目录列表（禁止直接输出）
# ============================================
CRITICAL_DIRS=(
    "/bin" "/boot" "/dev" "/etc" "/lib" "/lib64"
    "/proc" "/root" "/run" "/sbin" "/sys" "/usr"
    "/var/lib" "/var/log" "/var/run"
    "C:\\Windows" "C:\\Program Files" "C:\\Program Files (x86)"
)

# ============================================
# 帮助信息（英文）
# ============================================
show_help_en() {
    cat << EOF
${GREEN}Docker Export to Compose - Convert Docker containers to docker-compose.yml${NC}

${YELLOW}USAGE:${NC}
    $SCRIPT_NAME [OPTIONS] <CONTAINER_NAME>
    $SCRIPT_NAME [OPTIONS] --file <FILE>
    $SCRIPT_NAME [OPTIONS] --all|--all-run|--all-stop

${YELLOW}OPTIONS:${NC}
    -h, --help              Show this help message (English)
    --help-cn               Show help message in Chinese
    -v, --version           Show version information
    -o, --output <DIR>      Output directory (default: ./output)
    -f, --file <FILE>       Batch export from file (one container per line)
    --all                   Export all containers
    --all-run               Export all running containers
    --all-stop              Export all stopped containers
    --dry-run               Show what would be done without actually doing it
    --overwrite             Overwrite existing files (default: auto increment)
    --quiet                 Quiet mode, minimal output
    --privacy               Privacy mode: mask host paths in volumes (default: off)
    --must-output           Force output to critical system directories (DANGEROUS!)
    --clean                 Clean mode: generate minimal YAML without comments (default: off)
    --type <TYPE>           Export type: yml or env (default: yml)
                            yml - Only docker-compose.yml
                            env - docker-compose.yml + .env (with ${VAR} refs)

${YELLOW}EXAMPLES:${NC}
    # Export single container
    $SCRIPT_NAME my-container

    # Export to specific directory
    $SCRIPT_NAME -o /tmp my-container

    # Batch export from file
    $SCRIPT_NAME --file containers.txt

    # Export all running containers
    $SCRIPT_NAME --all-run

    # Export all containers to specific directory
    $SCRIPT_NAME --all -o /backup

    # Export with .env file
    $SCRIPT_NAME --type env my-container

    # Batch export with .env files
    $SCRIPT_NAME --type env --file containers.txt

${YELLOW}OUTPUT STRUCTURE:${NC}
    Default output directory: ./output/

    Type yml (default):
      ./output/<container-name>/docker-compose.yml
      ⚠️  WARNING: Contains environment variables in PLAIN TEXT
      ⚠️  Sensitive data may be exposed!

    Type env (recommended for production):
      ./output/<container-name>/
        ├── docker-compose.yml (with \${VAR} references)
        ├── .env (sensitive data, auto-gitignored)
        ├── .env.example (template, safe to share)
        ├── .gitignore
        └── README.md

    If directory exists:
      ./output/<container-name>_1/docker-compose.yml
      ./output/<container-name>_2/docker-compose.yml

    Privacy mode (--privacy):
      Host paths in volumes will be masked as /path/to/data

${YELLOW}FILE FORMAT (for --file option):${NC}
    One container name per line
    Lines starting with # are ignored
    Empty lines are ignored

    Example:
    # My containers
    nginx-web
    mysql-db
    redis-cache

${YELLOW}CUSTOM SENSITIVE KEYWORDS:${NC}
    You can create a 'config' file in the script directory to add
    custom sensitive keywords (one per line, # for comments).

    If config file doesn't exist, it will be auto-created with examples.

    Example config file:
    # My custom sensitive keywords
    COMPANY_SECRET
    INTERNAL_TOKEN

${YELLOW}MORE INFO:${NC}
    Documentation: 12_Docker基础教学_HelloWorld入门指南.md
    Section 9.14: docker run 转 Docker Compose
    Config file: $CONFIG_FILE (auto-created if not exists)

EOF
}

# ============================================
# 帮助信息（中文）
# ============================================
show_help_cn() {
    cat << EOF
${GREEN}Docker 导出为 Compose - 将 Docker 容器转换为 docker-compose.yml${NC}

${YELLOW}用法：${NC}
    $SCRIPT_NAME [选项] <容器名>
    $SCRIPT_NAME [选项] --file <文件>
    $SCRIPT_NAME [选项] --all|--all-run|--all-stop

${YELLOW}选项：${NC}
    -h, --help              显示帮助信息（英文）
    --help-cn               显示帮助信息（中文）
    -v, --version           显示版本信息
    -o, --output <目录>     输出目录（默认：./output）
    -f, --file <文件>       从文件批量导出（每行一个容器名）
    --all                   导出所有容器
    --all-run               导出所有运行中的容器
    --all-stop              导出所有已停止的容器
    --dry-run               模拟运行，不实际创建文件
    --overwrite             覆盖已存在的文件（默认：自动递增）
    --quiet                 安静模式，最小化输出
    --privacy               隐私模式：隐藏数据卷主机路径（默认：关闭）
    --must-output           强制输出到系统核心目录（危险！）
    --clean                 清洁模式：生成简洁的 YAML 文件，不包含注释和建议（默认：关闭）
    --type <类型>           导出类型：yml 或 env（默认：yml）
                            yml - 仅导出 docker-compose.yml
                            env - 导出 docker-compose.yml + .env（使用 ${变量名} 引用）

${YELLOW}示例：${NC}
    # 导出单个容器
    $SCRIPT_NAME my-container

    # 导出到指定目录
    $SCRIPT_NAME -o /tmp my-container

    # 从文件批量导出
    $SCRIPT_NAME --file containers.txt

    # 导出所有运行中的容器
    $SCRIPT_NAME --all-run

    # 导出所有容器到指定目录
    $SCRIPT_NAME --all -o /backup

    # 导出并生成 .env 文件
    $SCRIPT_NAME --type env my-container

    # 批量导出并生成 .env 文件
    $SCRIPT_NAME --type env --file containers.txt

${YELLOW}输出结构：${NC}
    默认输出目录：./output/

    yml 模式（默认）：
      ./output/<容器名>/docker-compose.yml
      ⚠️  警告：包含明文环境变量
      ⚠️  可能泄露敏感信息！

    env 模式（生产环境推荐）：
      ./output/<容器名>/
        ├── docker-compose.yml（使用 \${变量名} 引用）
        ├── .env（敏感数据，自动添加到 .gitignore）
        ├── .env.example（模板，可安全分享）
        ├── .gitignore
        └── README.md

    目录冲突时：
      ./output/<容器名>_1/docker-compose.yml
      ./output/<容器名>_2/docker-compose.yml

    隐私模式（--privacy）：
      数据卷中的主机路径将被隐藏为 /path/to/data

${YELLOW}文件格式（--file 选项）：${NC}
    每行一个容器名
    # 开头的行会被忽略（注释）
    空行会被忽略

    示例：
    # 我的容器列表
    nginx-web
    mysql-db
    redis-cache

${YELLOW}自定义敏感关键词：${NC}
    您可以在脚本目录创建 'config' 文件来添加自定义敏感关键词
    （每行一个关键词，# 开头为注释）

    如果 config 文件不存在，将自动创建包含示例的模板。

    config 文件示例：
    # 我的自定义敏感关键词
    COMPANY_SECRET
    INTERNAL_TOKEN

${YELLOW}更多信息：${NC}
    文档：12_Docker基础教学_HelloWorld入门指南.md
    章节：9.14 docker run 转 Docker Compose
    配置文件：$CONFIG_FILE（不存在时自动创建）

EOF
}

# ============================================
# 版本信息
# ============================================
show_version() {
    cat << EOF
${GREEN}Docker Export to Compose${NC}
Version: $VERSION
Author: clearlove.ymg
License: MIT License
Date: 2025-11-11

${YELLOW}New Features in v2.3:${NC}
  ✓ Clean mode (--clean): Generate minimal YAML without comments
  ✓ Fixed network configuration: Use 'networks' instead of 'network_mode'
  ✓ Fixed resource limits: Use standard format (mem_limit/cpus) for non-Swarm
  ✓ Auto-detect Swarm mode for proper resource limit format

${YELLOW}Features in v2.2:${NC}
  ✓ Privacy mode (--privacy): Mask host paths in volumes
  ✓ Enhanced security: Critical directory protection with 3-step confirmation
  ✓ Container name validation: Prevent path traversal attacks
  ✓ UTF-8 encoding: Avoid garbled output
  ✓ Enhanced env detection: 50+ sensitive keyword patterns
  ✓ Default output: ./output/ (safer than current directory)
  ✓ .env mode improvement: Use \${VAR} references in YAML
  ✓ Warning system: Alert when sensitive data in plain text

${GREEN}安全性增强 / Security Enhancements:${NC}
  ⚠️  核心目录保护 / Critical directory protection
  🔒 敏感信息检测 / Sensitive data detection
  🛡️  路径遍历防护 / Path traversal prevention
  🔐 隐私模式 / Privacy mode
EOF
}

# ============================================
# 日志函数
# ============================================
log_info() {
    if [ "$QUIET_MODE" != "true" ]; then
        echo -e "${GREEN}[INFO]${NC} $1" >&2
    fi
}

log_warn() {
    if [ "$QUIET_MODE" != "true" ]; then
        echo -e "${YELLOW}[WARN]${NC} $1" >&2
    fi
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_success() {
    if [ "$QUIET_MODE" != "true" ]; then
        echo -e "${CYAN}[SUCCESS]${NC} $1" >&2
    fi
}

# ============================================
# 创建 config 文件模板（如果不存在）
# ============================================
create_config_template() {
    local config_file="$1"

    cat > "$config_file" <<'CONFIG_EOF'
# ═══════════════════════════════════════════════════════════════
# Docker Export Compose - 自定义敏感关键词配置文件
# ═══════════════════════════════════════════════════════════════
# 版本: v2.2.1
# 创建: 2025-11-06
# 说明: 此文件用于自定义额外的敏感环境变量关键词和排除规则
# ═══════════════════════════════════════════════════════════════

# 使用说明 / Usage:
# 1. 每行一个关键词（大小写不敏感）
# 2. 使用 # 开头表示注释
# 3. 空行会被忽略
# 4. 使用 ! 开头表示排除（不视为敏感）⭐ 新功能
# 5. 脚本会自动检测包含这些关键词的环境变量

# ═══════════════════════════════════════════════════════════════
# 添加敏感关键词 / Add Sensitive Keywords
# ═══════════════════════════════════════════════════════════════
# 示例 / Examples:
# MY_COMPANY_SECRET     # 公司特定的密钥变量
# CUSTOM_API_KEY        # 自定义 API 密钥
# INTERNAL_TOKEN        # 内部令牌

# ═══════════════════════════════════════════════════════════════
# 排除关键词（使用 ! 开头）/ Exclude Keywords (Use ! prefix) ⭐
# ═══════════════════════════════════════════════════════════════
# 说明：即使变量名包含敏感关键词，也不视为敏感
# Note: Even if variable name contains sensitive keywords, not treated as sensitive
#
# 使用场景 / Use Cases:
# - 公开的数据库连接（只读）
# - 非敏感的配置 URL
# - 已脱敏的测试数据
#
# 示例 / Examples:
# !PUBLIC_DATABASE_URL  # 虽然包含 DATABASE_URL，但这是公开的
# !DEMO_PASSWORD        # 虽然包含 PASSWORD，但这是演示密码
# !TEST_SECRET_KEY      # 虽然包含 SECRET，但这是测试密钥

# ═══════════════════════════════════════════════════════════════
# 内置关键词（无需添加，已自动包含）/ Built-in Keywords:
# ═══════════════════════════════════════════════════════════════
# PASSWORD, PASSWD, PWD, PASS
# SECRET, TOKEN, KEY, APIKEY
# API_KEY, API_SECRET, API_TOKEN
# ACCESS_KEY, ACCESS_TOKEN, ACCESS_SECRET
# PRIVATE_KEY, PUBLIC_KEY, SSH_KEY
# AUTH, AUTHENTICATION, AUTHORIZATION
# CREDENTIALS, CREDENTIAL
# SESSION, SESSION_KEY, SESSION_SECRET
# OAUTH, OAUTH_TOKEN, OAUTH_SECRET
# CERT, CERTIFICATE, SSL, TLS
# PRIVATE, PEM, P12, PKCS
# SALT, HASH, ENCRYPTION, DECRYPT
# CIPHER, AES, RSA
# DATABASE_URL, DB_PASSWORD, DB_USER
# CONNECTION_STRING, CONN_STR
# MYSQL_PASSWORD, POSTGRES_PASSWORD
# MONGO_PASSWORD, REDIS_PASSWORD
# ADMIN, ROOT, SUPERUSER
# ADMIN_PASSWORD, ROOT_PASSWORD
# AWS_SECRET, AWS_ACCESS, AWS_KEY
# AZURE_, GCP_, GOOGLE_, CLOUD_, S3_
# SIGNING_KEY, JWT_SECRET, JWT_KEY
# WEBHOOK_SECRET, ENCRYPTION_KEY
# ═══════════════════════════════════════════════════════════════

# 在下方添加您的自定义关键词 / Add your custom keywords below:

# 示例（取消注释以启用）/ Examples (uncomment to enable):
# COMPANY_SECRET
# INTERNAL_KEY
# PRIVATE_TOKEN

CONFIG_EOF
}

# ============================================
# 读取 config 文件中的自定义关键词
# ============================================
load_custom_keywords() {
    local config_file="$1"

    # 如果 config 文件不存在，创建模板
    if [ ! -f "$config_file" ]; then
        log_info "配置文件不存在，正在创建模板：$config_file"
        log_info "Config file not found, creating template: $config_file"

        if create_config_template "$config_file"; then
            log_success "配置文件模板已创建：$config_file"
            log_success "Config template created: $config_file"
            log_info "您可以编辑此文件添加自定义敏感关键词"
            log_info "You can edit this file to add custom sensitive keywords"
        else
            log_warn "创建配置文件失败，将使用内置关键词"
            log_warn "Failed to create config file, will use built-in keywords only"
        fi
        return 0
    fi

    # 读取配置文件
    log_info "加载自定义敏感关键词配置：$config_file"
    log_info "Loading custom sensitive keywords config: $config_file"

    local line_count=0
    local add_count=0
    local exclude_count=0
    local error_count=0

    while IFS= read -r line || [ -n "$line" ]; do
        line_count=$((line_count + 1))

        # 移除前后空格
        line=$(echo "$line" | xargs 2>/dev/null)

        # 跳过空行
        [ -z "$line" ] && continue

        # 跳过注释行
        [[ "$line" =~ ^# ]] && continue

        # 检查是否为排除关键词（! 开头）
        if [[ "$line" =~ ^! ]]; then
            # 移除 ! 前缀
            local keyword="${line#!}"
            keyword=$(echo "$keyword" | xargs 2>/dev/null)

            # 验证格式（只允许字母、数字、下划线、横杠）
            if [[ "$keyword" =~ ^[A-Za-z0-9_-]+$ ]]; then
                EXCLUDED_KEYWORDS+=("$keyword")
                exclude_count=$((exclude_count + 1))
            else
                log_warn "配置文件第 $line_count 行格式无效（排除规则），已跳过：$line"
                log_warn "Config line $line_count invalid format (exclude rule), skipped: $line"
                error_count=$((error_count + 1))
            fi
        else
            # 普通敏感关键词
            # 验证关键词格式（只允许字母、数字、下划线、横杠）
            if [[ "$line" =~ ^[A-Za-z0-9_-]+$ ]]; then
                CUSTOM_KEYWORDS+=("$line")
                add_count=$((add_count + 1))
            else
                log_warn "配置文件第 $line_count 行格式无效，已跳过：$line"
                log_warn "Config line $line_count invalid format, skipped: $line"
                error_count=$((error_count + 1))
            fi
        fi
    done < "$config_file" 2>/dev/null || {
        log_error "读取配置文件失败：$config_file"
        log_error "Failed to read config file: $config_file"
        return 1
    }

    # 显示加载的自定义关键词
    if [ $add_count -gt 0 ]; then
        log_success "成功加载 $add_count 个自定义敏感关键词"
        log_success "Loaded $add_count custom sensitive keywords"

        if [ "$QUIET_MODE" != "true" ]; then
            log_info "自定义敏感关键词："
            log_info "Custom sensitive keywords:"
            for keyword in "${CUSTOM_KEYWORDS[@]}"; do
                echo "  + $keyword" >&2
            done
        fi
    fi

    # 显示加载的排除关键词
    if [ $exclude_count -gt 0 ]; then
        log_success "成功加载 $exclude_count 个排除关键词"
        log_success "Loaded $exclude_count excluded keywords"

        if [ "$QUIET_MODE" != "true" ]; then
            log_info "排除关键词（不视为敏感）："
            log_info "Excluded keywords (not treated as sensitive):"
            for keyword in "${EXCLUDED_KEYWORDS[@]}"; do
                echo "  - $keyword" >&2
            done
        fi
    fi

    # 如果都没有加载到
    if [ $add_count -eq 0 ] && [ $exclude_count -eq 0 ]; then
        log_info "未找到有效的自定义配置"
        log_info "No valid custom configuration found"
    fi

    if [ $error_count -gt 0 ]; then
        log_warn "跳过了 $error_count 个无效行"
        log_warn "Skipped $error_count invalid lines"
    fi

    return 0
}

# ============================================
# 判断环境变量是否敏感
# ============================================
is_sensitive_env() {
    local env_var="$1"
    local var_name="${env_var%%=*}"

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 第 1 步：检查排除列表（优先级最高）
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 如果变量名在排除列表中，直接返回"不敏感"
    for excluded in "${EXCLUDED_KEYWORDS[@]}"; do
        # 精确匹配（不是部分匹配）
        if [[ "${var_name^^}" == "${excluded^^}" ]]; then
            return 1  # 明确排除，不是敏感变量
        fi
    done

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 第 2 步：检查内置敏感关键词
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    local sensitive_keywords=(
        # 密码相关
        "PASSWORD" "PASSWD" "PWD" "PASS"
        # 密钥和令牌
        "SECRET" "TOKEN" "KEY" "APIKEY"
        "API_KEY" "API_SECRET" "API_TOKEN"
        "ACCESS_KEY" "ACCESS_TOKEN" "ACCESS_SECRET"
        "PRIVATE_KEY" "PUBLIC_KEY" "SSH_KEY"
        # 认证相关
        "AUTH" "AUTHENTICATION" "AUTHORIZATION"
        "CREDENTIALS" "CREDENTIAL"
        "SESSION" "SESSION_KEY" "SESSION_SECRET"
        "OAUTH" "OAUTH_TOKEN" "OAUTH_SECRET"
        # 证书相关
        "CERT" "CERTIFICATE" "SSL" "TLS"
        "PRIVATE" "PEM" "P12" "PKCS"
        # 加密相关
        "SALT" "HASH" "ENCRYPTION" "DECRYPT"
        "CIPHER" "AES" "RSA"
        # 数据库连接
        "DATABASE_URL" "DB_PASSWORD" "DB_USER"
        "CONNECTION_STRING" "CONN_STR"
        "MYSQL_PASSWORD" "POSTGRES_PASSWORD"
        "MONGO_PASSWORD" "REDIS_PASSWORD"
        # 管理员相关
        "ADMIN" "ROOT" "SUPERUSER"
        "ADMIN_PASSWORD" "ROOT_PASSWORD"
        # 云服务密钥
        "AWS_SECRET" "AWS_ACCESS" "AWS_KEY"
        "AZURE_" "GCP_" "GOOGLE_"
        "CLOUD_" "S3_"
        # 其他敏感信息
        "SIGNING_KEY" "JWT_SECRET" "JWT_KEY"
        "WEBHOOK_SECRET" "ENCRYPTION_KEY"
    )

    # 检查变量名是否包含内置敏感关键词
    for keyword in "${sensitive_keywords[@]}"; do
        if echo "$var_name" | grep -qi "$keyword"; then
            return 0  # 是敏感变量
        fi
    done

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 第 3 步：检查自定义敏感关键词
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    for keyword in "${CUSTOM_KEYWORDS[@]}"; do
        if echo "$var_name" | grep -qi "$keyword"; then
            return 0  # 是敏感变量（自定义）
        fi
    done

    return 1  # 不是敏感变量
}

# ============================================
# 验证容器名是否安全（防止路径遍历攻击）
# ============================================
validate_container_name() {
    local name="$1"

    # 检查是否包含路径遍历字符
    if [[ "$name" == *".."* ]] || [[ "$name" == *"/"* ]] || [[ "$name" == *"\\"* ]]; then
        log_error "容器名包含非法字符（路径遍历攻击）：$name"
        log_error "Container name contains illegal characters (path traversal): $name"
        return 1
    fi

    # 检查是否包含特殊字符
    if [[ "$name" =~ [\$\`\;\|\&\<\>\(\)\{\}\[\]] ]]; then
        log_error "容器名包含危险字符：$name"
        log_error "Container name contains dangerous characters: $name"
        return 1
    fi

    # 检查长度
    if [ ${#name} -gt 200 ]; then
        log_error "容器名过长（超过200字符）：$name"
        log_error "Container name too long (> 200 chars): $name"
        return 1
    fi

    return 0
}

# ============================================
# 检查是否为核心系统目录
# ============================================
is_critical_directory() {
    local dir="$1"
    local abs_dir=$(cd "$dir" 2>/dev/null && pwd || echo "$dir")

    for critical in "${CRITICAL_DIRS[@]}"; do
        # 检查是否完全匹配或为子目录
        if [[ "$abs_dir" == "$critical" ]] || [[ "$abs_dir" == "$critical"/* ]]; then
            return 0  # 是核心目录
        fi
    done

    return 1  # 不是核心目录
}

# ============================================
# 三次确认输出到核心目录
# ============================================
confirm_critical_output() {
    local dir="$1"

    echo "" >&2
    echo -e "${RED}═══════════════════════════════════════════════════${NC}" >&2
    echo -e "${RED}⚠️  严重警告 / CRITICAL WARNING ⚠️${NC}" >&2
    echo -e "${RED}═══════════════════════════════════════════════════${NC}" >&2
    echo "" >&2
    echo -e "${YELLOW}您正在尝试输出到系统核心目录！${NC}" >&2
    echo -e "${YELLOW}You are trying to output to a CRITICAL system directory!${NC}" >&2
    echo "" >&2
    echo -e "目标目录 / Target: ${RED}$dir${NC}" >&2
    echo "" >&2
    echo -e "${YELLOW}这可能会：${NC}" >&2
    echo -e "  ${RED}✗${NC} 破坏系统文件 / Damage system files" >&2
    echo -e "  ${RED}✗${NC} 导致安全风险 / Cause security risks" >&2
    echo -e "  ${RED}✗${NC} 使系统无法启动 / Make system unbootable" >&2
    echo "" >&2
    echo -e "${GREEN}建议使用安全目录：${NC}" >&2
    echo -e "  ${GREEN}✓${NC} ~/docker-exports" >&2
    echo -e "  ${GREEN}✓${NC} ./output (默认 / default)" >&2
    echo -e "  ${GREEN}✓${NC} /tmp/docker-exports" >&2
    echo "" >&2

    # 第一次确认
    echo -e "${YELLOW}第一次确认 / First confirmation:${NC}" >&2
    echo -n "您确定要继续吗？(输入 YES 继续 / Type YES to continue): " >&2
    read -r confirm1
    if [ "$confirm1" != "YES" ]; then
        log_error "已取消操作 / Operation cancelled"
        return 1
    fi

    # 第二次确认
    echo "" >&2
    echo -e "${YELLOW}第二次确认 / Second confirmation:${NC}" >&2
    echo -n "您真的确定吗？(输入 I-AM-SURE 继续 / Type I-AM-SURE): " >&2
    read -r confirm2
    if [ "$confirm2" != "I-AM-SURE" ]; then
        log_error "已取消操作 / Operation cancelled"
        return 1
    fi

    # 第三次确认
    echo "" >&2
    echo -e "${RED}第三次确认 / Final confirmation:${NC}" >&2
    echo -n "最后一次机会！(输入 FORCE-OUTPUT 继续 / Type FORCE-OUTPUT): " >&2
    read -r confirm3
    if [ "$confirm3" != "FORCE-OUTPUT" ]; then
        log_error "已取消操作 / Operation cancelled"
        return 1
    fi

    echo "" >&2
    log_warn "用户强制输出到核心目录：$dir"
    log_warn "User forced output to critical directory: $dir"

    return 0
}

# ============================================
# 获取唯一的输出目录
# ============================================
get_unique_dir() {
    local base_dir="$1"
    local container_name="$2"

    # 验证容器名安全性
    if ! validate_container_name "$container_name"; then
        return 1
    fi

    local target_dir="$base_dir/$container_name"

    # 如果设置了覆盖模式，直接返回
    if [ "$OVERWRITE_MODE" = "true" ]; then
        echo "$target_dir"
        return
    fi

    # 如果目录不存在，直接使用
    if [ ! -d "$target_dir" ]; then
        echo "$target_dir"
        return
    fi

    # 目录存在，查找可用的递增编号
    local i=1
    while [ -d "${target_dir}_${i}" ]; do
        i=$((i + 1))
    done

    echo "${target_dir}_${i}"
}

# ============================================
# 转换单个容器
# ============================================
convert_container() {
    local container="$1"

    # 检查容器是否存在
    if ! docker inspect "$container" &>/dev/null; then
        log_error "容器 '$container' 不存在"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        return 1
    fi

    # 获取输出目录
    local output_dir=$(get_unique_dir "$OUTPUT_DIR" "$container")
    local compose_file="$output_dir/docker-compose.yml"

    log_info "转换容器：$container → $compose_file"

    # 如果是 dry-run 模式，只显示不执行
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] 将创建：$compose_file"
        return 0
    fi

    # 创建输出目录
    mkdir -p "$output_dir"

    # 获取容器信息
    local IMAGE=$(docker inspect "$container" --format='{{.Config.Image}}')
    local RESTART=$(docker inspect "$container" --format='{{.HostConfig.RestartPolicy.Name}}')
    local NETWORK_MODE=$(docker inspect "$container" --format='{{.HostConfig.NetworkMode}}')
    local STATUS=$(docker inspect "$container" --format='{{.State.Status}}')

    # 检测是否为 Swarm 模式
    local IS_SWARM="false"
    if docker info 2>/dev/null | grep -q "Swarm: active"; then
        IS_SWARM="true"
    fi

    # 生成 docker-compose.yml
    {
        # 文件头注释（清洁模式下简化）
        if [ "$CLEAN_MODE" = "true" ]; then
            echo "# Generated from container: $container"
            echo "# Date: $(date '+%Y-%m-%d %H:%M:%S')"
        else
            echo "# Docker Compose 配置"
            echo "# 从容器 '$container' 自动生成"
            echo "# 容器状态：$STATUS"
            echo "# 生成时间：$(date '+%Y-%m-%d %H:%M:%S')"
            echo "# "
            echo "# ⚠️ 注意：请检查并调整配置后使用"
            echo "# ⚠️ 特别是端口、数据卷路径、环境变量等"
        fi
        echo ""
        echo "version: '3.8'"
        echo ""
        echo "services:"
        echo "  ${container}:"

        # 镜像
        echo "    image: $IMAGE"

        # 容器名
        echo "    container_name: $container"

        # 重启策略
        if [ -n "$RESTART" ] && [ "$RESTART" != "no" ]; then
            if [ "$RESTART" = "always" ]; then
                if [ "$CLEAN_MODE" = "true" ]; then
                    echo "    restart: unless-stopped"
                else
                    echo "    restart: unless-stopped  # 原为 always，推荐 unless-stopped"
                fi
            else
                echo "    restart: $RESTART"
            fi
        fi

        # 网络配置（修正：使用 networks 而非 network_mode）
        local NEEDS_NETWORK_SECTION="false"
        if [ "$NETWORK_MODE" != "default" ] && [ "$NETWORK_MODE" != "bridge" ]; then
            # 特殊网络模式（host, none, container:xxx）保持使用 network_mode
            if [[ "$NETWORK_MODE" == "host" ]] || [[ "$NETWORK_MODE" == "none" ]] || [[ "$NETWORK_MODE" =~ ^container: ]]; then
                echo "    network_mode: \"$NETWORK_MODE\""
            else
                # 自定义网络：使用 networks 配置
                echo "    networks:"
                echo "      - $NETWORK_MODE"
                NEEDS_NETWORK_SECTION="true"
            fi
        fi

        # 端口映射
        local PORT_BINDINGS=$(docker inspect "$container" --format='{{json .HostConfig.PortBindings}}')
        if [ "$PORT_BINDINGS" != "null" ] && [ "$PORT_BINDINGS" != "{}" ]; then
            echo ""
            echo "    ports:"
            docker inspect "$container" --format='{{range $p, $conf := .HostConfig.PortBindings}}{{(index $conf 0).HostPort}}:{{$p}} {{end}}' | \
            tr ' ' '\n' | grep -v '^$' | while read port; do
                echo "      - \"$port\""
            done
        fi

        # 数据卷
        local BINDS=$(docker inspect "$container" --format='{{json .HostConfig.Binds}}')
        if [ "$BINDS" != "null" ] && [ "$BINDS" != "[]" ]; then
            echo ""
            echo "    volumes:"
            docker inspect "$container" --format='{{range .HostConfig.Binds}}{{.}}{{"\n"}}{{end}}' | \
            while read vol; do
                if [ -n "$vol" ]; then
                    if [ "$PRIVACY_MODE" = "true" ]; then
                        # 隐私模式：隐藏主机路径
                        local host_path="${vol%%:*}"
                        local container_path="${vol#*:}"
                        local mount_type="rw"
                        if [[ "$container_path" == *:* ]]; then
                            mount_type="${container_path##*:}"
                            container_path="${container_path%:*}"
                        fi
                        if [ "$CLEAN_MODE" = "true" ]; then
                            echo "      - /path/to/data:$container_path${mount_type:+:$mount_type}"
                        else
                            echo "      - /path/to/data:$container_path${mount_type:+:$mount_type}  # 原路径已隐藏以保护隐私 / Original path masked for privacy"
                        fi
                    else
                        # 正常模式：显示完整路径
                        echo "      - $vol"
                    fi
                fi
            done
        fi

        # 环境变量
        if [ "$EXPORT_TYPE" = "env" ]; then
            # env 模式：生成 .env 和 .env.example 文件，yml 中使用 ${VAR_NAME} 引用
            local env_file="$output_dir/.env"
            local env_example_file="$output_dir/.env.example"

            # 生成 .env 文件
            {
                echo "# ═════════════════════════════════════════════════"
                echo "# 环境变量配置文件 / Environment Variables"
                echo "# ═════════════════════════════════════════════════"
                echo "# 容器 / Container: $container"
                echo "# 生成时间 / Generated: $(date '+%Y-%m-%d %H:%M:%S')"
                echo "# "
                echo "# ⚠️ 重要 / IMPORTANT:"
                echo "#   - 此文件包含敏感信息，不要提交到 Git"
                echo "#   - This file contains sensitive data, DO NOT commit to Git"
                echo "#   - 已自动添加到 .gitignore"
                echo "#   - Already added to .gitignore"
                echo "# ═════════════════════════════════════════════════"
                echo ""
            } > "$env_file"

            # 生成 .env.example 文件
            {
                echo "# ═════════════════════════════════════════════════"
                echo "# 环境变量配置模板 / Environment Variables Template"
                echo "# ═════════════════════════════════════════════════"
                echo "# 容器 / Container: $container"
                echo "# "
                echo "# 使用方法 / Usage:"
                echo "#   1. 复制此文件 / Copy: cp .env.example .env"
                echo "#   2. 填写实际的配置值 / Fill in actual values"
                echo "#   3. 启动服务 / Start: docker compose up -d"
                echo "# ═════════════════════════════════════════════════"
                echo ""
            } > "$env_example_file"

            # 收集环境变量，分为两组：排除的和需要 .env 的
            local env_vars_for_file=()      # 需要写入 .env 的变量
            local env_vars_excluded=()      # 被排除的变量（直接写入 yml）
            local has_env=false
            local has_excluded=false

            while IFS= read -r env; do
                if [ -n "$env" ]; then
                    local var_name="${env%%=*}"
                    local var_value="${env#*=}"

                    # 检查变量是否在排除列表中（精确匹配）
                    local is_excluded=false
                    for excluded in "${EXCLUDED_KEYWORDS[@]}"; do
                        if [[ "${var_name^^}" == "${excluded^^}" ]]; then
                            is_excluded=true
                            break
                        fi
                    done

                    if [ "$is_excluded" = true ]; then
                        # 被排除的变量：不写入 .env，直接在 yml 中使用
                        env_vars_excluded+=("$env")
                        has_excluded=true
                    else
                        # 未被排除的变量：写入 .env 文件
                        has_env=true

                        # 写入 .env
                        echo "$env" >> "$env_file"

                        # 写入 .env.example
                        if is_sensitive_env "$env"; then
                            # 敏感变量：隐藏值
                            echo "${var_name}=<请填写 / FILL_THIS>" >> "$env_example_file"
                        else
                            # 非敏感变量：保留值
                            echo "$env" >> "$env_example_file"
                        fi

                        # 保存变量名用于 yml 引用
                        env_vars_for_file+=("$var_name")
                    fi
                fi
            done < <(docker inspect "$container" --format='{{range .Config.Env}}{{.}}{{"\n"}}{{end}}' | \
                     grep -v '^PATH=' | grep -v '^HOME=' | grep -v '^HOSTNAME=')

            # 在 docker-compose.yml 中处理环境变量
            if [ "$has_env" = true ] || [ "$has_excluded" = true ]; then
                echo ""
                if [ "$CLEAN_MODE" != "true" ]; then
                    echo "    # 环境变量配置 / Environment Variables"
                fi
                echo "    environment:"

                # 先输出从 .env 文件加载的变量（使用 ${VAR} 引用）
                if [ "$has_env" = true ]; then
                    if [ "$CLEAN_MODE" != "true" ]; then
                        echo "      # ─────────────────────────────────────────────"
                        echo "      # 从 .env 文件加载 / Loaded from .env file"
                        echo "      # ─────────────────────────────────────────────"
                    fi
                    for var_name in "${env_vars_for_file[@]}"; do
                        echo "      - ${var_name}=\${${var_name}}"
                    done
                fi

                # 再输出被排除的变量（直接明文）
                if [ "$has_excluded" = true ]; then
                    if [ "$CLEAN_MODE" != "true" ]; then
                        echo "      # ─────────────────────────────────────────────"
                        echo "      # 排除变量（直接设置，不使用 .env）/ Excluded (Direct)"
                        echo "      # 说明：这些变量被 config 文件标记为非敏感"
                        echo "      # Note: Marked as non-sensitive in config file"
                        echo "      # ─────────────────────────────────────────────"
                    fi
                    for env in "${env_vars_excluded[@]}"; do
                        if [ "$CLEAN_MODE" = "true" ]; then
                            echo "      - $env"
                        else
                            echo "      - $env  # 排除变量 / Excluded"
                        fi
                    done
                fi
            fi
        else
            # yml 模式：直接在 YAML 中写入环境变量（包含敏感信息警告）
            local has_sensitive=false
            local env_list=()

            while IFS= read -r env; do
                if [ -n "$env" ]; then
                    env_list+=("$env")
                    if is_sensitive_env "$env"; then
                        has_sensitive=true
                    fi
                fi
            done < <(docker inspect "$container" --format='{{range .Config.Env}}{{.}}{{"\n"}}{{end}}' | \
                     grep -v '^PATH=' | grep -v '^HOME=' | grep -v '^HOSTNAME=')

            if [ ${#env_list[@]} -gt 0 ]; then
                echo ""
                if [ "$has_sensitive" = true ] && [ "$CLEAN_MODE" != "true" ]; then
                    echo "    # ⚠️ 警告 / WARNING: 以下环境变量可能包含敏感信息"
                    echo "    # ⚠️ Environment variables below may contain SENSITIVE data"
                    echo "    # 建议使用 --type env 模式以分离敏感信息"
                    echo "    # Recommend using --type env to separate sensitive data"
                fi
                echo "    environment:"
                for env in "${env_list[@]}"; do
                    if [ "$CLEAN_MODE" = "true" ]; then
                        echo "      - $env"
                    else
                        if is_sensitive_env "$env"; then
                            echo "      - $env  # ⚠️ 敏感信息 / SENSITIVE"
                        else
                            echo "      - $env"
                        fi
                    fi
                done
            fi
        fi

        # 工作目录
        local WORKDIR=$(docker inspect "$container" --format='{{.Config.WorkingDir}}')
        if [ -n "$WORKDIR" ] && [ "$WORKDIR" != "/" ]; then
            echo ""
            echo "    working_dir: $WORKDIR"
        fi

        # Capabilities
        local CAP_ADD=$(docker inspect "$container" --format='{{json .HostConfig.CapAdd}}')
        if [ "$CAP_ADD" != "null" ] && [ "$CAP_ADD" != "[]" ]; then
            echo ""
            echo "    cap_add:"
            docker inspect "$container" --format='{{range .HostConfig.CapAdd}}{{.}}{{"\n"}}{{end}}' | \
            while read cap; do
                if [ -n "$cap" ]; then
                    echo "      - $cap"
                fi
            done
        fi

        # Devices
        local DEVICES=$(docker inspect "$container" --format='{{json .HostConfig.Devices}}')
        if [ "$DEVICES" != "null" ] && [ "$DEVICES" != "[]" ]; then
            echo ""
            echo "    devices:"
            docker inspect "$container" --format='{{range .HostConfig.Devices}}{{.PathOnHost}}:{{.PathInContainer}}{{"\n"}}{{end}}' | \
            while read device; do
                if [ -n "$device" ]; then
                    echo "      - $device"
                fi
            done
        fi

        # 入口点
        local ENTRYPOINT=$(docker inspect "$container" --format='{{json .Config.Entrypoint}}')
        if [ "$ENTRYPOINT" != "null" ] && [ "$ENTRYPOINT" != "[]" ]; then
            echo ""
            echo "    entrypoint:"
            docker inspect "$container" --format='{{range .Config.Entrypoint}}{{.}}{{"\n"}}{{end}}' | \
            while read entry; do
                if [ -n "$entry" ]; then
                    echo "      - $entry"
                fi
            done
        fi

        # 命令
        local CMD=$(docker inspect "$container" --format='{{json .Config.Cmd}}')
        if [ "$CMD" != "null" ] && [ "$CMD" != "[]" ]; then
            echo ""
            echo "    command:"
            docker inspect "$container" --format='{{range .Config.Cmd}}{{.}}{{"\n"}}{{end}}' | \
            while read cmd; do
                if [ -n "$cmd" ]; then
                    echo "      - $cmd"
                fi
            done
        fi

        # 日志配置（建议性配置，注释形式）
        if [ "$CLEAN_MODE" != "true" ]; then
            echo ""
            echo "    # ═══════════════════════════════════════════════════"
            echo "    # 日志配置（推荐启用）/ Logging Configuration (Recommended)"
            echo "    # 说明：限制日志大小，防止磁盘占满"
            echo "    # Note: Limit log size to prevent disk full"
            echo "    # 使用方法：取消下方注释以启用"
            echo "    # Usage: Uncomment below to enable"
            echo "    # ═══════════════════════════════════════════════════"
            echo "    # logging:"
            echo "    #   driver: json-file"
            echo "    #   options:"
            echo "    #     max-size: \"10m\"    # 单个日志文件最大 10MB"
            echo "    #     max-file: \"3\"       # 最多保留 3 个日志文件"
        fi

        # 资源限制（修正：根据 Swarm 模式使用不同格式）
        local MEMORY=$(docker inspect "$container" --format='{{.HostConfig.Memory}}')
        local CPUS=$(docker inspect "$container" --format='{{.HostConfig.NanoCpus}}')

        if [ "$MEMORY" != "0" ] || [ "$CPUS" != "0" ]; then
            echo ""

            if [ "$IS_SWARM" = "true" ]; then
                # Swarm 模式：使用 deploy.resources
                if [ "$CLEAN_MODE" != "true" ]; then
                    echo "    # 资源限制（Swarm 模式）/ Resource Limits (Swarm Mode)"
                fi
                echo "    deploy:"
                echo "      resources:"
                echo "        limits:"

                if [ "$CPUS" != "0" ]; then
                    local CPU_LIMIT=$(awk "BEGIN {printf \"%.2f\", $CPUS / 1000000000}")
                    echo "          cpus: '$CPU_LIMIT'"
                fi

                if [ "$MEMORY" != "0" ]; then
                    local MEM_MB=$((MEMORY / 1024 / 1024))
                    echo "          memory: ${MEM_MB}M"
                fi
            else
                # 非 Swarm 模式：使用标准格式
                if [ "$CLEAN_MODE" != "true" ]; then
                    echo "    # 资源限制 / Resource Limits"
                fi

                if [ "$MEMORY" != "0" ]; then
                    local MEM_MB=$((MEMORY / 1024 / 1024))
                    echo "    mem_limit: ${MEM_MB}M"
                fi

                if [ "$CPUS" != "0" ]; then
                    local CPU_LIMIT=$(awk "BEGIN {printf \"%.2f\", $CPUS / 1000000000}")
                    echo "    cpus: $CPU_LIMIT"
                fi
            fi
        else
            # 原容器没有资源限制，提供建议配置（注释形式）
            if [ "$CLEAN_MODE" != "true" ]; then
                echo ""
                echo "    # ═══════════════════════════════════════════════════"
                echo "    # 资源限制（推荐配置）/ Resource Limits (Recommended)"
                echo "    # 说明：原容器未配置资源限制，建议根据实际需求设置"
                echo "    # Note: Original container has no limits, set based on your needs"
                echo "    # 使用方法：取消下方注释并调整数值"
                echo "    # Usage: Uncomment and adjust values below"
                echo "    # ═══════════════════════════════════════════════════"
                if [ "$IS_SWARM" = "true" ]; then
                    echo "    # deploy:"
                    echo "    #   resources:"
                    echo "    #     limits:"
                    echo "    #       cpus: '1.0'"
                    echo "    #       memory: 512M"
                else
                    echo "    # mem_limit: 512M"
                    echo "    # cpus: 1.0"
                fi
            fi
        fi

        # 健康检查
        if [ "$CLEAN_MODE" != "true" ]; then
            local HEALTHCHECK=$(docker inspect "$container" --format='{{json .Config.Healthcheck}}')
            if [ "$HEALTHCHECK" != "null" ]; then
                echo ""
                echo "    # ═══════════════════════════════════════════════════"
                echo "    # 健康检查（来自原容器配置）/ Health Check (From Original)"
                echo "    # 说明：原容器配置了健康检查"
                echo "    # Note: Original container has health check configured"
                echo "    # ⚠️ 注意：需要根据实际情况调整下方配置"
                echo "    # ⚠️ Warning: Adjust the configuration below as needed"
                echo "    # 使用方法：取消下方注释并根据应用调整"
                echo "    # Usage: Uncomment and adjust for your application"
                echo "    # ═══════════════════════════════════════════════════"
                echo "    # healthcheck:"
                echo "    #   test: [\"CMD\", \"curl\", \"-f\", \"http://localhost\"]  # 根据应用调整"
                echo "    #   interval: 30s      # 检查间隔"
                echo "    #   timeout: 10s       # 超时时间"
                echo "    #   retries: 3         # 重试次数"
                echo "    #   start_period: 40s  # 启动宽限期（可选）"
            else
                # 原容器没有健康检查，提供示例（注释形式）
                echo ""
                echo "    # ═══════════════════════════════════════════════════"
                echo "    # 健康检查（推荐配置）/ Health Check (Recommended)"
                echo "    # 说明：原容器未配置健康检查，建议根据应用类型添加"
                echo "    # Note: No health check in original, recommend adding based on app type"
                echo "    # 使用方法：取消下方注释并根据应用调整"
                echo "    # Usage: Uncomment and adjust for your application"
                echo "    # ═══════════════════════════════════════════════════"
                echo "    # 示例1：HTTP 服务"
                echo "    # healthcheck:"
                echo "    #   test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:80/health\"]"
                echo "    #   interval: 30s"
                echo "    #   timeout: 10s"
                echo "    #   retries: 3"
                echo "    #"
                echo "    # 示例2：数据库服务"
                echo "    # healthcheck:"
                echo "    #   test: [\"CMD\", \"mysqladmin\", \"ping\", \"-h\", \"localhost\"]"
                echo "    #   interval: 30s"
                echo "    #   timeout: 5s"
                echo "    #   retries: 3"
                echo "    #"
                echo "    # 示例3：通用检查"
                echo "    # healthcheck:"
                echo "    #   test: [\"CMD-SHELL\", \"echo ok\"]"
                echo "    #   interval: 30s"
                echo "    #   timeout: 3s"
                echo "    #   retries: 3"
            fi
        fi

        # 网络声明部分（如果需要自定义网络）
        if [ "$NEEDS_NETWORK_SECTION" = "true" ]; then
            echo ""
            echo "networks:"
            echo "  $NETWORK_MODE:"
            echo "    external: true"
        fi

        # 可选配置和使用说明（仅在非清洁模式下显示）
        if [ "$CLEAN_MODE" != "true" ]; then
            echo ""
            echo "# ════════════════════════════════════════════════"
            echo "# 可选配置（根据需要启用）/ Optional Configurations"
            echo "# ════════════════════════════════════════════════"
            echo "#"
            echo "# 如果需要自定义网络（多容器互联时）："
            echo "# If you need custom network (for multi-container communication):"
            echo "#"
            echo "# networks:"
            echo "#   app-network:"
            echo "#     driver: bridge"
            echo "#"
            echo "# 然后在服务中添加："
            echo "# Then add to service:"
            echo "#   networks:"
            echo "#     - app-network"
            echo ""
            echo "# ════════════════════════════════════════════════"
            echo "# 使用方法 / Usage："
            echo "# ════════════════════════════════════════════════"
            echo "#   docker compose up -d      # 启动 / Start"
            echo "#   docker compose ps         # 查看状态 / Check status"
            echo "#   docker compose logs -f    # 查看日志 / View logs"
            echo "#   docker compose down       # 停止并删除 / Stop and remove"
            echo "#   docker compose restart    # 重启 / Restart"
            echo "# ════════════════════════════════════════════════"
            echo "#"
            echo "# ⚠️ 重要提示 / Important Notes:"
            echo "#   1. 启动前请检查配置是否正确"
            echo "#      Check configuration before starting"
            echo "#   2. 根据需要取消注释可选配置"
            echo "#      Uncomment optional configs as needed"
            echo "#   3. 验证配置：docker compose config"
            echo "#      Validate: docker compose config"
            echo "# ════════════════════════════════════════════════"
        fi

    } > "$compose_file"

    # 如果是 env 模式，生成额外文件
    if [ "$EXPORT_TYPE" = "env" ]; then
        # 创建 .gitignore
        cat > "$output_dir/.gitignore" <<'GITIGNORE_EOF'
# 环境变量文件（包含敏感信息）
.env
.env.local
.env.production

# 数据目录
data/
logs/
*.log

# 临时文件
*.tmp
*.bak
GITIGNORE_EOF

        # 创建 README.md
        cat > "$output_dir/README.md" <<README_EOF
# $container - Docker Compose 配置

## 📌 文件说明

- \`docker-compose.yml\` - Docker Compose 配置文件
- \`.env\` - 环境变量配置（**包含敏感信息，不要提交到 Git**）
- \`.env.example\` - 环境变量模板（可以提交到 Git）
- \`.gitignore\` - Git 忽略配置

## 🚀 快速开始

### 首次使用

\`\`\`bash
# 1. 检查 .env 文件是否有敏感信息需要填写
cat .env

# 2. 验证配置
docker compose config

# 3. 启动服务
docker compose up -d

# 4. 查看状态
docker compose ps

# 5. 查看日志
docker compose logs -f
\`\`\`

### 在新环境部署

\`\`\`bash
# 1. 复制模板文件
cp .env.example .env

# 2. 编辑 .env，填写实际配置
nano .env

# 3. 启动服务
docker compose up -d
\`\`\`

## 📋 常用命令

\`\`\`bash
# 启动服务
docker compose up -d

# 停止服务
docker compose stop

# 停止并删除容器
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f

# 查看状态
docker compose ps
\`\`\`

## ⚠️ 注意事项

1. **不要将 .env 文件提交到 Git**
   - .env 包含敏感信息
   - 已自动添加到 .gitignore

2. **分享配置时**
   - 只分享 docker-compose.yml 和 .env.example
   - 不要分享 .env

3. **备份配置时**
   - 备份时注意 .env 文件的安全
   - 考虑加密存储

---

**生成时间**：$(date '+%Y-%m-%d %H:%M:%S')
**原容器**：$container
**生成工具**：docker-export-compose.sh v$VERSION
README_EOF

        log_info "生成 .env 文件：$env_file"
        log_info "生成 .env.example 文件：$env_example_file"
        log_info "生成 .gitignore 文件：$output_dir/.gitignore"
        log_info "生成 README.md 文件：$output_dir/README.md"
    fi

    # 验证生成的文件
    if [ -f "$compose_file" ]; then
        log_success "导出成功：$compose_file"

        if [ "$EXPORT_TYPE" = "env" ]; then
            log_warn "请检查 .env 文件中的敏感信息"
        fi

        EXPORT_COUNT=$((EXPORT_COUNT + 1))
        return 0
    else
        log_error "导出失败：$container"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        return 1
    fi
}

# ============================================
# 从文件批量导出
# ============================================
batch_from_file() {
    local file="$1"

    if [ ! -f "$file" ]; then
        log_error "文件不存在：$file"
        exit 1
    fi

    log_info "从文件读取容器列表：$file"

    local total_lines=0
    local valid_lines=0

    # 统计有效行
    while IFS= read -r line; do
        total_lines=$((total_lines + 1))
        # 跳过注释和空行
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "$line" ]] && continue
        valid_lines=$((valid_lines + 1))
    done < "$file"

    log_info "文件包含 $total_lines 行，有效容器 $valid_lines 个"
    echo "" >&2

    # 处理每一行
    while IFS= read -r line; do
        # 跳过注释和空行
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "$line" ]] && continue

        # 去除前后空格
        local container=$(echo "$line" | xargs)

        convert_container "$container"
        echo "" >&2
    done < "$file"
}

# ============================================
# 导出所有容器
# ============================================
export_all_containers() {
    local filter="$1"  # "all", "running", "stopped"

    local cmd="docker ps"
    case "$filter" in
        "all")
            cmd="docker ps -a"
            log_info "导出所有容器（包括已停止）"
            ;;
        "running")
            cmd="docker ps"
            log_info "导出所有运行中的容器"
            ;;
        "stopped")
            cmd="docker ps -a --filter status=exited"
            log_info "导出所有已停止的容器"
            ;;
    esac

    local containers=$($cmd --format '{{.Names}}')

    if [ -z "$containers" ]; then
        log_warn "没有找到符合条件的容器"
        exit 0
    fi

    local count=$(echo "$containers" | wc -l)
    log_info "找到 $count 个容器"
    echo "" >&2

    # 列出容器
    if [ "$QUIET_MODE" != "true" ]; then
        echo -e "${YELLOW}容器列表：${NC}" >&2
        echo "$containers" | while read cont; do
            local img=$(docker inspect "$cont" --format='{{.Config.Image}}')
            local status=$(docker inspect "$cont" --format='{{.State.Status}}')
            echo "  - $cont ($img) [$status]" >&2
        done
        echo "" >&2
    fi

    # 转换每个容器
    echo "$containers" | while read container; do
        convert_container "$container"
        echo "" >&2
    done
}

# ============================================
# 显示最终统计
# ============================================
show_summary() {
    # 在安静模式下跳过统计输出
    if [ "$QUIET_MODE" = "true" ]; then
        return 0
    fi

    echo "" >&2
    echo "═══════════════════════════════════════════════════" >&2
    echo -e "${GREEN}导出完成统计${NC}" >&2
    echo "═══════════════════════════════════════════════════" >&2
    echo -e "  成功导出：${GREEN}$EXPORT_COUNT${NC}" >&2
    echo -e "  导出失败：${RED}$FAILED_COUNT${NC}" >&2
    echo -e "  跳过数量：${YELLOW}$SKIPPED_COUNT${NC}" >&2
    echo -e "  输出目录：${CYAN}$OUTPUT_DIR${NC}" >&2
    echo "═══════════════════════════════════════════════════" >&2

    if [ "$EXPORT_COUNT" -gt 0 ]; then
        echo "" >&2
        echo -e "${YELLOW}下一步操作：${NC}" >&2
        echo "  1. 检查生成的配置文件" >&2
        echo "  2. 调整配置（如有需要）" >&2
        echo "  3. 使用 docker compose up -d 启动" >&2
        echo "" >&2
        echo -e "${YELLOW}提示：${NC}" >&2
        echo "  - 原容器不受影响，可以继续运行" >&2
        echo "  - 建议在测试环境验证后再使用" >&2
        echo "  - 可以逐个迁移，降低风险" >&2
    fi

    echo "" >&2
}

# ============================================
# 主程序
# ============================================
main() {
    # 参数解析
    local MODE=""
    local INPUT_FILE=""
    local CONTAINER_NAME=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help_en
                exit 0
                ;;
            --help-cn)
                show_help_cn
                exit 0
                ;;
            -v|--version)
                show_version
                exit 0
                ;;
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -f|--file)
                MODE="file"
                INPUT_FILE="$2"
                shift 2
                ;;
            --all)
                MODE="all"
                shift
                ;;
            --all-run)
                MODE="running"
                shift
                ;;
            --all-stop)
                MODE="stopped"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --overwrite)
                OVERWRITE_MODE="true"
                shift
                ;;
            --quiet)
                QUIET_MODE="true"
                shift
                ;;
            --privacy)
                PRIVACY_MODE="true"
                shift
                ;;
            --must-output)
                MUST_OUTPUT="true"
                shift
                ;;
            --clean)
                CLEAN_MODE="true"
                shift
                ;;
            --type)
                EXPORT_TYPE="$2"
                if [ "$EXPORT_TYPE" != "yml" ] && [ "$EXPORT_TYPE" != "env" ]; then
                    log_error "无效的导出类型：$EXPORT_TYPE（只支持 yml 或 env）"
                    exit 1
                fi
                shift 2
                ;;
            -*)
                log_error "未知选项：$1"
                echo "" >&2
                echo "使用 --help 查看帮助" >&2
                exit 1
                ;;
            *)
                CONTAINER_NAME="$1"
                shift
                ;;
        esac
    done

    # 显示横幅
    if [ "$QUIET_MODE" != "true" ]; then
        echo "" >&2
        echo "═══════════════════════════════════════════════════" >&2
        echo -e "${GREEN}Docker Export to Compose v${VERSION}${NC}" >&2
        echo "═══════════════════════════════════════════════════" >&2
        echo "" >&2
    fi

    # 加载自定义敏感关键词配置
    load_custom_keywords "$CONFIG_FILE"
    if [ "$QUIET_MODE" != "true" ]; then
        echo "" >&2
    fi

    # 检查 Docker 是否运行
    if ! docker info &>/dev/null; then
        log_error "Docker 未运行或无权限访问"
        echo "" >&2
        echo "请检查：" >&2
        echo "  1. Docker 服务是否启动：systemctl status docker" >&2
        echo "  2. 是否有权限：sudo usermod -aG docker \$USER" >&2
        exit 1
    fi

    # 检查输出目录是否为核心系统目录
    if is_critical_directory "$OUTPUT_DIR"; then
        if [ "$MUST_OUTPUT" = "true" ]; then
            log_warn "检测到 --must-output 标志，跳过目录安全检查"
            log_warn "Detected --must-output flag, skipping directory safety check"
        else
            log_error "禁止输出到核心系统目录！"
            log_error "Output to critical system directory is FORBIDDEN!"
            echo "" >&2

            if ! confirm_critical_output "$OUTPUT_DIR"; then
                echo "" >&2
                log_error "操作已取消。请使用安全的输出目录。"
                log_error "Operation cancelled. Please use a safe output directory."
                echo "" >&2
                echo -e "${GREEN}建议的安全目录 / Recommended safe directories:${NC}" >&2
                echo "  - ~/docker-exports" >&2
                echo "  - ./output (默认 / default)" >&2
                echo "  - /tmp/docker-exports" >&2
                echo "" >&2
                echo -e "${YELLOW}或使用 --must-output 强制输出（非常危险！）${NC}" >&2
                echo -e "${YELLOW}Or use --must-output to force (VERY DANGEROUS!)${NC}" >&2
                exit 1
            fi
        fi
    fi

    # 显示模式信息
    if [ "$PRIVACY_MODE" = "true" ]; then
        log_info "隐私模式已启用：主机路径将被隐藏"
        log_info "Privacy mode enabled: Host paths will be masked"
    fi

    if [ "$CLEAN_MODE" = "true" ]; then
        log_info "清洁模式已启用：生成简洁的 YAML（无注释）"
        log_info "Clean mode enabled: Generate minimal YAML without comments"
    fi

    # 根据模式执行
    case "$MODE" in
        "file")
            batch_from_file "$INPUT_FILE"
            ;;
        "all")
            export_all_containers "all"
            ;;
        "running")
            export_all_containers "running"
            ;;
        "stopped")
            export_all_containers "stopped"
            ;;
        *)
            # 单个容器模式
            if [ -z "$CONTAINER_NAME" ]; then
                log_error "未指定容器名"
                echo "" >&2
                echo "使用 --help 或 --help-cn 查看帮助" >&2
                exit 1
            fi
            convert_container "$CONTAINER_NAME"
            ;;
    esac

    # 显示统计
    show_summary

    # 返回状态
    if [ "$FAILED_COUNT" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# ============================================
# 执行主程序
# ============================================
main "$@"

