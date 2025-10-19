import { Notice } from 'obsidian';
import AIToolPlugin from "./main";

interface Message {
	type: string;
	[key: string]: any; // 允许其他属性
}

export class WebSocketManager {
	private plugin: AIToolPlugin;
	private websocket: WebSocket | null = null;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 2;
	private chatId: string = '';
	private shouldReconnect: boolean = true; // 添加这个标志

	// 在 WebSocketManager 类中添加属性
	private onConnectionStatusChange: ((isConnected: boolean) => void) | null = null;

	constructor(plugin: AIToolPlugin) {
		this.plugin = plugin;
		this.websocket = null;
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 5;
		this.chatId = plugin.getChatId();
	}

	// 连接到 WebSocket 服务器
	connect() {
		const wsUrl = `${this.plugin.API_URL.replace('https', 'wss')}/ws/chat?chatId=${encodeURIComponent(this.chatId)}`;

		// 建立新连接时启用重连
		this.shouldReconnect = true;
		try {
			this.websocket = new WebSocket(wsUrl);

			this.websocket.onopen = (event: Event) => {
				this.reconnectAttempts = 0;
				// 通知连接状态变更
				if (this.onConnectionStatusChange) {
					this.onConnectionStatusChange(true);
				}
			};

			this.websocket.onmessage = (event: MessageEvent) => {
				this.handleMessage(event.data);
			};

			this.websocket.onclose = (event: CloseEvent) => {
				this.handleReconnect();
			};

			this.websocket.onerror = (error: Event) => {
				console.error('WebSocket error:', error);
			};
		} catch (error) {
			console.error('Failed to establish WebSocket connection:', error);
		}
	}

	// 处理来自服务器的消息
	handleMessage(data: string) {
		 try {
		 	const message: Message = JSON.parse(data);
			 //打印message
			if (message.functionName === 'createFile') {
				this.createFile(message.fileName, message.fileContent, message.requestId);
			}
		} catch (e) {
			// 处理纯文本消息
			 this.showNotification('Received text message:' + data);
		}
	}

	// 修改 WebSocketManager.ts 中的 createFile 方法
	async createFile(relativePath: string, content: string,  requestId?: string) {
		// 检查是否启用文件生成功能
		if (!this.plugin.settings.enableFileGeneration) {
			this.showNotification('文件生成功能已禁用');
			// 发送失败消息给后端
			await this.sendFunctionCallResult({
				functionName: 'createFile',
				fileName: relativePath,
				success: false,
				requestId: requestId || ''
			});
			return;
		}

		const { vault } = this.plugin.app;

		try {
			// 修改文件路径，将文件保存到 AI生成文档 文件夹下
			let finalPath = relativePath;
			if (!relativePath.startsWith('AI生成文档/')) {
				finalPath = `AI生成文档/${relativePath}`;
			}

			// 检查文件夹是否存在
			const folderPath = 'AI生成文档';
			const folder = vault.getAbstractFileByPath(folderPath);
			if (!folder) {
				await vault.createFolder(folderPath);
			}

			// 处理重复文件名
			let counter = 1;
			let existingFile = vault.getAbstractFileByPath(finalPath);

			// 如果文件已存在，则添加数字后缀
			while (existingFile) {
				const lastDotIndex = finalPath.lastIndexOf('.');
				if (lastDotIndex > 0 && lastDotIndex > finalPath.lastIndexOf('/')) {
					// 有文件扩展名的情况
					const nameWithoutExt = finalPath.substring(0, lastDotIndex);
					const ext = finalPath.substring(lastDotIndex);

					// 检查是否已有数字后缀
					const lastUnderscoreIndex = nameWithoutExt.lastIndexOf('_');
					if (lastUnderscoreIndex > 0) {
						const suffix = nameWithoutExt.substring(lastUnderscoreIndex + 1);
						if (/^\d+$/.test(suffix)) {
							// 已有数字后缀，递增
							const baseName = nameWithoutExt.substring(0, lastUnderscoreIndex);
							finalPath = `${baseName}_${counter}${ext}`;
						} else {
							// 没有数字后缀，添加
							finalPath = `${nameWithoutExt}_${counter}${ext}`;
						}
					} else {
						// 没有下划线，直接添加
						finalPath = `${nameWithoutExt}_${counter}${ext}`;
					}
				}
				// 检查新文件名是否也存在
				existingFile = vault.getAbstractFileByPath(finalPath);
				counter++;
			}

			// 创建新文件
			const newFile = await vault.create(finalPath, content);

			// 可选：在新标签页中打开文件
			const leaf = this.plugin.app.workspace.getLeaf(true);
			await leaf.openFile(newFile);

			console.log(`File created successfully: ${newFile.path}`);
			this.showNotification(`文件已创建: ${finalPath}`);
			console.log("文件创建成功？");
			// 发送成功消息给后端
			await this.sendFunctionCallResult({
				functionName: 'createFile',
				fileName: finalPath,
				success: true,
				requestId: requestId || ''
			});

			return newFile;
		} catch (error: any) {
			console.error(`Failed to create file: ${error.message}`);
			this.showNotification(`创建文件失败: ${error.message}`);

			// 发送失败消息给后端
			await this.sendFunctionCallResult({
				functionName: 'createFile',
				fileName: relativePath,
				success: false,
				requestId: requestId || ''
			});

			throw error;
		}
	}

	// 添加发送函数调用结果的方法
	async sendFunctionCallResult(result: {
		functionName: string;
		fileName: string;
		success: boolean;
		requestId: string;
	}) {
		if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
			this.websocket.send(JSON.stringify({
				type: 'function_call_result',
				...result
			}));
		}
	}

	// 显示通知
	showNotification(message: string) {
		new Notice(message);
	}

	// 添加设置回调的方法
	setConnectionStatusCallback(callback: (isConnected: boolean) => void) {
		this.onConnectionStatusChange = callback;
	}


	// 处理重连
	handleReconnect() {
		// 检查是否应该重连
		if (!this.shouldReconnect) {
			console.log('WebSocket disconnected permanently');
			// 通知连接状态变更
			if (this.onConnectionStatusChange) {
				this.onConnectionStatusChange(false);
			}
			return;
		}

		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			// console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

			// 等待一段时间后重连
			setTimeout(() => {
				this.connect();
			}, 1000 * this.reconnectAttempts); // 逐渐增加重连间隔
		} else {
			console.error('Max reconnect attempts reached');
			this.showNotification('WebSocket 连接失败，请检查网络设置');
			// 通知连接状态变更
			if (this.onConnectionStatusChange) {
				this.onConnectionStatusChange(false);
			}
		}
	}

	// 关闭连接
	disconnect() {
		// 主动断开连接时，重置重连标志
		this.shouldReconnect = false;
		this.reconnectAttempts = 0;

		if (this.websocket) {
			this.websocket.close();
			this.websocket = null;
		}
	}

	isConnected(): boolean {
		return this.websocket !== null && this.websocket.readyState === WebSocket.OPEN;
	}
}
