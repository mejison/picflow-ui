# 🎨 PicFlow

**Powerful image processing in your browser** - A free, privacy-focused web application for converting, compressing, resizing, cropping images and removing backgrounds. All processing happens locally in your browser, ensuring your images never leave your device.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.5.24-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## ✨ Features

### 🗜️ Compress
- **User-friendly quality control** with 5 levels: Best Quality to Maximum Compression
- **Smart compression** that maintains visual quality while reducing file size
- **Real-time preview** of compression results

### 📐 Resize & Scale
- **Social media presets**: Instagram Post/Story, Facebook Post, Twitter Post, YouTube Thumbnail
- **HD presets**: 1080p, 720p, 4K options
- **Custom dimensions** with aspect ratio locking
- **Instant preview** of resized images

### ✂️ Crop
- **Interactive visual cropper** with drag-and-drop interface
- **Shape options**: Rectangle and Circle stencils
- **Aspect ratios**: Free, 1:1, 4:3, 16:9, 9:16, 4:5
- **Real-time preview** before applying crop

### 🎭 Remove Background
- **AI-powered background removal** running entirely in the browser
- **No server uploads** - complete privacy
- **Multiple output formats**: PNG, JPG, WebP

### 🔄 Convert
- **Wide format support**: SVG, PNG, JPG, WebP, HEIC, PDF
- **Quality control** for lossy formats
- **Batch conversion** support

## 🚀 Technology Stack

- **Frontend Framework**: [Vue 3](https://vuejs.org/) with Composition API
- **Language**: [TypeScript](https://www.typescriptlang.org/) with strict typing
- **Build Tool**: [Vite](https://vitejs.dev/) (Rolldown)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with custom glassmorphism design
- **Image Processing**:
  - [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) for compression
  - [vue-advanced-cropper](https://github.com/advanced-cropper/vue-advanced-cropper) for interactive cropping
  - [@imgly/background-removal](https://github.com/imgly/background-removal-js) for AI background removal
  - [heic2any](https://github.com/alexcorvi/heic2any) for HEIC conversion
  - [pdf.js](https://github.com/mozilla/pdf.js) for PDF rendering
  - Canvas API for core image manipulation
- **PWA**: Service Worker with offline caching support

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/picflow-ui.git
cd picflow-ui

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🛠️ Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check
```

## 🌐 PWA Features

- ✅ **Install to home screen** on mobile and desktop
- ✅ **Offline mode** with service worker caching
- ✅ **Standalone app experience** when installed
- ✅ **Fast loading** with cached resources
- ✅ **App shortcuts** for quick access to Compress and Convert modes

## 🎨 Design Highlights

- **Modern glassmorphism UI** with backdrop blur effects
- **Purple gradient theme** (indigo → purple → pink)
- **Responsive design** optimized for mobile and desktop
- **Custom-styled form elements** matching brand colors
- **Smooth animations** for file removal and interactions
- **Accessible** with proper cursor indicators and focus states

## 🔒 Privacy & Security

- **100% client-side processing** - your images never leave your device
- **No server uploads** - all operations happen in your browser
- **No tracking or analytics** - your privacy is guaranteed
- **No account required** - start using immediately

## 📱 Browser Support

- Chrome/Edge (recommended for best performance)
- Firefox
- Safari
- Opera

*Note: Background removal requires a modern browser with WebAssembly support*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression) by Donald
- [vue-advanced-cropper](https://github.com/advanced-cropper/vue-advanced-cropper) by Norserium
- [@imgly/background-removal](https://github.com/imgly/background-removal-js) by IMG.LY
- [Tailwind CSS](https://tailwindcss.com/) for the amazing utility-first CSS framework
- [Vue.js](https://vuejs.org/) team for the incredible framework

## 📧 Contact

Project Link: [https://github.com/yourusername/picflow-ui](https://github.com/yourusername/picflow-ui)

---

<p align="center">Made with ❤️ for privacy-conscious image processing</p>
