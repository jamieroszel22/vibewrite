# Vibe Write

A minimalist, distraction-free writing app with a focus on simplicity and productivity.

## Features

- **Clean, Minimalist Interface**: Focus on your writing without distractions
- **Real-time Markdown Preview**: See your formatted text as you write
- **LLM-Powered Copy Editor**: Get intelligent suggestions for improving your writing
  - Grammar and style improvements
  - Conciseness and clarity enhancements
  - Inline diff view of suggested changes
  - One-click application of improvements
- **Local First**: Your writing stays on your computer
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Ollama (for LLM features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vibe-write.git
   cd vibe-write
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start Ollama (required for LLM features):
   ```bash
   ollama run gemma3:4b
   ```

4. Start the application:
   ```bash
   npm start
   ```

## Development

### Project Structure

```
vibe-write/
├── src/
│   ├── main.js           # Main process
│   ├── preload.js        # Preload script
│   ├── index.html        # Main window HTML
│   └── script.js         # Renderer process
├── package.json
└── README.md
```

### Building

To build the application for your platform:

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with Electron
- LLM features powered by Ollama and Gemma 3 4B
- Markdown parsing by marked 