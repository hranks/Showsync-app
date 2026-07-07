'use client';

import React from 'react';

import { useEvents } from '@/hooks/use-events-store';
import { Button } from '@/components/ui/button';
import { ReportsTable } from '@/components/reports/reports-table';
import { Event } from '@/types';
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { SendReportDialog } from '@/components/reports/send-report-dialog';
import { ViewReportDialog } from '@/components/reports/view-report-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, PartyPopper } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';


export default function ReportsPage() {
  const { events } = useEvents();
  const [filteredEvents, setFilteredEvents] = React.useState<Event[]>([]);
  const [reportType, setReportType] = React.useState<'all' | 'weekly' | 'monthly' | 'custom' | 'gig' | null>('all');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [selectedVenueName, setSelectedVenueName] = React.useState<string | undefined>();
  const { t } = useTranslation();

  const uniqueVenues = React.useMemo(() => {
    const venueNames = new Set(events.map(e => e.venueName));
    return Array.from(venueNames);
  }, [events]);

  const filterEvents = React.useCallback((
    type: 'all' | 'weekly' | 'monthly' | 'custom' | 'gig' | null,
    range?: DateRange,
    venueName?: string
  ) => {
    let filtered: Event[] = events;

    // Filter by date
    if (type === 'weekly') {
      const now = new Date();
      const start = startOfWeek(now);
      const end = endOfWeek(now);
      filtered = events.filter(e => e.date >= start && e.date <= end);
    } else if (type === 'monthly') {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      filtered = events.filter(e => e.date >= start && e.date <= end);
    } else if (type === 'custom' && range?.from && range?.to) {
      const start = range.from;
      const end = range.to;
      filtered = events.filter(e => e.date >= start && e.date <= end);
    } else if (type === 'all') {
      // Do nothing, show all events
    }

    // Filter by venue if selected
    if (venueName) {
      filtered = filtered.filter(e => e.venueName === venueName);
    }
    
    setFilteredEvents(filtered);
    setReportType(type);
  }, [events]);

  React.useEffect(() => {
    // Initialize or update with 'all' if no specific report type is set
    if (reportType === 'all' || reportType === null) {
        filterEvents('all', dateRange, selectedVenueName);
    }
  }, [events, filterEvents, reportType, dateRange, selectedVenueName]);
  
  const handleWeeklyReport = () => {
    setDateRange(undefined);
    setSelectedVenueName(undefined);
    filterEvents('weekly');
  }

  const handleMonthlyReport = () => {
    setDateRange(undefined);
    setSelectedVenueName(undefined);
    filterEvents('monthly');
  }
  
  const handleVenueSelect = (venueName: string) => {
    setSelectedVenueName(venueName);
    filterEvents(reportType, dateRange, venueName);
  }

  React.useEffect(() => {
    if(reportType === 'custom' && dateRange) {
        filterEvents(reportType, dateRange, selectedVenueName);
    }
  }, [dateRange, events, filterEvents, reportType, selectedVenueName]);


  const getReportTitle = () => {
    if (reportType === 'all') return t('reports.allTitle') || 'Todos los Eventos';
    if (reportType === 'weekly') return t('reports.weeklyTitle');
    if (reportType === 'monthly') return t('reports.monthlyTitle');
    if (reportType === 'custom' && dateRange?.from && dateRange?.to) {
        let title = t('reports.customTitle');
        title = title.replace('{startDate}', format(dateRange.from, 'LLL dd, y'));
        title = title.replace('{endDate}', format(dateRange.to, 'LLL dd, y'));
        if (selectedVenueName) {
          title += ` ${t('reports.forVenue')} ${selectedVenueName}`;
        }
        return title;
    }
     if (selectedVenueName) {
        return `${t('reports.venueTitle')} ${selectedVenueName}`;
    }
    return t('reports.title');
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">{getReportTitle()}</h2>
          <div className="flex items-center space-x-2">
            {reportType && (
              <>
                <ViewReportDialog events={filteredEvents} reportTitle={getReportTitle()} />
                <SendReportDialog events={filteredEvents} reportTitle={getReportTitle()} />
              </>
            )}
          </div>
        </div>
        <Card>
            <CardContent className="p-4 flex items-center justify-between">
                 <div className="flex items-center space-x-2">
                    <Button onClick={handleWeeklyReport} variant={reportType === 'weekly' ? 'default' : 'outline'}>
                    {t('reports.thisWeek')}
                    </Button>
                    <Button onClick={handleMonthlyReport} variant={reportType === 'monthly' ? 'default' : 'outline'}>
                    {t('reports.thisMonth')}
                    </Button>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[300px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground",
                                reportType === 'custom' && "border-primary"
                            )}
                            onClick={() => setReportType('custom')}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                </>
                                ) : (
                                format(dateRange.from, "LLL dd, y")
                                )
                            ) : (
                                <span>{t('reports.pickDate')}</span>
                            )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    <Select onValueChange={handleVenueSelect} value={selectedVenueName}>
                      <SelectTrigger className={cn(
                          "w-[300px]",
                          selectedVenueName && "border-primary"
                      )}>
                        <SelectValue placeholder={
                          <div className="flex items-center">
                            <PartyPopper className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('reports.selectGig')}</span>
                          </div>
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueVenues.map(venueName => (
                          <SelectItem key={venueName} value={venueName}>
                            {venueName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
        <div className="space-y-4">
            {reportType ? <ReportsTable events={filteredEvents} /> : (
                <div className="flex items-center justify-center h-96 border rounded-md">
                    <p className="text-muted-foreground">{t('reports.selectReportType')}</p>
                </div>
            )}
        </div>
      </div>
    </>
  );
}
