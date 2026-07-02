
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReportsTable } from './reports-table';
import type { Event } from '@/types';
import { useTranslation } from '@/hooks/use-translation';
import { Eye, Printer, FileDown, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ViewReportDialogProps {
  events: Event[];
  reportTitle: string;
}

export function ViewReportDialog({ events, reportTitle }: ViewReportDialogProps) {
  const { t } = useTranslation();
  const printRef = React.useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
      const newTab = window.open('', '_blank');
      if (newTab) {
        newTab.document.write(`
          <html>
            <head>
              <title>${reportTitle}</title>
              <style>
                body { 
                  font-family: sans-serif;
                  margin: 2rem;
                }
                table { 
                  width: 100%; 
                  border-collapse: collapse; 
                  font-size: 0.9rem;
                }
                th, td { 
                  border: 1px solid #ddd; 
                  padding: 8px; 
                  text-align: left; 
                }
                th { 
                  background-color: #f2f2f2; 
                  font-weight: bold;
                }
                tfoot {
                  font-weight: bold;
                }
                h1 {
                  text-align: center;
                  font-size: 1.5rem;
                  margin-bottom: 2rem;
                }
                .text-right { text-align: right; }
                .text-xs { font-size: 0.75rem; color: #666; }
                .text-muted-foreground { color: #666; }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        newTab.document.close();
        newTab.focus(); // Focus on the new tab
        newTab.print(); // Open print dialog
      }
    }
  };

  const handleExportPdf = async () => {
    const printContent = printRef.current;
    if (!printContent) return;

    try {
      setIsGenerating(true);
      const clone = printContent.cloneNode(true) as HTMLDivElement;
      
      // Force light-theme styles on the cloned element for a professional print look
      clone.style.position = 'fixed';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.width = '1000px'; // slightly wider for better desktop aspect ratio in PDF
      clone.style.padding = '40px';
      clone.style.background = '#ffffff';
      clone.style.color = '#000000';
      clone.style.fontFamily = 'Inter, sans-serif';
      
      document.body.appendChild(clone);
      
      // Apply white background & black text overrides to card/table elements inside the clone
      const cards = clone.querySelectorAll('.bg-card, .bg-background, .border, table');
      cards.forEach((card: any) => {
        card.style.backgroundColor = '#ffffff';
        card.style.color = '#000000';
        card.style.borderColor = '#e2e8f0';
        card.style.boxShadow = 'none';
      });

      const textColors = clone.querySelectorAll('.text-muted-foreground, .text-gray-400, .text-slate-400, .text-green-600, td, th');
      textColors.forEach((text: any) => {
        if (text.classList.contains('text-green-600')) {
          text.style.color = '#16a34a'; // keep green for positive values
        } else if (text.classList.contains('text-muted-foreground')) {
          text.style.color = '#4b5563'; // clean medium-dark gray
        } else {
          text.style.color = '#000000';
        }
      });

      const tableHeaders = clone.querySelectorAll('th, .font-bold');
      tableHeaders.forEach((header: any) => {
        header.style.color = '#000000';
        header.style.fontWeight = '700';
        header.style.backgroundColor = '#f8fafc'; // subtle background for table headers
      });

      const tableRows = clone.querySelectorAll('tr, td, th');
      tableRows.forEach((row: any) => {
        row.style.borderColor = '#e2e8f0';
        row.style.padding = '10px 8px';
      });

      // Render clone to canvas
      const canvas = await html2canvas(clone, {
        scale: 2, // high quality
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${reportTitle.toLowerCase().replace(/\s+/g, '_')}_report.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          {t('reports.viewReport')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{reportTitle}</DialogTitle>
          <DialogDescription>
            {t('viewReportDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <div ref={printRef} className="p-1">
            <h1 className="text-2xl font-bold tracking-tight mb-4">{reportTitle}</h1>
            <ReportsTable events={events} />
          </div>
        </ScrollArea>
        <DialogFooter className="mt-auto pt-4 flex gap-2 justify-end">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            {t('viewReportDialog.print')}
          </Button>
          <Button onClick={handleExportPdf} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            {t('viewReportDialog.exportPdf')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
