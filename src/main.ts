// 在 main.ts 顶部导入 ItemView 和 WorkspaceLeaf
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, TFile } from 'obsidian';
import { WebSocketManager } from './websocketManager';
import { AIChatView } from './AIChatView';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
	apiUrl: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	apiUrl: 'http://localhost:8123/api'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	private chatId: string; // 添加 chatId 属性
	// 在 MyPlugin 类中添加常量
	static VIEW_TYPE_CHAT = "ai-tool-chat-view";

	// 在 MyPlugin 类中添加 WebSocketManager 的 getter
	private _websocketManager: WebSocketManager | null = null;

	public get websocketManager(): WebSocketManager | null {
		if (!this._websocketManager) {
			this._websocketManager = new WebSocketManager(this);
		}
		return this._websocketManager;
	}

	// 生成唯一的 chatId
	private generateChatId(): string {
		return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	public getChatId(): string {
		return this.chatId;
	}

	async onload() {
		await this.loadSettings();

		this.registerView(
			MyPlugin.VIEW_TYPE_CHAT,
			(leaf: WorkspaceLeaf) => new AIChatView(leaf, this)
		);

		// 在启动服务器之前生成 chatId
		this.chatId = this.generateChatId();
		console.log(`Generated chatId: ${this.chatId}`);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!xxx');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, _view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// 添加AI命令
		this.addCommand({
			id: 'send-to-ai',
			name: 'Send selection to AI',
			editorCallback: async (editor: Editor, _view: MarkdownView) => {
				const selectedText = editor.getSelection();
				if (!selectedText) {
					new Notice('Please select some text first');
					return;
				}

				// 记录插入"正在处理中..."的位置
				const cursor = editor.getCursor();
				const processingLine = cursor.line + 2; // 插入在选中文本后的第二行

				// 在光标位置后插入新行显示处理状态
				editor.setCursor(cursor.line, cursor.ch);
				//editor.replaceSelection('\n\n> ');
				editor.replaceSelection('\n\n');
				const markCursor = editor.getCursor();
				editor.replaceSelection('正在处理中...\n');

				try {
					// 获取响应并实时更新
					await this.fetchAIResponse(selectedText, (chunk) => {
						const responseLines = chunk.split('\n');
						const formattedResponse = responseLines.map((line: string) => `${line}`).join('\n');
						// 替换为实际响应内容
						editor.replaceSelection(formattedResponse);
					}, this.chatId);

					// 添加一个空行
					editor.replaceSelection('\n\n');
					//清除开头的正在处理
					editor.setCursor(markCursor);
					editor.setSelection(
						{ line: markCursor.line, ch: markCursor.ch },
						{ line: markCursor.line, ch: markCursor.ch + '正在处理中...'.length }
					);
					editor.replaceSelection('');

				} catch (error) {
					console.error('AI request failed:', error);
					editor.replaceSelection('> 请求失败，请检查控制台获取更多信息。');
					new Notice('AI请求失败，请检查控制台获取更多信息。');
				}
			}
		});

		// 添加打开视图的命令
		this.addCommand({
			id: 'open-ai-chat',
			name: '打开AI对话',
			callback: () => {
				this.activateView();
			}
		});

		// 添加右键菜单选项
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				const selectedText = editor.getSelection();
				if (selectedText) {
					menu.addItem((item) => {
						item.setTitle("Send to AI")
							.setIcon("send")
							.onClick(async () => {
								// 复用已有的AI处理逻辑
								try {
									new Notice('正在处理中...');
									const cursor = editor.getCursor();
									const processingLine = cursor.line + 2; // 插入在选中文本后的第二行
									// 在光标位置后插入新行显示处理状态
									editor.setCursor(processingLine, 0);
									editor.replaceSelection('\n\n');
									// 获取响应并实时更新
									await this.fetchAIResponse(selectedText, (chunk) => {
										// 这里可以将响应插入到当前文档或新文档中
										// 例如，在当前光标位置插入响应
										const cursor = editor.getCursor();
										editor.setCursor(cursor);
										editor.replaceSelection(chunk);
									}, this.chatId);

									new Notice('AI响应已完成');
								} catch (error) {
									console.error('AI request failed:', error);
									new Notice('AI请求失败，请检查控制台获取更多信息。');
								}
							});
					});
				}
			})
		);

		this.addCommand({
			id: 'create-my-note',
			name: '创建我的笔记',
			callback: () => {
				// 调用创建函数
				this.createMarkdownFile('我的新笔记.md', '# 欢迎\n\n这是新笔记的内容。');
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	// 在 MyPlugin 类中添加激活视图的方法
	private async activateView() {
		this.app.workspace.detachLeavesOfType(MyPlugin.VIEW_TYPE_CHAT);

		const rightLeaf = this.app.workspace.getRightLeaf(false);
		if (rightLeaf) {
			await rightLeaf.setViewState({
				type: MyPlugin.VIEW_TYPE_CHAT,
				active: true,
			});

			const leaves = this.app.workspace.getLeavesOfType(MyPlugin.VIEW_TYPE_CHAT);
			if (leaves.length > 0) {
				this.app.workspace.revealLeaf(leaves[0]);
			}
		}
	}

	async createMarkdownFile(relativePath: string, content: string) {
		const { vault } = this.app;

		try {
			const existingFile = vault.getAbstractFileByPath(relativePath);

			if (existingFile) {
				// 检查是否为 TFile 类型（排除文件夹）
				if (existingFile instanceof TFile) {
					// 询问用户是否要覆盖文件
					if (confirm(`文件 "${relativePath}" 已存在，是否要覆盖?`)) {
						await vault.modify(existingFile, content);
						new Notice(`文件已覆盖: ${relativePath}`);
						return existingFile;
					} else {
						new Notice('操作已取消');
						return;
					}
				} else {
					// 如果是文件夹，提示错误
					new Notice(`路径 "${relativePath}" 是一个文件夹`);
					return;
				}
			}

			const newFile = await vault.create(relativePath, content);
			const leaf = this.app.workspace.getLeaf(true);
			await leaf.openFile(newFile);

			console.log(`文件创建成功: ${newFile.path}`);
			new Notice(`文件创建成功: ${relativePath}`);
			return newFile;
		} catch (error) {
			console.error(`创建文件失败: ${error.message}`);
			new Notice(`创建文件失败: ${error.message}`);
			throw error;
		}
	}

	onunload() {
		// 断开 WebSocket 连接
		if (this.websocketManager) {
			this.websocketManager.disconnect();
		}

		// 在 onunload() 方法中添加
		this.app.workspace.detachLeavesOfType(MyPlugin.VIEW_TYPE_CHAT);

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async fetchAIResponse(prompt: string, onChunk: (chunk: string) => void, chatId: string): Promise<void> {

		const url = `${this.settings.apiUrl}/ai/love_app/chat/sse?message=${encodeURIComponent(prompt)}&chatId=${chatId}`;

		return new Promise((resolve, reject) => {
			const eventSource = new EventSource(url);

			// 处理接收到的消息
			eventSource.onmessage = (event) => {
				let t = event.data;
				// 处理各种结束标志
				if (t === 'end' || t === '[DONE]' || t === 'END' || (t === '' || t == null)) {
					console.log("SSE连接完成");
					eventSource.close();
					resolve();
					return;
				}
				// 实时更新编辑器中的内容
				onChunk(t);
			};

			// 处理错误
			eventSource.onerror = (error) => {
				console.error('SSE连接错误详情:', {
					url: eventSource.url,
					readyState: eventSource.readyState,
					error: error
				});
				console.error("是否完成", eventSource.readyState);
				if (eventSource.readyState === EventSource.CLOSED) {
					resolve();
				}
				else {
					eventSource.close();
					reject(error);
				}

			};

		});
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'AI Plugin Settings'});

		new Setting(containerEl)
			.setName('API URL')
			.setDesc('The base URL for the AI API')
			.addText(text => text
				.setPlaceholder('Enter API URL')
				.setValue(this.plugin.settings.apiUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
