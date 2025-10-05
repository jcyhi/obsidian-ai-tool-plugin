# 介绍
## 功能： 
1. 在 Obsidian 中提供免费的 AI 对话服务，向 通义千问的 AI 大模型提问。
2. 通过聊天能够让 AI 通过工具调用，自动帮你创建 文本文件，需要点击连接websocket实现此功能。

## 目的
可以通过跟 AI 聊天，让 AI 自动创建文件，更加轻松的学习 Obsidian 基础用法。

## 特别注意
1. 只能在桌面端 Obsidian 使用。
2. 请勿发送敏感信息，例如密码之类的。会将 对话内容 存储到 云服务器的内存中，以支持 AI 对话记忆功能。
3. 需要网络, 通过 HTTP 连接云服务器，获取 AI 生成内容，
4. 会通过 WebSocket 连接到您电脑，以支持 AI 调用工具，只能调用在 Obsidian 的 创建文件功能。

# 快速开始
## 下载
1. 从 https://github.com/jcyhi/obsidian-ai-tool-plugin 下载
2. 放到 obsidian 库的 xxxx/{your valut name}/.obsidian/plugins/ 文件夹下
3. 在 obsidian 中，点击插件管理，启动插件。
## 使用
限制 10 次对话次数，重新启动插件可刷新次数。

### 示例：
1. 需要良好的网络，点击连接websocket, 启动 AI 调用工具的能力。
2. 输入：请帮我创建2个文件，向我展示 Obsidian 双向链接 基础用法。

# Introduction
## Features:
1. Provide free AI chat service in Obsidian, allowing you to ask questions to the Tongyi Qianwen AI model.
2. Enable AI to automatically create text files through tool calls via chat. This function requires clicking to connect to WebSocket.
## Purpose
You can chat with AI to let it automatically create files, making it easier to learn the basic usage of Obsidian.

## Special Notes
1. This plugin can only be used on the desktop version of Obsidian.
2. Do not send sensitive information (e.g., passwords). Conversation content will be stored in the cloud server’s memory to support the AI conversation memory feature.
3. An internet connection is required. The plugin obtains AI-generated content by connecting to the cloud server via HTTP.
4. It will connect to your computer via WebSocket to support AI tool calls. Only the file creation function within Obsidian can be invoked.

# Quick Start
## Download
1. Download from https://github.com/jcyhi/obsidian-ai-tool-plugin
2. Place the downloaded files into the folder: xxxx/{your vault name}/.obsidian/plugins/ of your Obsidian vault
3. In Obsidian, go to Plugin Management and enable the plugin.
## Usage
The number of conversations is limited to 10. Restarting the plugin will reset the count.
### Example:
1. A stable network connection is required. Click to connect to WebSocket to activate AI's tool-calling capability.
2. Input: Please help me create 2 files to demonstrate the basic usage of Obsidian bidirectional links.
