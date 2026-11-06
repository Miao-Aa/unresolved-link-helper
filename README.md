# Unresolved Link Helper

[English](#english) | [简体中文](#简体中文)

## English

Unresolved Link Helper improves the workflow for creating notes from unresolved internal links in Obsidian. When you follow an unresolved link, the plugin lets you choose the note title and destination folder before creating the note. It can also add the link text as an alias and update the source link to point to the chosen title.

### Features

- Intercepts unresolved internal links and opens a note-creation dialog.
- Choose the new note's title and destination folder.
- Adds the link's display text to the note's `aliases` frontmatter, without duplicating an existing alias.
- If a note with that path already exists, keeps its contents and merges in the alias instead of overwriting it.
- Optionally rewrites matching links in the active source note to `[[Chosen title|link text]]`.
- Optionally opens the resulting note after creation.
- Works locally in your vault; it does not make network requests or collect telemetry.

### Install

#### From a release

1. Download `main.js` and `manifest.json` from a [GitHub release](https://github.com/Miao-Aa/unresolved-link-helper/releases).
2. Copy them into `<your-vault>/.obsidian/plugins/unresolved-link-helper/`.
3. In Obsidian, go to **Settings → Community plugins** and enable **Unresolved Link Helper**.

#### With BRAT

Add `Miao-Aa/unresolved-link-helper` in BRAT to install the repository's beta version.

### Use

1. Create or find a note containing an unresolved internal link, for example `[[Mina]]`.
2. Follow the unresolved link.
3. In the dialog, enter the final note title and destination folder, then select **Create**.

For example, if the link is `[[Mina]]` and you enter `Minako Tanaka` as the title, the plugin adds `Mina` as an alias. If source-link rewriting is enabled, matching links in the active note become `[[Minako Tanaka|Mina]]`.

If the destination note already exists, its content is preserved and the alias is merged into its frontmatter.

### Settings

- **Default folder**: Folder prefilled in the creation dialog. Defaults to `People`. Leave blank to create the note at the vault root.
- **Open new note**: Open the created or existing destination note after processing. Enabled by default.
- **Rewrite source link**: Update matching links in the active note when the chosen title differs from the original link target. Enabled by default.

### Templates

The plugin does not provide a template picker or perform template substitution. If you use Templater, configure its folder templates for the destination folder. The plugin creates a new note first, then waits briefly before adding the alias so that an automatically triggered folder template is less likely to overwrite it. If your template setup still replaces the alias, adjust its Templater settings or folder-template workflow.

### Development

Requires Node.js 18 or later and npm.

```bash
npm install
npm run dev      # Build and watch
npm run build    # Type-check and create production build
npm run lint     # Run ESLint
```

The production bundle is generated as `main.js` in the repository root. Do not commit generated build files such as `main.js` or `node_modules/`.

### Compatibility

- Minimum Obsidian version: **1.4.4**
- Desktop and mobile: the manifest does not mark the plugin as desktop-only.

### License

[MIT](LICENSE)

## 简体中文

Unresolved Link Helper 用于改进 Obsidian 中未解析内部链接的笔记创建流程。跟随未解析链接时，插件会先打开配置弹窗，让你指定笔记标题和保存文件夹；还可以将链接显示文本添加为别名，并将源笔记中的链接更新为新标题。

### 功能

- 拦截未解析的内部链接，并打开笔记创建弹窗。
- 自定义新笔记的正式标题和保存文件夹。
- 将链接显示文本合并到笔记的 `aliases` frontmatter 中，并避免重复添加。
- 如果目标路径已经有笔记，不覆盖原内容，只合并别名。
- 可选将当前源笔记中的匹配链接改写为 `[[正式标题|链接文本]]`。
- 可选在创建或处理完成后打开目标笔记。
- 在本地 Vault 中工作，不会发起网络请求或收集遥测数据。

### 安装

#### 通过 GitHub Release 安装

1. 从 [GitHub Release](https://github.com/Miao-Aa/unresolved-link-helper/releases) 下载 `main.js` 和 `manifest.json`。
2. 将文件复制到 `<你的Vault>/.obsidian/plugins/unresolved-link-helper/`。
3. 在 Obsidian 中打开 **设置 → 第三方插件**，启用 **Unresolved Link Helper**。

#### 通过 BRAT 安装

在 BRAT 中添加 `Miao-Aa/unresolved-link-helper`，即可安装仓库中的测试版。

### 使用方法

1. 在笔记中创建或找到一个未解析的内部链接，例如 `[[小美]]`。
2. 跟随该未解析链接。
3. 在弹窗中填写正式标题和保存文件夹，然后选择**创建**。

例如，链接为 `[[小美]]`，正式标题填写为 `田中美奈子`，插件会将“小美”添加为新笔记的别名。启用“回写源链接”后，当前笔记中的匹配链接会变为 `[[田中美奈子|小美]]`。

如果目标笔记已经存在，插件会保留其内容，并将别名合并到 frontmatter 中。

### 设置

- **默认保存文件夹**：创建弹窗中预填的文件夹，默认为 `People`。留空时会在 Vault 根目录创建笔记。
- **创建后打开新笔记**：处理完成后打开创建的或已存在的目标笔记，默认开启。
- **回写源链接**：正式标题与原链接目标不同时，将当前笔记中的匹配链接更新为新标题，默认开启。

### 模板

插件不提供模板选择器，也不会执行模板变量替换。如果使用 Templater，请为目标文件夹配置文件夹模板。插件会先创建新笔记，再短暂等待后写入别名，以降低自动触发的文件夹模板覆盖别名的概率。如果模板仍会覆盖别名，请调整 Templater 设置或文件夹模板的工作流程。

### 开发

需要 Node.js 18 或更高版本及 npm。

```bash
npm install
npm run dev      # 构建并监听文件变化
npm run build    # 类型检查并生成正式构建
npm run lint     # 运行 ESLint
```

正式构建会在仓库根目录生成 `main.js`。请勿提交 `main.js`、`node_modules/` 等生成文件。

### 兼容性

- 最低 Obsidian 版本：**1.4.4**
- 插件清单未将插件标记为仅限桌面端。

### 许可证

[MIT](LICENSE)
