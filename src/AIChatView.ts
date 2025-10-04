import { ItemView, WorkspaceLeaf, TFile, Notice } from 'obsidian';
import MyPlugin from "./main";

// 在文件中添加AI对话视图类
export class AIChatView extends ItemView {
	private chatContainer: HTMLElement;
	private inputElement: HTMLTextAreaElement;
	private sendButton: HTMLButtonElement;
	private conversation: Array<{role: string, content: string}> = [];
	// 在 AIChatView 类中添加新属性
	private connectionStatus: HTMLElement;
	private connectButton: HTMLButtonElement;

	// 在类中添加定时器属性
	private disconnectTimer: number | null = null;
	private readonly DISCONNECT_TIMEOUT = 60 * 1000; // 5分钟

	constructor(leaf: WorkspaceLeaf, private plugin: MyPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return "ai-chat-view";
	}

	getDisplayText(): string {
		return "AI 对话";
	}

	getIcon(): string {
		return "message-circle";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		// 创建聊天界面
		this.chatContainer = container.createEl("div", { cls: "ai-chat-container" });

		// 创建消息显示区域
		const messagesContainer = this.chatContainer.createEl("div", { cls: "ai-messages" });

		// 创建输入区域
		const inputContainer = this.chatContainer.createEl("div", { cls: "ai-input-container" });

		this.inputElement = inputContainer.createEl("textarea", {
			cls: "ai-input",
			attr: {
				placeholder: "输入消息..."
			}
		});

		this.sendButton = inputContainer.createEl("button", {
			cls: "ai-send-button",
			text: "发送"
		});

		// 添加事件监听器
		this.sendButton.addEventListener("click", () => this.sendMessage());
		this.inputElement.addEventListener("keydown", (event) => {
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault();
				this.sendMessage();
			}
		});

		// 添加连接状态区域
		const connectionContainer = container.createEl("div", { cls: "connection-status" });
		this.connectionStatus = connectionContainer.createEl("span", {
			text: "WebSocket 未连接",
			cls: "status-text"
		});
		this.connectButton = connectionContainer.createEl("button", {
			text: "连接 WebSocket",
			cls: "connect-button"
		});

		this.connectButton.addEventListener("click", () => this.toggleConnection());


		// 添加一些默认样式
		//this.addStyles();
	}

	// toggleConnection 方法
	private async toggleConnection() {
		const wsManager = this.plugin.websocketManager;
		if (wsManager) {
			if (this.connectButton.textContent === "连接 WebSocket") {
				try {
					wsManager.connect();
					this.connectionStatus.textContent = "WebSocket 已连接";
					this.connectButton.textContent = "断开连接";
					new Notice("WebSocket 连接成功");
					// 连接成功后启动定时器
					this.resetDisconnectTimer();
				} catch (error) {
					new Notice("WebSocket 连接失败");
				}
			} else {
				wsManager.disconnect();
				this.connectionStatus.textContent = "WebSocket 未连接";
				this.connectButton.textContent = "连接 WebSocket 开启文件功能";
				new Notice("WebSocket 连接已断开");
				// 清除定时器
				if (this.disconnectTimer) {
					clearTimeout(this.disconnectTimer);
					this.disconnectTimer = null;
				}
			}
		}
	}

	// 优化样式布局
	private addStyles() {
		const style = document.createElement("style");
		style.textContent = `
        .ai-chat-container {
            display: flex;
            flex-direction: column;
            height: calc(100% - 40px); /* 为连接状态留出空间 */
            padding: 10px;
        }

        .connection-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 8px;
            border: 1px solid var(--background-modifier-border);
            border-radius: 4px;
            background-color: var(--background-primary);
        }

        .status-text {
            font-size: 0.9em;
            color: var(--text-muted);
            margin-right: 10px; /* 增加右边距 */
        }

        .connect-button {
            padding: 6px 12px;
            font-size: 0.9em;
            white-space: nowrap;
        }

        .ai-messages {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 10px;
            border: 1px solid var(--background-modifier-border);
            border-radius: 4px;
            padding: 10px;
        }

        .ai-message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 5px;
        }

        .ai-message.user {
            background-color: var(--background-primary-alt);
            margin-left: 20%;
        }

        .ai-message.ai {
            background-color: var(--background-secondary);
            margin-right: 20%;
        }

        .ai-message-header {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .ai-input-container {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }

        .ai-input {
            flex: 1;
            min-height: 60px;
            resize: vertical;
        }

        .ai-send-button {
            align-self: flex-end;
            padding: 8px 16px;
            height: fit-content;
        }
    `;
		this.chatContainer.appendChild(style);
	}

	private resetDisconnectTimer() {
		// 清除现有定时器
		if (this.disconnectTimer) {
			clearTimeout(this.disconnectTimer);
		}

		// 设置新的定时器
		this.disconnectTimer = window.setTimeout(() => {
			const wsManager = this.plugin.websocketManager;
			if (wsManager) {
				wsManager.disconnect();
				this.connectionStatus.textContent = "WebSocket 未连接";
				this.connectButton.textContent = "连接 WebSocket";
				new Notice("WebSocket 连接因长时间未使用已自动断开");
			}
		}, this.DISCONNECT_TIMEOUT);
	}


	private async sendMessage() {
		const message = this.inputElement.value.trim();
		if (!message) return;

		// 重置自动断开连接定时器
		this.resetDisconnectTimer();

		// 添加用户消息到界面
		this.addMessageToView("user", message);

		// 清空输入框
		this.inputElement.value = "";

		try {
			// 添加AI消息占位符
			const aiMessageElement = this.addMessageToView("ai", "正在思考...");

			// 调用AI服务
			let aiResponse = "";
			await this.plugin.fetchAIResponse(message, (chunk) => {
				aiResponse += chunk;
				// 更新AI消息显示
				aiMessageElement.querySelector(".ai-message-content")!.textContent = aiResponse;
			}, this.plugin.getChatId());

			// 记录对话
			this.conversation.push({role: "user", content: message});
			this.conversation.push({role: "ai", content: aiResponse});

			// 保存到文件
			await this.saveConversationToFile();

		} catch (error) {
			console.error("AI请求失败:", error);
			const aiMessageElement = this.addMessageToView("ai", "抱歉，请求失败了。请查看控制台了解更多信息。");
		}
	}

	private addMessageToView(role: string, content: string): HTMLElement {
		const messagesContainer = this.chatContainer.querySelector(".ai-messages")!;

		const messageElement = messagesContainer.createEl("div", {
			cls: `ai-message ${role}`
		});

		const headerElement = messageElement.createEl("div", {
			cls: "ai-message-header",
			text: role === "user" ? "你" : "AI助手"
		});

		const contentElement = messageElement.createEl("div", {
			cls: "ai-message-content",
			text: content
		});

		// 滚动到底部
		messagesContainer.scrollTop = messagesContainer.scrollHeight;

		return messageElement;
	}

	// 在 AIChatView 类中修改 saveConversationToFile 方法
	private async saveConversationToFile() {
		try {
			// 获取当前日期作为文件名基础
			const today = new Date();
			const dateString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
			let fileName = `AI对话记录/${dateString}.md`;
			let fileCounter = 1;

			// 准备要添加的内容
			const timestamp = today.toTimeString().split(' ')[0];
			let conversationContent = `# AI对话记录 (${dateString} ${timestamp})\n\n`;

			for (const msg of this.conversation) {
				conversationContent += `## ${msg.role === 'user' ? '用户' : 'AI'}\n\n`;
				conversationContent += `${msg.content}\n\n`;
				conversationContent += "---\n\n";
			}

			// 检查文件夹是否存在
			const folderPath = 'AI对话记录';
			const folder = this.plugin.app.vault.getAbstractFileByPath(folderPath);
			if (!folder) {
				await this.plugin.app.vault.createFolder(folderPath);
			}

			// 检查文件是否存在，如果存在则尝试添加数字后缀
			let existingFile = this.plugin.app.vault.getAbstractFileByPath(fileName);
			while (existingFile && existingFile instanceof TFile) {
				fileCounter++;
				fileName = `AI对话记录/${dateString}_${fileCounter}.md`;
				existingFile = this.plugin.app.vault.getAbstractFileByPath(fileName);
			}

			// 创建新文件
			await this.plugin.app.vault.create(fileName, conversationContent);

			new Notice(`对话已保存到: ${fileName}`);
		} catch (error) {
			console.error('保存对话记录失败:', error);
			new Notice('保存对话记录失败');
		}
	}



	async onClose() {
		// 清理定时器
		if (this.disconnectTimer) {
			clearTimeout(this.disconnectTimer);
			this.disconnectTimer = null;
		}

		// 断开WebSocket连接
		if (this.plugin.websocketManager) {
			this.plugin.websocketManager.disconnect();
		}
	}
}
