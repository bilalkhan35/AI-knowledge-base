import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { ingestPDF } from "@/lib/ingest";

export async function POST(request: Request) {
  let filePath: string | undefined;

  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 },
      );
    }

    // Convert browser File to Buffer.
    const buffer = Buffer.from(await file.arrayBuffer());

    // Temporary location
    filePath = path.join(os.tmpdir(), `rag-${Date.now()}-${file.name}`);

    // Save PDF temporarily
    await writeFile(filePath, buffer);

    // Run our existing ingestion pipeline
    const result = await ingestPDF(filePath);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  } finally {
    // Delete temporary PDF
    if (filePath) {
      try {
        await unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
