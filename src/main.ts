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

	// view type
	static readonly VIEW_TYPE_AI_CHAT = AIChatView.getViewType();

	// 在 AIToolPlugin 类中添加 WebSocketManager 的 getter
	private _websocketManager: WebSocketManager | null = null;

	// 状态栏元素引用
	private statusBarItem: HTMLElement | null = null;

	//  chatId 心跳
	private heartbeatInterval: number | null = null;

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

		// 注册 chatId
		await this.registerChatId();

		// 替换原有的 ribbon icon 代码
		const ribbonIconEl = this.addRibbonIcon('dice', 'AI Chat', async (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			await this.activateView();
		});

		// 初始化状态栏项
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText('AI: idle');
		this.statusBarItem.addClass('ai-status-bar');

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
	}

	// 添加注册 chatId 的方法
	private async registerChatId(): Promise<void> {
		try {
			const response = await fetch(`${this.API_URL}/chatId/register?chatId=${this.chatId}`, {
				method: 'POST'
			});

			const data = await response.json();

			if (data.success) {
				new Notice('AI 插件已启动');
				// 开始心跳
				this.startHeartbeat();
			} else {
				console.error('ChatId 注册失败, 服务器繁忙，请稍后再试:', data.message);
			}
		} catch (error) {
			console.error('注册请求失败:', error);
		}
	}

	// 添加心跳机制
	private startHeartbeat(): void {
		// 清除现有的定时器（如果有）
		if (this.heartbeatInterval) {
			window.clearInterval(this.heartbeatInterval);
		}

		// 设置新的心跳定时器（每10分钟）
		this.heartbeatInterval = window.setInterval(async () => {
			try {
				const response = await fetch(`${this.API_URL}/chatid/heartbeat?chatId=${this.chatId}`, {
					method: 'POST'
				});

				const data = await response.json();

				if (!data.success) {
					console.error('心跳失败，需要重新注册');
					// 可以在这里添加重新注册逻辑
				}
			} catch (error) {
				console.error('心跳请求失败:', error);
			}
		}, 10 * 60 * 1000); // 每10分钟发送一次心跳
	}

	// 在 AIToolPlugin 类中添加激活视图的方法
	private async activateView() {
		const leaves = this.app.workspace.getLeavesOfType(AIToolPlugin.VIEW_TYPE_AI_CHAT);

		if (leaves.length > 0) {
			// 如果视图已经存在，检查是否可见
			const leaf = leaves[0];
			const parentElement = leaf.view.containerEl.parentElement;
			if (parentElement) {
				const computedStyle = window.getComputedStyle(parentElement);
				if (computedStyle.display === 'none') {
					// 如果隐藏则显示
					await this.app.workspace.revealLeaf(leaf);
				} else {
					// 如果显示则隐藏
					leaf.detach();
				}
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

		// 清理心跳定时器
		if (this.heartbeatInterval) {
			window.clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// 添加更新状态栏状态的方法
	public updateAIStatus(status: 'idle' | 'generating') {
		if (this.statusBarItem) {
			if (status === 'generating') {
				this.statusBarItem.setText('AI: generating...');
			} else {
				this.statusBarItem.setText('AI: idle');
			}
		}
	}


	async fetchAIResponse(prompt: string, onChunk: (chunk: string) => void, chatId: string): Promise<void> {
		// 设置状态为生成中
		this.updateAIStatus('generating');

		const url = `${this.API_URL}/ai/chat/sse?message=${encodeURIComponent(prompt)}&chatId=${chatId}`;

		return new Promise((resolve, reject) => {
			const eventSource = new EventSource(url);

			// 处理接收到的消息
			eventSource.onmessage = (event) => {
				let t = event.data;
				// 处理各种结束标志
				if (t === 'end') {
					eventSource.close();

					// 设置状态为空闲
					this.updateAIStatus('idle');

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
				// 设置状态为空闲（错误状态也视为结束）
				this.updateAIStatus('idle');
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
