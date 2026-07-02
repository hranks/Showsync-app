
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
import { Eye, Printer } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface ViewReportDialogProps {
  events: Event[];
  reportTitle: string;
}

export function ViewReportDialog({ events, reportTitle }: ViewReportDialogProps) {
  const { t } = useTranslation();
  const printRef = React.useRef<HTMLDivElement>(null);

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
        <DialogFooter className="mt-auto pt-4">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={handlePrint}>
            <Printer className="mr-2" />
            {t('viewReportDialog.print')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
