import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function getFileSize(filePath: string): Promise<number> {
  console.log("Getting size for:", filePath);

  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    try {
      console.log("Fetching remote file:", filePath);
      const response = await axios.get(filePath, {
        responseType: "arraybuffer",
      });
      console.log("Remote file size:", response.data.length);
      return response.data.length;
    } catch (error) {
      console.error("Error fetching remote file:", error);
      throw error;
    }
  } else {
    try {
      console.log("Reading local file:", filePath);
      const stats = fs.statSync(filePath);
      console.log("Local file size:", stats.size);
      return stats.size;
    } catch (error) {
      console.error("Error reading local file:", error);
      throw error;
    }
  }
}

// Supported file extensions
const supportedExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".webp",
  ".riv",
  ".json",
  ".lottie",
  ".mp4",
  ".mp3",
  ".wav",
  ".ogg",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
  ".svg",
  ".ico",
  ".heic",
  ".heif",
  ".m3u8",
];

const extensionsPattern = supportedExtensions
  .map((ext) => ext.replace(".", "\\."))
  .join("|");
const filePatterns = {
  require: new RegExp(
    `require\\(['\"]([^'\"]+(${extensionsPattern}))['\"]\\)`,
    "g"
  ),
  import: new RegExp(`from\\s+['\"]([^'\"]+(${extensionsPattern}))['\"]`, "g"),
  url: new RegExp(
    `['\"](https?:\\/\\/[^'\"]+(${extensionsPattern}))['\"]`,
    "g"
  ),
  variable: new RegExp(`['\"]([^'\"]+(${extensionsPattern}))['\"]`, "g"),
};

async function findImageReferences(
  document: vscode.TextDocument
): Promise<vscode.DecorationOptions[]> {
  const decorations: vscode.DecorationOptions[] = [];
  const text = document.getText();
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

  if (!workspaceFolder) {
    console.log("No workspace folder found");
    return decorations;
  }

  console.log("Processing file:", document.uri.fsPath);
  console.log("Workspace folder:", workspaceFolder.uri.fsPath);

  const seen = new Set<string>(); // Track unique ranges

  for (const [type, pattern] of Object.entries(filePatterns)) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const filePath = match[1];
      // Find the start index of the file path within the match
      const matchStart = match.index;
      const matchText = match[0];
      const pathIndex = matchText.indexOf(filePath);
      const pathStart = matchStart + pathIndex;
      const pathEnd = pathStart + filePath.length;
      const startPos = document.positionAt(pathStart);
      const endPos = document.positionAt(pathEnd);
      const rangeKey = `${startPos.line}:${startPos.character}-${endPos.line}:${endPos.character}`;
      if (seen.has(rangeKey)) continue; // Skip if already decorated
      seen.add(rangeKey);

      try {
        let fullPath = filePath;
        if (!filePath.startsWith("http")) {
          // For local files, resolve the path relative to the document
          const documentDir = path.dirname(document.uri.fsPath);
          fullPath = path.resolve(documentDir, filePath);
          console.log("Resolved local path:", fullPath);
        }

        const size = await getFileSize(fullPath);
        console.log(`Size for ${type} file:`, size);

        const decoration = {
          range: new vscode.Range(startPos, endPos),
          hoverMessage: new vscode.MarkdownString(
            `**File Size:** ${formatFileSize(size)}`
          ),
          renderOptions: {
            after: {
              contentText: ` (${formatFileSize(size)})`,
              color: new vscode.ThemeColor("editorCodeLens.foreground"),
            },
          },
        };
        decorations.push(decoration);
      } catch (error) {
        console.error(`Error processing ${type} file:`, error);
      }
    }
  }

  return decorations;
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Image Size Extension is now active!");
  vscode.window.showInformationMessage("Image Size Extension is now active!");

  // Create decoration type for inline size display
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      margin: "0 0 0 1em",
      color: new vscode.ThemeColor("editorCodeLens.foreground"),
    },
  });

  // Update decorations when the active editor changes
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    updateDecorations(activeEditor);
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        updateDecorations(editor);
      }
    },
    null,
    context.subscriptions
  );

  // Update decorations when the document changes
  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        updateDecorations(activeEditor);
      }
    },
    null,
    context.subscriptions
  );

  async function updateDecorations(editor: vscode.TextEditor) {
    const document = editor.document;
    if (
      document.languageId === "javascript" ||
      document.languageId === "typescript" ||
      document.languageId === "javascriptreact" ||
      document.languageId === "typescriptreact"
    ) {
      console.log("Updating decorations for:", document.uri.fsPath);
      const decorations = await findImageReferences(document);
      editor.setDecorations(decorationType, decorations);
    }
  }

  // Original command for showing image size
  let disposable = vscode.commands.registerCommand(
    "image-size.showImageSize",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.uri.fsPath) {
        const filePath = editor.document.uri.fsPath;
        const ext = path.extname(filePath).toLowerCase();

        if (supportedExtensions.includes(ext)) {
          try {
            const size = await getFileSize(filePath);
            vscode.window.showInformationMessage(
              `File Size: ${formatFileSize(size)}`
            );
          } catch (error) {
            vscode.window.showErrorMessage("Error reading the file size.");
          }
        } else {
          vscode.window.showInformationMessage(
            "Please open a supported file type to view its size."
          );
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
