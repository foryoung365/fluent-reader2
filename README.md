<p align="center">
  <img width="120" height="120" src="/build/icon.png">
</p>
<h3 align="center">Fluent Reader 2</h3>
<p align="center">A modern desktop RSS reader with AI power</p>
<p align="center">
  <img src="https://img.shields.io/github/v/release/foryoung365/fluent-reader?label=version" />
  <img src="https://img.shields.io/github/stars/foryoung365/fluent-reader" />
  <img src="https://img.shields.io/github/license/foryoung365/fluent-reader" />
</p>
<hr />

**Fluent Reader 2** is an actively maintained fork of the original [Fluent Reader](https://github.com/yang991178/fluent-reader). As the original project is no longer maintained, this version focuses on adding modern features like AI integration and keeping dependencies up to date.

## Download

You can get the latest version of Fluent Reader 2 from the [GitHub releases](https://github.com/foryoung365/fluent-reader/releases).

## New in Version 2.0

### 🤖 AI Smart Summary
Integrate with Large Language Models (LLMs) to understand your feeds faster:
- **Multiple Providers**: Supports OpenAI, Google Gemini, and custom OpenAI-compatible APIs.
- **Auto-Generation**: Automatically generate summaries for articles longer than 500 characters.
- **Markdown Support**: Rich-text rendering for AI summaries including lists, bold text, and code blocks.
- **Configurable**: Choose your favorite models (e.g., GPT-4o, Gemini 1.5 Pro) and custom API endpoints.
- **Test Tool**: Built-in connection tester for easy configuration.

## Key Features

<p align="center">
  <img src="https://github.com/yang991178/fluent-reader/raw/master/docs/imgs/screenshot.jpg">
</p>

- **Modern UI**: Inspired by Fluent Design System with full dark mode support.
- **Service Sync**: Sync with RSS Services including Inoreader, Feedbin, The Old Reader, BazQux Reader, and self-hosted Fever or Google Reader API.
- **Privacy First**: Data is stored locally or synced with your trusted services. Replaced legacy database for better reliability.
- **Full Content**: Read with the built-in article view or load webpages by default.
- **Powerful Rules**: Hide, mark as read, or star articles automatically with regex rules.
- **OPML Support**: Easy import/export of your subscriptions.
- **Keyboard Shortcuts**: Efficient navigation with single-key shortcuts.

## Development

### Build from source

```bash
# Install dependencies
npm install

# Compile source code
npm run build

# Start the application
npm run electron

# Package the app for Windows
npx electron-builder --win nsis
```

### Developed with

- [Electron](https://github.com/electron/electron) (v39+)
- [React](https://github.com/facebook/react) & [Redux](https://github.com/reduxjs/redux)
- [Fluent UI](https://github.com/microsoft/fluentui)
- [OpenAI SDK](https://github.com/openai/openai-node)
- [@seald-io/nedb](https://github.com/seald-io/nedb)
- [Lovefield](https://github.com/google/lovefield)

## License

BSD-3-Clause
