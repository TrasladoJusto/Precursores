/**
 * ARCHIVO DE CONFIGURACIÓN GLOBAL Y DATOS
 * Este archivo actúa como la "Base de Datos" central del sitio.
 * Para que los cambios se reflejen en todos los dispositivos, 
 * el administrador debe actualizar este archivo en GitHub.
 */

window.GLOBAL_DATA = {
    // Configuración del Formulario (Congregaciones, preguntas, etc.)
    formConfig: {
        congregaciones: [
            'Congregación Central',
            'Congregación Norte',
            'Congregación Sur',
            'Congregación Este',
            'Congregación Oeste',
            'Otra congregación'
        ],
        submissionsEnabled: true
    },
    
    // Configuración del Sitio (Títulos, colores, etc.)
    siteConfig: {
        heroTitle: 'Escuela del Servicio de Precursor',
        heroSubtitle: 'Registro de Asistencia - 2026',
        primaryColor: '#6B2D5C',
        heroHeight: '60'
    },
    
    // Credenciales de Administrador (Michael9 / Precursores.2026)
    // La contraseña está hasheada (SHA-256)
    adminConfig: {
        admins: [
            { 
                user: 'Michael9', 
                pass: '8093f67972f0995f32924375f492a8326a575218d601567302f8361099f66453' 
            }
        ]
    },
    
    // Registros de Precursores (Se pueden incluir aquí para que sean globales)
    submissions: []
};
