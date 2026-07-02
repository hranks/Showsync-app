
export const es = {
    // Sidebar
    sidebar: {
        dashboard: 'Dashboard',
        events: 'Eventos',
        earnings: 'Ganancias',
        reports: 'Reportes',
        settings: 'Configuración',
    },
    // Event Types
    eventTypes: {
        club: 'Discoteca',
        corporate: 'Corporativo',
    },
    // Dashboard
    dashboard: {
        title: 'Dashboard',
        addEvent: 'Añadir Evento',
        nextEvent: {
            title: 'Próximo Evento',
            loading: 'Cargando...',
            noEvents: 'No hay eventos próximos. ¡Es hora de conseguir más toques!',
        },
        stats: {
            monthlyIncome: "Ingresos del Mes",
            gigsCount: 'de {count} toques',
            monthlyHours: "Horas del Mes",
            hoursWorked: 'Total de horas trabajadas',
            totalGigs: 'Toques Totales del Mes',
            eventsPlayed: 'Eventos tocados',
            avgRate: 'Tarifa Promedio',
            avgRateDescription: 'Promedio de todos los toques',
        },
        income: {
            title: 'Ingresos Mensuales',
        },
        breakdown: {
            title: 'Desglose de Eventos',
            description: 'Toques de este mes por tipo.',
            noEvents: 'No hay eventos este mes.',
        }
    },
    // Events Page
    events: {
        title: 'Eventos',
        addEvent: 'Añadir Evento',
        upcoming: 'Próximos',
        past: 'Pasados',
        loading: 'Cargando eventos...',
    },
    // Earnings Page
    earnings: {
        title: 'Ganancias',
        allGigs: 'Todos los Toques',
    },
    // Reports Page
    reports: {
        title: 'Reportes',
        weeklyTitle: 'Reporte Semanal',
        monthlyTitle: 'Reporte Mensual',
        customTitle: 'Reporte desde {startDate} hasta {endDate}',
        venueTitle: 'Reporte de',
        forVenue: 'para',
        thisWeek: 'Esta Semana',
        thisMonth: 'Este Mes',
        pickDate: 'Elige un rango de fechas',
        selectGig: 'Selecciona un toque específico',
        selectReportType: 'Selecciona un tipo de reporte para ver los datos.',
        viewReport: 'Ver Reporte',
        print: 'Imprimir / Guardar como PDF',
        loading: 'Cargando reporte...',
        viewFooter: 'Puedes usar la función de imprimir de tu navegador para guardar este reporte como PDF.',
        reportTitlePrint: 'Reporte de DJ Ledger'
    },
    // Settings Page
    settings: {
        title: 'Configuración',
        save: 'Guardar Cambios',
        toast: {
            save: {
                title: '¡Configuración Guardada!',
                description: 'Tus cambios han sido guardados exitosamente.',
            },
            reportEmail: {
                required: 'Por favor, introduce una dirección de correo primero.',
            },
            firestore: {
                success: {
                    title: '¡Conexión Exitosa!',
                    description: 'Se escribieron los datos en la base de datos correctamente.',
                },
                error: {
                    title: 'Falló la Conexión',
                    description: 'No se pudo escribir en la base de datos. Revisa tus reglas de Firestore.',
                }
            }
        },
        general: {
            title: 'Configuración General',
            description: 'Configura los ajustes principales de la aplicación.',
            language: {
                label: 'Idioma de la App',
                description: 'Elige el idioma de la interfaz.',
            },
            reportEmail: {
                label: 'Email para Reportes',
                description: 'La dirección de correo por defecto para enviar reportes.',
            },
            connection: {
                label: 'Conexión a la Base de Datos',
                description: 'Prueba la conexión a tu base de datos Firestore.',
                button: 'Probar Conexión'
            },
            theme: {
                label: 'Tema de la App',
                description: 'Selecciona un tema claro u oscuro para la app.',
                light: 'Claro',
                dark: 'Oscuro',
                system: 'Sistema',
            },
        },
        user: {
            title: 'Preferencias de Usuario',
            description: 'Personaliza tu experiencia en la aplicación.',
            username: {
                label: 'Nombre de Usuario',
                description: 'Tu alias visible para otros en la app.',
            },
            notifications: {
                label: 'Notificaciones',
                description: 'Activa o desactiva las alertas para eventos próximos.',
            },
            reminder: {
                label: 'Recordatorio de Evento',
                description: 'Configura con cuánta antelación recibes un recordatorio.',
                minutes: '{count} minutos antes',
                hour: '{count} hora antes',
                day: '{count} día antes',
            },
        },
        venues: {
            title: 'Lugares Frecuentes',
            description: 'Añade, edita o elimina tus lugares frecuentes para agilizar el registro de eventos.',
        },
        export: {
            title: 'Exportación y Seguridad',
            description: 'Gestiona la configuración de exportación y las opciones de seguridad.',
            frequency: {
                label: 'Frecuencia de Exportación de Reportes',
                description: 'Elige con qué frecuencia se exportan los reportes.',
                weekly: 'Semanal',
                monthly: 'Mensual',
                annually: 'Anual',
            },
            method: {
                label: 'Método de Exportación',
                description: 'Selecciona cómo quieres recibir tus reportes.',
                email: 'Correo',
                download: 'Descargar',
                altEmail: 'O enviar a un correo alternativo...',
                send: 'Enviar',
            },
            backup: {
                label: 'Copia de Seguridad en la Nube',
                description: 'Haz una copia de seguridad automática de tus datos en Google Drive.',
            },
            session: {
                label: 'Sesión y Datos',
                description: 'Cierra sesión o elimina permanentemente todos tus datos.',
                logout: 'Cerrar Sesión',
                delete: 'Eliminar Datos',
            }
        }
    },
     // Add Event Dialog
    addEventDialog: {
        title: 'Registrar un Nuevo Toque',
        description: 'Completa los detalles de tu evento. Las ganancias se calcularán automáticamente.',
    },
    // Add Event Form
    addEventForm: {
        venue: 'Lugar',
        selectVenue: 'Selecciona un lugar frecuente',
        otherVenue: 'Otro...',
        venueName: 'Nombre del Lugar',
        venueNamePlaceholder: 'Ej. The Roxy',
        eventType: 'Tipo de Evento',
        eventTypePlaceholder: 'Selecciona el tipo de evento',
        date: 'Fecha',
        pickDate: 'Elige una fecha',
        startTime: 'Hora de Inicio (Opcional)',
        endTime: 'Hora de Fin (Opcional)',
        advanceNIO: 'Adelanto (C$)',
        advanceUSD: 'Adelanto ($)',
        consumptionsNIO: 'Consumos (C$)',
        consumptionsUSD: 'Consumos ($)',
        notes: 'Notas (Opcional)',
        notesPlaceholder: 'Ej. equipo proporcionado, solicitudes especiales...',
        logEvent: 'Registrar Evento',
        toast: {
            title: '¡Evento Añadido!',
            description: '{venueName} el {date} ha sido registrado.',
        }
    },
    // Edit Event Dialog
    editEventDialog: {
        title: 'Editar Toque',
        description: 'Actualiza los detalles de tu evento.',
    },
    // Edit Event Form
    editEventForm: {
        earnings: 'Ganancias Totales ($)',
        save: 'Guardar Cambios',
        toast: {
            title: '¡Evento Actualizado!',
            description: '{venueName} el {date} ha sido actualizado.',
        }
    },
    // Columns
    columns: {
        date: 'Fecha',
        venue: 'Lugar',
        type: 'Tipo',
        hours: 'Horas',
        needsInfo: 'Falta Info',
        earnings: 'Ganancias',
        actions: 'Acciones',
        editEvent: 'Editar Evento',
        deleteEvent: 'Eliminar Evento',
    },
    // Data Table
    dataTable: {
        noResults: 'No hay resultados.',
    },
    // Reports Table
    reportsTable: {
        date: 'Fecha',
        venue: 'Lugar',
        schedule: 'Horario',
        totalPay: 'Pago Total ($)',
        totalHours: 'Total de Horas',
        advanceUSD: 'Adelanto ($)',
        advanceNIO: 'Adelanto (C$)',
        consumptionsUSD: 'Consumos ($)',
        consumptionsNIO: 'Consumos (C$)',
        pendingUSD: 'Pendiente ($)',
        pendingNIO: 'Pendiente (C$)',
        noEvents: 'No hay eventos para este período.',
        totals: 'Totales',
    },
    // Send Report Dialog
    sendReportDialog: {
        buttonText: 'Enviar Reporte',
        title: 'Enviar Reporte por Correo',
        description: 'Ingresa tu dirección de correo para recibir una copia del reporte en PDF.',
        emailLabel: 'Dirección de Correo',
        sending: 'Enviando...',
        send: 'Enviar',
        toast: {
            success: {
                title: '¡Reporte Enviado!',
                description: 'El reporte ha sido enviado a {email}.',
            },
            error: {
                title: 'Error',
                description: 'No se pudo enviar el reporte. Por favor, inténtalo de nuevo.',
            }
        }
    },
    // View Report Dialog
    viewReportDialog: {
        description: 'Una vista previa de tu reporte generado.',
        print: 'Imprimir',
    },
    // Add Venue Dialog
    addVenueDialog: {
        buttonText: 'Añadir Lugar',
        title: 'Añadir un Nuevo Lugar Frecuente',
        description: 'Esto facilitará el registro de nuevos toques en el futuro.',
    },
    // Add Venue Form
    addVenueForm: {
        venueName: 'Nombre del Lugar',
        venueNamePlaceholder: 'Ej., The Roxy',
        category: 'Categoría',
        categoryPlaceholder: 'Selecciona una categoría',
        addVenue: 'Añadir Lugar',
        toast: {
            title: '¡Lugar Añadido!',
            description: '{venueName} ha sido añadido a tus lugares frecuentes.',
        }
    },
    // Venue List
    venueList: {
        venueName: 'Nombre del Lugar',
        category: 'Categoría',
        actions: 'Acciones',
    }
};
