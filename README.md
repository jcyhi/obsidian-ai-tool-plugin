# 介绍
## 功能： 
1. 在 Obsidian 中提供免费的 AI 对话服务，向 通义千问的 AI 大模型提问。
2. 通过聊天能够让 AI 通过工具调用，自动帮你创建 文本文件，需要点击连接websocket实现此功能。

### 在线演示地址
https://ob.jcybe.com

## 目的
可以通过跟 AI 聊天，让 AI 自动创建文件，更加轻松的学习 Obsidian 基础用法。

## 特别注意
1. 只能在桌面端 Obsidian 使用。
2. 请勿发送敏感信息，例如密码之类的。会将 对话内容 存储到 云服务器的内存中，以支持 AI 对话记忆功能。
3. 需要网络, 通过 HTTP 连接云服务器，获取 AI 生成内容，
4. 会通过 WebSocket 连接到您电脑，以支持 AI 调用工具，只能调用在 Obsidian 的 创建文件功能。

# 快速开始
## 下载
### BRAT 插件安装
1. 在社区插件市场安装并启用 BRAT 。
2. 打开命令面板（Ctrl/Cmd + P ），或点击左侧图标,运行命令 BRAT: Add a beta plugin for testing 
3. 在弹出的输入框中，粘贴 https://github.com/jcyhi/obsidian-ai-tool-plugin
4. 等待安装完成后，在设置中启用本插件 (ai-tool-gen-text ) 即可
### 手动安装：
1. 点击链接： https://github.com/jcyhi/obsidian-ai-tool-plugin/releases
2. 下载最新版本的如下文件 main.ts、styles.css、manifest.json
3. 在笔记仓库里的 .obsidian/plugins 新建一个 ai-tool 文件夹
4. 把文件移动到文件夹里
5. 重启 obsidian, 在设置中启用插件ai-tool-gen-text

## 使用
插件tokens所有用户共享，每日可用10000tokens,每天凌晨1点更新.

### 示例：
1. 需要良好的网络，点击连接websocket, 启动 AI 调用工具的能力。
2. 输入：请帮我创建2个文件，向我展示 Obsidian 双向链接 基础用法。

# Introduction
## Features:
1. Provide free AI chat service in Obsidian, allowing you to ask questions to the Tongyi Qianwen AI model.
2. Enable AI to automatically create text files through tool calls via chat. This function requires clicking to connect to WebSocket.
### Online Demo URL
https://ob.jcybe.com
## Purpose
You can chat with AI to let it automatically create files, making it easier to learn the basic usage of Obsidian.

## Special Notes
1. This plugin can only be used on the desktop version of Obsidian.
2. Do not send sensitive information (e.g., passwords). Conversation content will be stored in the cloud server’s memory to support the AI conversation memory feature.
3. An internet connection is required. The plugin obtains AI-generated content by connecting to the cloud server via HTTP.
4. It will connect to your computer via WebSocket to support AI tool calls. Only the file creation function within Obsidian can be invoked.

# Quick Start
## Download
### Installation via BRAT plugin:
1. Install and enable the BRAT plugin from the community plugin marketplace.
2. Open the command palette (Ctrl/Cmd + P) or click the icon on the left, then run the command "BRAT: Add a beta plugin for testing".
3. In the pop-up input box, paste "https://github.com/jcyhi/obsidian-ai-tool-plugin".
4. After the installation is complete, enable the plugin ("ai-tool-gen-text") in the settings.
### Manual Installation:
1. Click the link: https://github.com/jcyhi/obsidian-ai-tool-plugin/releases.
2. Download the latest versions of the following files: main.ts, styles.css, manifest.json.
3. Create a new folder named "ai-tool" in the ".obsidian/plugins" directory of your note repository.
4. Move the downloaded files into this folder.
5. Restart Obsidian and enable the "ai-tool-gen-text" plugin in the settings.
## Usage
The plugin's tokens are shared among all users. There are 10,000 tokens available daily, and the token quota resets at 1:00 AM (UTC+8) every day.
### Example:
1. A stable network connection is required. Click to connect to WebSocket to activate AI's tool-calling capability.
2. Input: Please help me create 2 files to demonstrate the basic usage of Obsidian bidirectional links.
