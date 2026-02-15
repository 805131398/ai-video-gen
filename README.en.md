# AI Video Generator (AI 视频生成器)

A powerful AI video generation platform supporting both Web and Desktop environments.

[中文版 (Chinese Version)](./README.md)

## Project Structure

This monorepo contains two main applications:

- **`web/`**: A Next.js based web application.
- **`client/`**: An Electron + Vite + React based desktop application for Windows, macOS, and Linux.

## Features

- **AI Video Generation**: Generate videos from scripts and scenes.
- **Cross-Platform**: Run on the web or as a native desktop app.
- **Local Storage**: Desktop app supports local file storage and SQLite database.
- **Cloud Integration**: Web app supports AWS S3 / Ali OSS for storage.
- **Privacy First**: Desktop app operates completely offline (dependencies permitting).

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- pnpm (Package manager)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ai-video-gen
   ```

2. Install dependencies:
   ```bash
   # Install Web dependencies
   cd web
   pnpm install
   
   # Setup database
   pnpm db:generate

   # Install Client dependencies
   cd ../client
   pnpm install
   ```

## Development

### Web Application

Navigate to the `web` directory and run:

```bash
cd web
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Desktop Application

Navigate to the `client` directory and run:

```bash
cd client
pnpm dev         # Run Vite dev server
pnpm electron:dev # Run Electron with Vite dev server
```

## Building

### Web Application

To build the Next.js application for production:

```bash
cd web
pnpm build
```

### Desktop Application

Build for your current platform:

```bash
cd client
pnpm electron:build
```

Or build for specific platforms:

```bash
pnpm electron:build:win   # Windows
pnpm electron:build:mac   # macOS
pnpm electron:build:linux # Linux
```

## Documentation

For more detailed documentation, please check the [docs](./docs) directory:

- [Electron Desktop App Guide](./docs/electron-desktop-app.md)
- [Local Desktop App Guide](./docs/local-desktop-app.md)

## License

MIT
