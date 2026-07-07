
export const en = {
    // Sidebar
    sidebar: {
        dashboard: 'Dashboard',
        events: 'Events',
        earnings: 'Earnings',
        reports: 'Reports',
        settings: 'Settings',
    },
    // Event Types
    eventTypes: {
        club: 'Club',
        corporate: 'Corporate',
    },
    // Dashboard
    dashboard: {
        title: 'Dashboard',
        addEvent: 'Add Event',
        nextEvent: {
            title: 'Next Event',
            loading: 'Loading...',
            noEvents: 'No upcoming events. Time to book some gigs!',
        },
        stats: {
            monthlyIncome: "This Month's Income",
            gigsCount: 'from {count} gigs',
            monthlyHours: "This Month's Hours",
            hoursWorked: 'Total hours worked',
            totalGigs: 'Total Gigs This Month',
            eventsPlayed: 'Events played',
            avgRate: 'Average Rate',
            avgRateDescription: 'Average across all gigs',
        },
        income: {
            title: 'Monthly Income',
        },
        breakdown: {
            title: 'Event Breakdown',
            description: "This month's gigs by type.",
            noEvents: 'No events this month.',
        }
    },
    // Events Page
    events: {
        title: 'Events',
        addEvent: 'Add Event',
        upcoming: 'Upcoming',
        past: 'Past',
        loading: 'Loading events...',
    },
    // Earnings Page
    earnings: {
        title: 'Earnings',
        allGigs: 'All Gigs',
    },
    // Reports Page
    reports: {
        title: 'Reports',
        allTitle: 'All Events',
        weeklyTitle: 'Weekly Report',
        monthlyTitle: 'Monthly Report',
        customTitle: 'Report from {startDate} to {endDate}',
        venueTitle: 'Report for',
        forVenue: 'for',
        thisWeek: 'This Week',
        thisMonth: 'This Month',
        pickDate: 'Pick a date range',
        selectGig: 'Select a specific gig',
        selectReportType: 'Select a report type to view data.',
        viewReport: 'View Report',
        print: 'Print / Save as PDF',
        loading: 'Loading report...',
        viewFooter: 'You can use your browser\'s print function to save this report as a PDF.',
        reportTitlePrint: 'DJ Ledger Report'
    },
    // Settings Page
    settings: {
        title: 'Settings',
        save: 'Save All Changes',
        toast: {
            save: {
                title: 'Settings Saved!',
                description: 'Your changes have been successfully saved.',
            },
            reportEmail: {
                required: 'Please enter an email address first.',
            },
            firestore: {
                success: {
                    title: 'Connection Successful!',
                    description: 'Successfully wrote data to the database.',
                },
                error: {
                    title: 'Connection Failed',
                    description: 'Could not write to the database. Check your Firestore rules.',
                }
            }
        },
        general: {
            title: 'General Settings',
            description: 'Configure the main settings of the application.',
            language: {
                label: 'App Language',
                description: 'Choose the display language for the interface.',
            },
            reportEmail: {
                label: 'Report Email',
                description: 'The default email address for sending reports.',
            },
            connection: {
                label: 'Database Connection',
                description: 'Test the connection to your Firestore database.',
                button: 'Test Connection'
            },
            theme: {
                label: 'App Theme',
                description: 'Select a light or dark theme for the app.',
                light: 'Light',
                dark: 'Dark',
                system: 'System',
            },
        },
        user: {
            title: 'User Preferences',
            description: 'Customize your personal experience in the app.',
            username: {
                label: 'Username',
                description: 'Your alias visible to others in the app.',
            },
            notifications: {
                label: 'Notifications',
                description: 'Enable or disable alerts for upcoming events.',
            },
            reminder: {
                label: 'Event Reminder',
                description: 'Set how far in advance you get a reminder.',
                minutes: '{count} minutes before',
                hour: '{count} hour before',
                day: '{count} day before',
            },
        },
        venues: {
            title: 'Frequent Venues',
            description: 'Add, edit, or remove your frequently used venues to speed up event entry.',
        },
        export: {
            title: 'Export & Security',
            description: 'Manage your data export settings and security options.',
            frequency: {
                label: 'Report Export Frequency',
                description: 'Choose how often to automatically export reports.',
                daily: 'Daily',
                weekly: 'Weekly',
                monthly: 'Monthly',
                annually: 'Annually',
            },
            method: {
                label: 'Export Method',
                description: 'Select how you want to receive your reports.',
                email: 'Email',
                download: 'Download',
                altEmail: 'Or send to an alternative email...',
                send: 'Send',
            },
            backup: {
                label: 'Cloud Backup',
                description: 'Automatically back up your data to Google Drive.',
            },
            session: {
                label: 'Session & Data',
                description: 'Log out or permanently delete all your data.',
                logout: 'Log Out',
                delete: 'Delete Data',
            }
        }
    },
    // Add Event Dialog
    addEventDialog: {
        title: 'Log a New Gig',
        description: 'Fill in the details of your event. Earnings will be calculated automatically.',
    },
    // Add Event Form
    addEventForm: {
        venue: 'Venue',
        selectVenue: 'Select a frequent venue',
        otherVenue: 'Other...',
        venueName: 'Venue Name',
        venueNamePlaceholder: 'e.g. The Roxy',
        eventType: 'Event Type',
        eventTypePlaceholder: 'Select event type',
        date: 'Date',
        pickDate: 'Pick a date',
        startTime: 'Start Time (Optional)',
        endTime: 'End Time (Optional)',
        advanceNIO: 'Advance (C$)',
        advanceUSD: 'Advance ($)',
        consumptionsNIO: 'Consumptions (C$)',
        consumptionsUSD: 'Consumptions ($)',
        notes: 'Notes (Optional)',
        notesPlaceholder: 'e.g. equipment provided, special requests...',
        logEvent: 'Log Event',
        toast: {
            title: 'Event Added!',
            description: '{venueName} on {date} has been logged.',
        }
    },
    // Edit Event Dialog
    editEventDialog: {
        title: 'Edit Gig',
        description: 'Update the details for your event.',
    },
    // Edit Event Form
    editEventForm: {
        earnings: 'Total Earnings ($)',
        save: 'Save Changes',
        toast: {
            title: 'Event Updated!',
            description: '{venueName} on {date} has been updated.',
        }
    },
    // Columns
    columns: {
        date: 'Date',
        venue: 'Venue',
        type: 'Type',
        hours: 'Hours',
        needsInfo: 'Needs Info',
        earnings: 'Earnings',
        actions: 'Actions',
        editEvent: 'Edit Event',
        deleteEvent: 'Delete Event',
    },
    // Data Table
    dataTable: {
        noResults: 'No results.',
    },
    // Reports Table
    reportsTable: {
        date: 'Date',
        venue: 'Venue',
        schedule: 'Schedule',
        totalPay: 'Total Pay ($)',
        totalHours: 'Total Hours',
        advanceUSD: 'Advance ($)',
        advanceNIO: 'Advance (C$)',
        consumptionsUSD: 'Consumptions ($)',
        consumptionsNIO: 'Consumptions (C$)',
        pendingUSD: 'Pending ($)',
        pendingNIO: 'Pending (C$)',
        noEvents: 'No events for this period.',
        totals: 'Totals',
    },
    // Send Report Dialog
    sendReportDialog: {
        buttonText: 'Send Report',
        title: 'Send Report via Email',
        description: 'Enter your email address to receive a PDF copy of the report.',
        emailLabel: 'Email Address',
        sending: 'Sending...',
        send: 'Send',
        toast: {
            success: {
                title: 'Report Sent!',
                description: 'The report has been sent to {email}.',
            },
            error: {
                title: 'Error',
                description: 'Failed to send the report. Please try again.',
            }
        }
    },
    // View Report Dialog
    viewReportDialog: {
        description: 'A preview of your generated report.',
        print: 'Print',
        exportPdf: 'Export PDF',
    },
    // Add Venue Dialog
    addVenueDialog: {
        buttonText: 'Add Venue',
        title: 'Add a New Frequent Venue',
        description: 'This will make it easier to log new gigs in the future.',
    },
    // Add Venue Form
    addVenueForm: {
        venueName: 'Venue Name',
        venueNamePlaceholder: 'e.g., The Roxy',
        category: 'Category',
        categoryPlaceholder: 'Select a category',
        addVenue: 'Add Venue',
        toast: {
            title: 'Venue Added!',
            description: '{venueName} has been added to your frequent venues.',
        }
    },
    // Venue List
    venueList: {
        venueName: 'Venue Name',
        category: 'Category',
        actions: 'Actions',
    }
};
