import { NextRequest, NextResponse } from "next/server";
import { extractPlacesWithHF } from "@/lib/huggingface-extract";
import { extractTextFromFiles } from "@/lib/file-parser";
import type { ExtractedPlace, TravelerContext } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const inspiration = formData.get("inspiration") as string;
    const files = formData.getAll("files") as File[];
    const travelerContextStr = formData.get("travelerContext") as string;
    
    // Parse traveler context if provided
    let travelerContext: TravelerContext | undefined;
    if (travelerContextStr) {
      try {
        travelerContext = JSON.parse(travelerContextStr);
      } catch (e) {
        console.warn("Failed to parse traveler context:", e);
      }
    }

    let textToProcess = "";

    // Process uploaded files
    if (files && files.length > 0) {
      console.log(`\n=== FILE PROCESSING START ===`);
      console.log(`Processing ${files.length} file(s)...`);
      for (const file of files) {
        console.log(`  - ${file.name} (${file.type}, ${file.size} bytes)`);
      }
      
      try {
        const extractedText = await extractTextFromFiles(files);
        console.log(`✅ Extracted text length: ${extractedText.length} characters`);
        
        if (extractedText.trim().length === 0) {
          console.error("⚠️ WARNING: Extracted text is EMPTY! PDF might be image-based or corrupted.");
          return NextResponse.json(
            { error: "Could not extract text from PDF. The PDF might be image-based (scanned) or corrupted. Try converting it to text first or use an image with OCR.", details: "Empty text extracted" },
            { status: 400 }
          );
        }
        
        console.log(`First 500 chars: ${extractedText.substring(0, 500)}`);
        textToProcess += extractedText + "\n\n";
        console.log(`=== FILE PROCESSING END ===\n`);
      } catch (error) {
        console.error("❌ Error processing files:", error);
        const errorDetails = error instanceof Error ? error.message : "Unknown error";
        console.error("Full error:", error);
        return NextResponse.json(
          { error: "Failed to process uploaded files", details: errorDetails },
          { status: 400 }
        );
      }
    }

    // Add text inspiration if provided
    if (inspiration && inspiration.trim()) {
      textToProcess += inspiration + "\n\n";
    }

    if (!textToProcess.trim()) {
      return NextResponse.json(
        { error: "No text or files provided" },
        { status: 400 }
      );
    }

    console.log(`Total text to process: ${textToProcess.length} characters`);

    // Extract URLs from text
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = textToProcess.match(urlPattern) || [];
    if (urls.length > 0) {
      textToProcess += `\nURLs found: ${urls.join(", ")}\n`;
    }

    // Extract places using Hugging Face AI
    console.log("Calling Hugging Face extraction...");
    console.log(`Text sample: ${textToProcess.substring(0, 200)}...`);
    if (travelerContext) {
      console.log(`Traveler context: ${travelerContext.type}, tags: ${travelerContext.tags?.join(", ") || "none"}`);
    }
    
    const extractedPlaces = await extractPlacesWithHF(textToProcess, travelerContext);
    console.log(`✅ Extracted ${extractedPlaces.length} places`);
    
    if (extractedPlaces.length > 0) {
      console.log("Places found:", extractedPlaces.map(p => p.name).join(", "));
    } else {
      console.warn("⚠️ No places extracted! This might be a problem with the AI or the text doesn't contain place names.");
    }

    return NextResponse.json({
      places: extractedPlaces,
      count: extractedPlaces.length,
    });
  } catch (error) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract places", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

