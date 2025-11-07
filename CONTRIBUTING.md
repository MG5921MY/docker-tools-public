# 贡献指南 / Contributing Guide

感谢您对 DockerTools 项目的关注！我们欢迎各种形式的贡献。

---

## 🤝 如何贡献

### 报告问题 / Reporting Issues

如果您发现了 bug 或有功能建议：

1. **搜索现有 Issues** - 检查问题是否已被报告
2. **创建新 Issue** - 提供详细信息：
   - 问题描述
   - 复现步骤
   - 预期行为
   - 实际行为
   - 环境信息（OS、Docker 版本等）

### 提交代码 / Pull Requests

1. **Fork 项目**
2. **创建分支** - 使用描述性的分支名
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/bug-description
   ```
3. **编写代码** - 遵循项目规范
4. **测试** - 确保所有功能正常
5. **提交** - 编写清晰的提交信息
6. **Push 并创建 PR**

---

## 📝 代码规范

### Shell 脚本规范

```bash
# 1. 使用 set -e 捕获错误
set -e

# 2. 函数命名使用小写+下划线
function_name() {
    # 函数体
}

# 3. 变量命名
LOCAL_VAR="value"      # 局部变量大写
global_var="value"     # 全局变量小写

# 4. 注释
# 单行注释
# 函数说明注释
```

### 文档规范

请参阅 [docs/DockerTools 文档编写和维护指南.md](docs/DockerTools%20文档编写和维护指南.md)

---

## ✅ 提交前检查清单

- [ ] 代码符合项目规范
- [ ] 所有测试通过
- [ ] 更新了相关文档
- [ ] 更新了 CHANGELOG
- [ ] 提交信息清晰明确
- [ ] 没有引入新的 linter 错误

---

## 📋 提交信息格式

```
<类型>: <简短描述>

<详细描述（可选）>

<相关 Issue（可选）>
```

**类型**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**：
```
feat: 添加隐私模式支持

- 添加 --privacy 参数
- 隐藏数据卷主机路径
- 更新文档和帮助信息

Closes #123
```

---

## 🔍 代码审查

所有 PR 都需要经过审查：

1. **自动检查** - CI/CD 自动运行
2. **代码审查** - 维护者手动审查
3. **测试** - 功能测试
4. **文档** - 文档完整性检查

---

## 📚 资源

- [项目文档](docs/README.md)
- [安全指南](export/sh/docs/1_安全使用指南.md)
- [文档编写指南](docs/DockerTools%20文档编写和维护指南.md)

---

## 💬 交流

- 问题讨论：GitHub Issues
- 功能建议：GitHub Discussions
- 文档问题：在对应文档创建 Issue

---

## 📄 许可证

贡献的代码将采用项目的 MIT License。

---

感谢您的贡献！🎉

