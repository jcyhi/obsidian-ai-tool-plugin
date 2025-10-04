import { Notice, Plugin } from 'obsidian';
import MyPlugin from "./main";

interface Message {
	type: string;
	[key: string]: any; // 允许其他属性
}

interface FunctionCallMessage {
	type: 'function_call';
	function: string;
	params: {
		fileName?: string;
		content?: string;
		message?: string;
		[key: string]: any;
	};
}

interface ContentMessage {
	type: 'content';
	data: string;
}

interface EndMessage {
	type: 'end';
}

export class WebSocketManager {
	private plugin: MyPlugin;
	private websocket: WebSocket | null = null;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private chatId: string = '';
	private shouldReconnect: boolean = true; // 添加这个标志

	constructor(plugin: MyPlugin) {
		this.plugin = plugin;
		this.websocket = null;
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 5;
		this.chatId = plugin.getChatId();
	}

	// 连接到 WebSocket 服务器
	connect() {
		const wsUrl = `${this.plugin.settings.apiUrl.replace('http', 'ws')}/websocket/chat?chatId=${encodeURIComponent(this.chatId)}`;

		// 建立新连接时启用重连
		this.shouldReconnect = true;

		try {
			this.websocket = new WebSocket(wsUrl);

			this.websocket.onopen = (event: Event) => {
				console.log('WebSocket connected:', event);
				this.reconnectAttempts = 0;
			};

			this.websocket.onmessage = (event: MessageEvent) => {
				this.handleMessage(event.data);
			};

			this.websocket.onclose = (event: CloseEvent) => {
				console.log('WebSocket closed:', event);
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
		 	console.log('Received message:', message);
			if (message.functionName === 'createFile') {
				this.createFile(message.filePath, message.fileContent);
			}
		// 	switch (message.type) {
		// 		case 'content':
		// 			// 处理内容消息（AI 流式响应的一部分）
		// 			this.handleContentMessage((message as ContentMessage).data);
		// 			break;
		//
		// 		case 'end':
		// 			// 处理流结束消息
		// 			this.handleEndMessage();
		// 			break;
		//
		// 		case 'function_call':
		// 			// 处理函数调用消息
		// 			this.handleFunctionCall(
		// 				(message as FunctionCallMessage).function,
		// 				(message as FunctionCallMessage).params
		// 			);
		// 			break;
		//
		// 		default:
		// 			console.log('Unknown message type:', message.type);
		// 	}
		} catch (e) {
			// 处理纯文本消息
			console.log('Received text message:', data);
		}
	}

	// 处理内容消息
	handleContentMessage(content: string) {
		console.log('Received content:', content);
		// 这里可以更新 UI 或处理流式响应内容
	}

	// 处理结束消息
	handleEndMessage() {
		console.log('Stream ended');
		// 这里可以更新 UI 状态，例如隐藏加载指示器
	}

	// 处理函数调用消息
	async handleFunctionCall(functionName: string, params: {[key: string]: any}) {
		console.log('Function call requested:', functionName, params);

		try {
			switch (functionName) {
				case 'createFile':
					if (params.fileName && params.content !== undefined) {
						await this.createFile(params.fileName, params.content);
					}
					break;

				case 'showNotification':
					if (params.message) {
						this.showNotification(params.message);
					}
					break;

				default:
					console.warn('Unknown function:', functionName);
			}
		} catch (error) {
			console.error('Error executing function:', functionName, error);
		}
	}

	// // 创建文件函数（与您已有的函数类似）
	// async createFile(relativePath: string, content: string) {
	// 	const { vault } = this.plugin.app;
	//
	// 	try {
	// 		// 检查文件是否已存在
	// 		const existingFile = vault.getAbstractFileByPath(relativePath);
	// 		if (existingFile) {
	// 			console.warn(`File already exists: ${relativePath}`);
	// 			// 可以选择更新现有文件或提示用户
	// 			return;
	// 		}
	//
	// 		// 创建新文件
	// 		const newFile = await vault.create(relativePath, content);
	//
	// 		// 可选：在新标签页中打开文件
	// 		const leaf = this.plugin.app.workspace.getLeaf(true);
	// 		await leaf.openFile(newFile);
	//
	// 		console.log(`File created successfully: ${newFile.path}`);
	// 		this.showNotification(`文件已创建: ${relativePath}`);
	//
	// 		return newFile;
	// 	} catch (error: any) {
	// 		console.error(`Failed to create file: ${error.message}`);
	// 		this.showNotification(`创建文件失败: ${error.message}`);
	// 		throw error;
	// 	}
	// }

	// 修改 WebSocketManager.ts 中的 createFile 方法
	async createFile(relativePath: string, content: string) {
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

			// 检查文件是否已存在
			const existingFile = vault.getAbstractFileByPath(finalPath);
			if (existingFile) {
				console.warn(`File already exists: ${finalPath}`);
				// 可以选择更新现有文件或提示用户
				return;
			}

			// 创建新文件
			const newFile = await vault.create(finalPath, content);

			// 可选：在新标签页中打开文件
			const leaf = this.plugin.app.workspace.getLeaf(true);
			await leaf.openFile(newFile);

			console.log(`File created successfully: ${newFile.path}`);
			this.showNotification(`文件已创建: ${finalPath}`);

			return newFile;
		} catch (error: any) {
			console.error(`Failed to create file: ${error.message}`);
			this.showNotification(`创建文件失败: ${error.message}`);
			throw error;
		}
	}

	// 显示通知
	showNotification(message: string) {
		new Notice(message);
	}

	// 发送消息到服务器
	sendMessage(message: string) {
		if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
			this.websocket.send(message);
		} else {
			console.warn('WebSocket is not connected');
		}
	}

	// 处理重连
	handleReconnect() {

		// 检查是否应该重连
		if (!this.shouldReconnect) {
			console.log('WebSocket disconnected permanently');
			//this.showNotification('WebSocket 连接已断开');
			return;
		}

		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

			// 等待一段时间后重连
			setTimeout(() => {
				this.connect();
			}, 1000 * this.reconnectAttempts); // 逐渐增加重连间隔
		} else {
			console.error('Max reconnect attempts reached');
			this.showNotification('WebSocket 连接失败，请检查网络设置');
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
}
