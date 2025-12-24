import { createWorker } from "tesseract.js";

// Polyfill DOM for pdf-parse v2 (needed for DOMMatrix, ImageData, etc.)
if (typeof globalThis.DOMMatrix === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  try {
    const { DOMMatrix, DOMPoint } = require("canvas");
    globalThis.DOMMatrix = DOMMatrix;
    globalThis.DOMPoint = DOMPoint;
  } catch (e) {
    // Fallback: create minimal polyfills
    globalThis.DOMMatrix = class DOMMatrix {
      constructor(init?: any) {
        if (init) Object.assign(this, init);
      }
    } as any;
  }
}

// Use eval to dynamically require CommonJS modules (works in Next.js API routes)
const getPdfParse = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParseLib = require("pdf-parse");
  // pdf-parse v2 uses PDFParse class, not a function
  return pdfParseLib.PDFParse || pdfParseLib;
};

const getMammoth = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mammothLib = require("mammoth");
  return typeof mammothLib === "function" ? mammothLib : mammothLib.default || mammothLib;
};

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log(`  [PDF] Reading file: ${file.name} (${file.size} bytes)`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`  [PDF] Buffer created, parsing...`);
    
    const PDFParse = getPdfParse();
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text || "";
    console.log(`  [PDF] Parsed successfully. Text length: ${text.length} chars`);
    
    if (text.trim().length === 0) {
      console.warn(`  [PDF] ⚠️ WARNING: PDF parsed but contains no text! Might be image-based/scanned.`);
    }
    
    return text;
  } catch (error) {
    console.error(`  [PDF] ❌ Error parsing PDF "${file.name}":`, error);
    throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract text from DOC/DOCX file
 */
export async function extractTextFromDOC(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const mammothLib = getMammoth();
    const result = await mammothLib.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("Error parsing DOC:", error);
    throw new Error("Failed to parse DOC file");
  }
}

/**
 * Extract text from image using OCR
 */
export async function extractTextFromImage(file: File): Promise<string> {
  try {
    const worker = await createWorker("eng");
    const { data } = await worker.recognize(file);
    await worker.terminate();
    return data.text;
  } catch (error) {
    console.error("Error performing OCR:", error);
    throw new Error("Failed to extract text from image");
  }
}

/**
 * Extract text from text file
 */
export async function extractTextFromTextFile(file: File): Promise<string> {
  try {
    return await file.text();
  } catch (error) {
    console.error("Error reading text file:", error);
    throw new Error("Failed to read text file");
  }
}

/**
 * Extract text from any supported file type
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // PDF
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return await extractTextFromPDF(file);
  }

  // DOC/DOCX
  if (
    fileType === "application/msword" ||
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return await extractTextFromDOC(file);
  }

  // Images
  if (fileType.startsWith("image/")) {
    return await extractTextFromImage(file);
  }

  // Text files
  if (
    fileType === "text/plain" ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md")
  ) {
    return await extractTextFromTextFile(file);
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

/**
 * Extract text from multiple files
 */
export async function extractTextFromFiles(files: File[]): Promise<string> {
  const texts = await Promise.all(
    files.map(async (file) => {
      try {
        const text = await extractTextFromFile(file);
        return `[From ${file.name}]\n${text}\n\n`;
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        return `[Error processing ${file.name}]\n\n`;
      }
    })
  );

  return texts.join("\n---\n\n");
}

