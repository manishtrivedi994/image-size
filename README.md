# File Size Lens

Displays the size of images, media, and other files inline in VSCode.

## Features

- Shows the file size of supported files (images, media, JSON, etc.) inline in your code
- Supports local and remote files
- Works with `import`, `require`, direct URLs, and variable assignments
- Hover over the file path to see the file size in a tooltip
- Supports a wide range of file types: images, videos, audio, JSON, SVG, and more

## Supported File Types

```
.png, .jpg, .jpeg, .gif, .bmp, .webp, .riv, .json, .lottie, .mp4, .mp3, .wav, .ogg, .webm, .mov, .avi, .mkv, .svg, .ico, .heic, .heif, .m3u8
```

## Usage

1. **Install the extension** (or run in development mode)
2. **Open a JavaScript, TypeScript, or React file** that references supported files
3. The file size will appear inline after the file path:

```js
import logo from "./assets/logo.png"; // (12.3 KB)
const video = require("./media/clip.mp4"); // (2.1 MB)
const remote = "https://example.com/file.json"; // (3.4 KB)
```

4. **Hover** over the file path to see the file size in a tooltip

## Commands

- `File Size Lens: Show File Size` — Shows the size of the currently open file in a notification

## Why "Lens"?

The extension uses VS Code's decoration API to display file size information inline, similar to how CodeLens displays extra info above functions.

## Contributing

Pull requests and suggestions are welcome!

## License

MIT
