// 在 main.ts 顶部导入 ItemView 和 WorkspaceLeaf
import { App, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { WebSocketManager } from './websocketManager';
import { AIChatView } from './AIChatView';

// Remember to rename these classes and interfaces!

interface AIToolPluginSettings {
	mySetting: string;
	autoSaveConversation: boolean;  // 控制是否自动保存对话记录
	enableFileGeneration: boolean;   // 控制是否启用文件生成功能
}

const DEFAULT_SETTINGS: AIToolPluginSettings = {
	mySetting: 'default',
	autoSaveConversation: true,      // 默认启用自动保存对话
	enableFileGeneration: true       // 默认启用文件生成
}

export default class AIToolPlugin extends Plugin {
	settings: AIToolPluginSettings;
	private chatId: string; // 添加 chatId 属性
	public readonly API_URL = 'https://ob-plugin.jcybe.com/api';
	// 在 AIToolPlugin 类中添加常量
	static readonly VIEW_TYPE_AI_CHAT = AIChatView.getViewType();

	// 在 AIToolPlugin 类中添加 WebSocketManager 的 getter
	private _websocketManager: WebSocketManager | null = null;

	public get websocketManager(): WebSocketManager | null {
		if (!this._websocketManager) {
			this._websocketManager = new WebSocketManager(this);
		}
		return this._websocketManager;
	}

	// 生成唯一的 chatId
	private generateChatId(): string {
		return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	}

	public getChatId(): string {
		return this.chatId;
	}

	async onload() {
		await this.loadSettings();

		this.registerView(
			AIToolPlugin.VIEW_TYPE_AI_CHAT,
			(leaf: WorkspaceLeaf) => new AIChatView(leaf, this)
		);

		// 在启动服务器之前生成 chatId
		this.chatId = this.generateChatId();
		console.log(`Generated chatId: ${this.chatId}`);

		// 替换原有的 ribbon icon 代码
		const ribbonIconEl = this.addRibbonIcon('dice', 'AI Chat', async (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			await this.activateView();
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// 添加打开视图的命令
		this.addCommand({
			id: 'open-ai-chat',
			name: '打开AI对话',
			callback: () => {
				this.activateView();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new AIToolPluginSettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	// 在 AIToolPlugin 类中添加激活视图的方法
	private async activateView() {
		const leaves = this.app.workspace.getLeavesOfType(AIToolPlugin.VIEW_TYPE_AI_CHAT);

		if (leaves.length > 0) {
			// 如果视图已经存在，检查是否可见
			const leaf = leaves[0];
			if (leaf.view.containerEl.parentElement?.style.display === 'none') {
				// 如果隐藏则显示
				await this.app.workspace.revealLeaf(leaf);
			} else {
				// 如果显示则隐藏
				leaf.detach();
			}
		} else {
			// 如果视图不存在，则创建新视图
			const rightLeaf = this.app.workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: AIToolPlugin.VIEW_TYPE_AI_CHAT,
					active: true,
				});

				const newLeaves = this.app.workspace.getLeavesOfType(AIToolPlugin.VIEW_TYPE_AI_CHAT);
				if (newLeaves.length > 0) {
					await this.app.workspace.revealLeaf(newLeaves[0]);
				}
			}
		}
	}

	onunload() {
		// 断开 WebSocket 连接
		if (this.websocketManager) {
			this.websocketManager.disconnect();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async fetchAIResponse(prompt: string, onChunk: (chunk: string) => void, chatId: string): Promise<void> {

		const url = `${this.API_URL}/ai/chat/sse?message=${encodeURIComponent(prompt)}&chatId=${chatId}`;

		return new Promise((resolve, reject) => {
			const eventSource = new EventSource(url);

			// 处理接收到的消息
			eventSource.onmessage = (event) => {
				let t = event.data;
				// 处理各种结束标志
				if (t === 'end') {
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
				new Notice("AI 错误，请检查控制台");
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

class AIToolPluginSettingTab extends PluginSettingTab {
	plugin: AIToolPlugin;

	constructor(app: App, plugin: AIToolPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// 添加自动保存对话设置
		new Setting(containerEl)
			.setName('自动保存对话记录')
			.setDesc('是否自动将AI对话记录保存到文档中')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoSaveConversation)
				.onChange(async (value) => {
					this.plugin.settings.autoSaveConversation = value;
					await this.plugin.saveSettings();
				}));

		// 添加文件生成功能设置
		new Setting(containerEl)
			.setName('启用文件生成功能')
			.setDesc('是否允许AI生成并创建新文件')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFileGeneration)
				.onChange(async (value) => {
					this.plugin.settings.enableFileGeneration = value;
					await this.plugin.saveSettings();
				}));
	}
}
