import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  SuggestModal,
  TFile,
} from "obsidian";

/* =========================
 * 设置与数据结构
 * ========================= */

interface UnresolvedLinkHelperSettings {
  defaultFolder: string;
  defaultTemplatePath: string;
  openNewNote: boolean;
  rewriteSourceLink: boolean;
}

const DEFAULT_SETTINGS: UnresolvedLinkHelperSettings = {
  defaultFolder: "People",
  defaultTemplatePath: "",
  openNewNote: true,
  rewriteSourceLink: true,
};

interface CreateConfig {
  title: string;
  folder: string;
  template: TFile | null;
}

/* =========================
 * 模板选择器
 * ========================= */

class TemplateSuggestModal extends SuggestModal<TFile> {
  private onChoose: (file: TFile) => void;

  constructor(app: App, onChoose: (file: TFile) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("搜索模板文件...");
  }

  getSuggestions(query: string): TFile[] {
    const q = query.toLowerCase();
    return this.app.vault
      .getMarkdownFiles()
      .filter((f) => f.basename.toLowerCase().includes(q))
      .slice(0, 50);
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.createEl("div", { text: file.basename });
    el.createEl("small", { text: file.path });
  }

  onChooseSuggestion(file: TFile): void {
    this.onChoose(file);
  }
}

/* =========================
 * 创建配置弹窗
 * ========================= */

class CreateConfigModal extends Modal {
  private title: string;
  private folder: string;
  private template: TFile | null;
  private onSubmit: (cfg: CreateConfig) => void;

  constructor(
    app: App,
    defaultTitle: string,
    defaultFolder: string,
    defaultTemplate: TFile | null,
    onSubmit: (cfg: CreateConfig) => void
  ) {
    super(app);
    this.title = defaultTitle;
    this.folder = defaultFolder;
    this.template = defaultTemplate;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "创建笔记" });

    new Setting(contentEl)
      .setName("正式标题")
      .setDesc("作为文件名。若与链接文本不同，源链接会被回写为 [[正式名|外号]]")
      .addText((t) =>
        t.setValue(this.title).onChange((v) => (this.title = v.trim()))
      );

    new Setting(contentEl)
      .setName("保存位置")
      .setDesc("笔记将被创建到这个文件夹")
      .addText((t) =>
        t.setValue(this.folder).onChange((v) => (this.folder = v.trim()))
      );

    new Setting(contentEl)
      .setName("模板")
      .setDesc("创建时应用的模板，留空则不套用")
      .addButton((b) =>
        b
          .setButtonText(this.template ? this.template.basename : "选择模板")
          .onClick(() => {
            new TemplateSuggestModal(this.app, (file) => {
              this.template = file;
              b.setButtonText(file.basename);
            }).open();
          })
      );

    new Setting(contentEl).addButton((b) =>
      b
        .setButtonText("创建")
        .setCta()
        .onClick(() => {
          if (!this.title) {
            new Notice("标题不能为空");
            return;
          }
          this.close();
          this.onSubmit({
            title: this.title,
            folder: this.folder,
            template: this.template,
          });
        })
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/* =========================
 * 主插件
 * ========================= */

export default class UnresolvedLinkHelper extends Plugin {
  settings: UnresolvedLinkHelperSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerDomEvent(document, "click", this.handleClick.bind(this), {
      capture: true,
    });

    this.addSettingTab(new UnresolvedLinkHelperSettingTab(this.app, this));
  }

  onunload(): void {
    // 无需手动清理，registerDomEvent 会自动移除
  }

  /* ---------- 点击拦截 ---------- */

  private handleClick(evt: MouseEvent): void {

    const target = evt.target as HTMLElement | null;
    if (!target) return;

    let linkEl: HTMLElement | null = target.closest("a.internal-link.is-unresolved");

    if (!linkEl) {
      const candidate = target.closest("[data-href]") as HTMLElement | null;
      if (candidate) {
        const href = candidate.getAttribute("data-href") || "";
        const targetPath = (href.split("|")[0] ?? "").split("#")[0]?.trim() ?? "";
        if (targetPath && !this.app.metadataCache.getFirstLinkpathDest(targetPath, "")) {
          linkEl = candidate;
        }
      }
    }

    if (!linkEl) {
      const cmUnderline = target.closest(".cm-underline") as HTMLElement | null;
      if (cmUnderline) {
        const text = cmUnderline.textContent?.trim() || "";
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && text) {
          const unresolved = this.app.metadataCache.unresolvedLinks[activeFile.path] || {};
          if (unresolved[text] !== undefined) {
            linkEl = cmUnderline;
          }
        }
      }
    }

    if (!linkEl) return;

    evt.preventDefault();
    evt.stopPropagation();

    const href = linkEl.getAttribute("data-href") || linkEl.textContent?.trim() || "";
    if (!href) return;

    const [targetTitle, displayText] = this.parseLink(href);
    if (!targetTitle) return;

    const sourceFile = this.app.workspace.getActiveFile();

    new CreateConfigModal(
      this.app,
      targetTitle,
      this.settings.defaultFolder,
      this.getDefaultTemplate(),
      (cfg) => {
        void this.createNoteWithConfig(cfg, sourceFile, targetTitle, displayText);
      }
    ).open();
  }

  /**
   * 解析 [[目标|别名]] 或 [[目标#标题|别名]] 的 data-href。
   * 返回 [目标标题, 显示文本/别名]。
   */
  private parseLink(href: string): [string, string] {
    const parts = href.split("|");
    const targetPart = (parts[0] ?? "").trim();
    const target = (targetPart.split("#")[0] ?? "").trim();
    const display = (parts[1] ?? "").trim() || target;
    return [target, display];
  }

  private getDefaultTemplate(): TFile | null {
    if (!this.settings.defaultTemplatePath) return null;
    const file = this.app.vault.getAbstractFileByPath(
      this.settings.defaultTemplatePath
    );
    return file instanceof TFile ? file : null;
  }

  private getTodayString(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  /* ---------- 创建流程 ---------- */

  private async ensureFolder(folderPath: string): Promise<void> {
    if (!folderPath) return;
    const exists = await this.app.vault.adapter.exists(folderPath);
    if (!exists) {
      await this.app.vault.createFolder(folderPath);
    }
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[\\/:*?"<>|#^[\]]/g, "-").trim();
  }

  private async createNoteWithConfig(
    cfg: CreateConfig,
    sourceFile: TFile | null,
    originalAlias: string,
    displayText: string
  ): Promise<void> {
    try {
      await this.ensureFolder(cfg.folder);

      const safeTitle = this.sanitizeFileName(cfg.title);
      const filePath = cfg.folder
        ? `${cfg.folder}/${safeTitle}.md`
        : `${safeTitle}.md`;

      let targetFile = this.app.vault.getAbstractFileByPath(filePath);

      if (targetFile instanceof TFile) {
        // 文件已存在：不重建，只补别名并提示
        new Notice(`文件已存在，将合并别名：${filePath}`);
      } else {
        // 1. 先创建空文件
        targetFile = await this.app.vault.create(filePath, "");

        // 2. 再写入模板（必须 await 完成，保证别名不会被覆盖）
        if (cfg.template) {
          const templateContent = await this.app.vault.read(cfg.template);
          const processed = templateContent
            .replace(/{{title}}/g, cfg.title)
            .replace(/{{date}}/g, this.getTodayString());
          await this.app.vault.modify(targetFile as TFile, processed);
        }
      }

      const file = targetFile as TFile;

      // 3. 模板写完后，再合并别名
      const aliasToAdd = displayText || originalAlias;
      if (aliasToAdd) {
        await this.addAlias(file, aliasToAdd);
      }

      // 4. 若标题被改过，回写源链接
      if (
        this.settings.rewriteSourceLink &&
        sourceFile &&
        cfg.title !== originalAlias
      ) {
        await this.rewriteSourceLink(
          sourceFile,
          originalAlias,
          cfg.title,
          displayText
        );
      }

      if (this.settings.openNewNote) {
        await this.app.workspace.getLeaf().openFile(file);
      }

      new Notice(`已创建：${cfg.title}`);
    } catch (err) {
      console.error(err);
      new Notice(`创建失败：${(err as Error).message}`);
    }
  }

  /* ---------- 别名与回写 ---------- */

  private async addAlias(file: TFile, alias: string): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      const existing = Array.isArray(fm.aliases)
        ? fm.aliases
        : fm.aliases
          ? [fm.aliases]
          : [];
      if (!existing.includes(alias)) {
        fm.aliases = [...existing, alias];
      }
    });
  }

  private async rewriteSourceLink(
    sourceFile: TFile,
    originalAlias: string,
    newTitle: string,
    displayText: string
  ): Promise<void> {
    const content = await this.app.vault.read(sourceFile);
    const candidates = [
      `[[${originalAlias}]]`,
      `[[${originalAlias}|${displayText}]]`,
    ];
    let updated = content;

    for (const c of candidates) {
      if (updated.includes(c)) {
        updated = updated.split(c).join(`[[${newTitle}|${displayText}]]`);
      }
    }

    if (updated !== content) {
      await this.app.vault.modify(sourceFile, updated);
    }
  }

  /* ---------- 设置持久化 ---------- */

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

/* =========================
 * 设置面板
 * ========================= */

class UnresolvedLinkHelperSettingTab extends PluginSettingTab {
  plugin: UnresolvedLinkHelper;

  constructor(app: App, plugin: UnresolvedLinkHelper) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("默认保存文件夹")
      .setDesc("Ctrl+点击未解析链接时，弹窗中默认填入的文件夹")
      .addText((t) =>
        t
          .setPlaceholder("People")
          .setValue(this.plugin.settings.defaultFolder)
          .onChange(async (v) => {
            this.plugin.settings.defaultFolder = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("默认模板路径")
      .setDesc("例如 Templates/人物模板.md；留空表示不预选模板")
      .addText((t) =>
        t
          .setPlaceholder("Templates/人物模板.md")
          .setValue(this.plugin.settings.defaultTemplatePath)
          .onChange(async (v) => {
            this.plugin.settings.defaultTemplatePath = v.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("创建后打开新笔记")
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.openNewNote)
          .onChange(async (v) => {
            this.plugin.settings.openNewNote = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("回写源链接")
      .setDesc("若正式标题与链接文本不同，把 [[外号]] 更新为 [[正式名|外号]]")
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.rewriteSourceLink)
          .onChange(async (v) => {
            this.plugin.settings.rewriteSourceLink = v;
            await this.plugin.saveSettings();
          })
      );
  }
}