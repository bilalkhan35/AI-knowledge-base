import PDFParser from "pdf2json";

type PDFParserDataError =
  | Error
  | {
      parserError: Error;
    };

type PDFTextRun = {
  T: string;
};

type PDFTextItem = {
  x: number | string;
  y: number | string;
  w: number | string;
  R: PDFTextRun[];
};

type PDFPage = {
  Width?: number | string;
  Height?: number | string;
  Texts: PDFTextItem[];
};

type PDFData = {
  Pages: PDFPage[];
};

type PositionedText = {
  x: number;
  y: number;
  w: number;
  text: string;
};

export async function extractTextFromPDF(filePath: string): Promise<string> {
  const parser = new PDFParser();

  return new Promise((resolve, reject) => {
    parser.on("pdfParser_dataError", (errData: PDFParserDataError) => {
      reject(errData instanceof Error ? errData : errData.parserError);
    });

    parser.on("pdfParser_dataReady", (pdfData: PDFData) => {
      const pages: string[] = [];

      for (const page of pdfData.Pages) {
        const items = extractPositionedText(page);

        if (items.length === 0) {
          continue;
        }

        const pageText = splitIntoReadingColumns(items, Number(page.Width))
          .map(buildColumnText)
          .filter(Boolean)
          .join("\n\n");

        pages.push(pageText);
      }

      resolve(cleanExtractedText(pages.join("\n\n")));
    });

    parser.loadPDF(filePath);
  });
}

function extractPositionedText(page: PDFPage): PositionedText[] {
  return page.Texts.flatMap((item) =>
    item.R.map((run) => {
      let text: string;

      try {
        text = decodeURIComponent(run.T);
      } catch {
        text = run.T;
      }

      return {
        x: Number(item.x),
        y: Number(item.y),
        w: Number(item.w),
        text: text.trim(),
      };
    }),
  ).filter(
    (item) =>
      item.text &&
      Number.isFinite(item.x) &&
      Number.isFinite(item.y) &&
      Number.isFinite(item.w),
  );
}

function splitIntoReadingColumns(
  items: PositionedText[],
  pageWidth: number,
): PositionedText[][] {
  const splitX = findColumnSplitX(items, pageWidth);

  if (splitX === null) {
    return [items];
  }

  const leftItems = items.filter((item) => item.x < splitX);
  const rightItems = items.filter((item) => item.x >= splitX);

  if (!hasMeaningfulTwoColumnLayout(leftItems, rightItems)) {
    return [items];
  }

  return [leftItems, rightItems];
}

function findColumnSplitX(
  items: PositionedText[],
  pageWidth: number,
): number | null {
  if (Number.isFinite(pageWidth) && pageWidth > 0) {
    return pageWidth / 2;
  }

  const sortedX = [...new Set(items.map((item) => roundCoordinate(item.x)))]
    .sort((a, b) => a - b);

  if (sortedX.length < 2) {
    return null;
  }

  let biggestGap = 0;
  let splitX: number | null = null;

  for (let i = 1; i < sortedX.length; i++) {
    const gap = sortedX[i] - sortedX[i - 1];

    if (gap > biggestGap) {
      biggestGap = gap;
      splitX = (sortedX[i] + sortedX[i - 1]) / 2;
    }
  }

  return biggestGap >= 2 ? splitX : null;
}

function hasMeaningfulTwoColumnLayout(
  leftItems: PositionedText[],
  rightItems: PositionedText[],
): boolean {
  if (leftItems.length === 0 || rightItems.length === 0) {
    return false;
  }

  const leftCharacters = countCharacters(leftItems);
  const rightCharacters = countCharacters(rightItems);
  const totalCharacters = leftCharacters + rightCharacters;

  if (totalCharacters === 0) {
    return false;
  }

  const smallerColumnRatio =
    Math.min(leftCharacters, rightCharacters) / totalCharacters;

  return smallerColumnRatio >= 0.15;
}

function countCharacters(items: PositionedText[]): number {
  return items.reduce((sum, item) => sum + item.text.length, 0);
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildColumnText(items: PositionedText[]): string {
  if (items.length === 0) {
    return "";
  }

  const lines: {
    y: number;
    items: {
      x: number;
      w: number;
      text: string;
    }[];
  }[] = [];

  for (const item of items) {
    let line = lines.find(
      (existingLine) => Math.abs(existingLine.y - item.y) < 0.15,
    );

    if (!line) {
      line = {
        y: item.y,
        items: [],
      };

      lines.push(line);
    }

    line.items.push({
      x: item.x,
      w: item.w,
      text: item.text,
    });
  }

  lines.sort((a, b) => a.y - b.y);

  return lines
    .map((line) => {
      line.items.sort((a, b) => a.x - b.x);

      return line.items.map((item) => item.text).join(" ");
    })
    .join("\n");
}

function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
