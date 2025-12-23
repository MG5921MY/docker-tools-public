// 参数模型：描述 docker-export-compose.sh 的主要选项与模式
// 该文件仅在前端使用，不会改变脚本行为。

window.DockerExportConfigModel = {
  version: "2.3.0",
  modes: [
    {
      id: "single",
      label: "单个容器",
      description: "对应 <CONTAINER_NAME> 位置参数",
      requiresContainerName: true,
      supportsContainerList: false,
    },
    {
      id: "batchFromList",
      label: "批量（粘贴容器列表）",
      description: "对应 --file <FILE>，由后端生成临时文件",
      requiresContainerName: false,
      supportsContainerList: true,
    },
    {
      id: "all-run",
      label: "所有运行中的容器",
      description: "对应 --all-run",
      requiresContainerName: false,
      supportsContainerList: false,
    },
    {
      id: "all",
      label: "所有容器（包含已停止）",
      description: "对应 --all",
      requiresContainerName: false,
      supportsContainerList: false,
    },
    {
      id: "all-stop",
      label: "所有已停止的容器",
      description: "对应 --all-stop",
      requiresContainerName: false,
      supportsContainerList: false,
    },
  ],
  options: {
    outputDir: {
      id: "outputDir",
      cli: ["-o", "--output"],
      type: "string",
      default: "./output",
      required: false,
      label: "输出目录",
      description: "脚本输出目录，默认 ./output，建议使用非系统核心目录。",
    },
    exportType: {
      id: "exportType",
      cli: ["--type"],
      type: "enum",
      default: "yml",
      values: [
        { value: "yml", label: "yml - 仅 docker-compose.yml" },
        { value: "env", label: "env - compose + .env（生产推荐）" },
      ],
      label: "导出类型",
      description: "与脚本 --type 选项对应，支持 yml / env。",
    },
    privacy: {
      id: "privacy",
      cli: ["--privacy"],
      type: "boolean",
      default: false,
      label: "隐私模式",
      description: "隐藏数据卷主机路径（--privacy）。",
    },
    clean: {
      id: "clean",
      cli: ["--clean"],
      type: "boolean",
      default: false,
      label: "清洁模式",
      description: "生成无注释的精简 YAML（--clean）。",
    },
    dryRun: {
      id: "dryRun",
      cli: ["--dry-run"],
      type: "boolean",
      default: false,
      label: "模拟运行",
      description: "仅预览，不实际创建文件（--dry-run）。",
    },
    overwrite: {
      id: "overwrite",
      cli: ["--overwrite"],
      type: "boolean",
      default: false,
      label: "覆盖模式",
      description: "覆盖已存在目录（--overwrite）。",
    },
    quiet: {
      id: "quiet",
      cli: ["--quiet"],
      type: "boolean",
      default: false,
      label: "安静模式",
      description: "最小化输出（--quiet）。",
    },
    mustOutput: {
      id: "mustOutput",
      cli: ["--must-output"],
      type: "boolean",
      default: false,
      label: "强制输出到核心目录",
      description:
        "跳过脚本的三次确认，非常危险，仅在完全确认风险后启用（--must-output）。",
    },
  },
};


