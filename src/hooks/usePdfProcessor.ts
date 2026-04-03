import * as pdfjsLib from 'pdfjs-dist';
import { useState } from 'react';

// Initialize PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PDFPage {
  id: string;
  url: string;
  originalCanvas: HTMLCanvasElement | null; // null for blank slides
  isSelected: boolean;
  pageNumber: number;
  fileName: string;
  isBlank?: boolean;
}

export interface PDFFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  pages: PDFPage[];
}

export const usePdfProcessor = () => {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadFiles = async (newFiles: File[], onProgress?: (progress: number) => void) => {
    setIsProcessing(true);
    const processedFiles: PDFFile[] = [];
    const allNewPages: PDFPage[] = [];
    
    const totalPages = await Promise.all(newFiles.map(async f => {
      const arrayBuffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      return pdf.numPages;
    })).then(counts => counts.reduce((a, b) => a + b, 0));

    let processedPagesCount = 0;

    for (const file of newFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const filePages: PDFPage[] = [];

        // Process pages in chunks to avoid overwhelming the browser
        const CHUNK_SIZE = 3;
        for (let i = 1; i <= pdf.numPages; i += CHUNK_SIZE) {
          const chunkEnd = Math.min(i + CHUNK_SIZE - 1, pdf.numPages);
          const chunkPromises = [];

          for (let j = i; j <= chunkEnd; j++) {
            chunkPromises.push((async (pageNum) => {
              const page = await pdf.getPage(pageNum);
              // Use a lower scale for initial preview to speed up processing
              const viewport = page.getViewport({ scale: 0.8 });
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              await page.render({ canvasContext: context, viewport }).promise;

              processedPagesCount++;
              if (onProgress) {
                onProgress(Math.round((processedPagesCount / totalPages) * 100));
              }

              return {
                id: Math.random().toString(36).substring(2, 11),
                url: canvas.toDataURL('image/webp', 0.5), // Lower quality for faster preview
                originalCanvas: canvas,
                isSelected: true,
                pageNumber: pageNum,
                fileName: file.name
              };
            })(j));
          }

          const renderedChunk = await Promise.all(chunkPromises);
          filePages.push(...renderedChunk);
          allNewPages.push(...renderedChunk);
          
          // Yield to main thread to keep UI responsive
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        processedFiles.push({
          id: Math.random().toString(36).substring(2, 11),
          name: file.name,
          size: file.size,
          pageCount: pdf.numPages,
          pages: filePages
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    setFiles((prev) => [...prev, ...processedFiles]);
    setPages((prev) => [...prev, ...allNewPages]);
    setIsProcessing(false);
  };

  const addBlankSlide = (index: number) => {
    const blankPage: PDFPage = {
      id: Math.random().toString(36).substring(2, 11),
      url: '', // Empty or placeholder for blank
      originalCanvas: null,
      isSelected: true,
      pageNumber: -1,
      fileName: 'Blank Slide',
      isBlank: true
    };
    const newPages = [...pages];
    newPages.splice(index + 1, 0, blankPage);
    setPages(newPages);
  };

  const removeFile = (fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId);
    if (fileToRemove) {
      const pageIdsToRemove = new Set(fileToRemove.pages.map(p => p.id));
      setPages(prev => prev.filter(p => !pageIdsToRemove.has(p.id)));
      setFiles(prev => prev.filter(f => f.id !== fileId));
    }
  };

  const reorderPages = (startIndex: number, endIndex: number) => {
    const result = Array.from(pages);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setPages(result);
  };

  const reorderFiles = (startIndex: number, endIndex: number) => {
    if (endIndex < 0 || endIndex >= files.length) return;
    const result: PDFFile[] = Array.from(files);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setFiles(result);
    
    // Update pages to match new file order
    const newPages: PDFPage[] = [];
    result.forEach(file => {
      newPages.push(...file.pages);
    });
    setPages(newPages);
  };

  return { 
    files, 
    pages, 
    setPages, 
    loadFiles, 
    isProcessing, 
    addBlankSlide, 
    removeFile, 
    reorderPages,
    reorderFiles
  };
};
