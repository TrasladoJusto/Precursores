const DEFAULT_FORM_CONFIG = {
    congregaciones: [
        'Congregación Central',
        'Congregación Norte',
        'Congregación Sur',
        'Congregación Este',
        'Congregación Oeste',
        'Otra congregación'
    ]
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeFormConfig();
    setupFormListeners();
    setupProgressTracking();
});

/**
 * Inicializa la configuración del formulario
 */
function initializeFormConfig() {
    // 1. Intentar cargar desde GLOBAL_DATA (form-data.js) - Prioridad Alta
    if (window.GLOBAL_DATA) {
        if (window.GLOBAL_DATA.formConfig) {
            const config = window.GLOBAL_DATA.formConfig;
            loadCongregaciones(config.congregaciones);
            return; // Usar configuración global
        }
    }

    // 2. Cargar configuración guardada en localStorage o usar la por defecto
    let config = loadFormConfig();
    if (!config || !config.congregaciones || config.congregaciones.length === 0) {
        config = DEFAULT_FORM_CONFIG;
        saveFormConfig(config);
    }
    
    // Cargar opciones de congregación
    loadCongregaciones(config.congregaciones);
}

/**
 * Carga las opciones de congregación en el select
 */
function loadCongregaciones(congregaciones) {
    const select = document.getElementById('congregacion');
    
    // Limpiar opciones existentes excepto la primera
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Agregar cada congregación
    congregaciones.forEach(nombre => {
        const option = document.createElement('option');
        option.value = nombre;
        option.textContent = nombre;
        select.appendChild(option);
    });
}

/**
 * Carga la configuración del formulario desde localStorage
 */
function loadFormConfig() {
    try {
        const config = localStorage.getItem('formConfig');
        return config ? JSON.parse(config) : null;
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        return null;
    }
}

/**
 * Guarda la configuración del formulario
 */
function saveFormConfig(config) {
    try {
        localStorage.setItem('formConfig', JSON.stringify(config));
        return true;
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        return false;
    }
}

/**
 * Configura los event listeners del formulario
 */
function setupFormListeners() {
    const form = document.getElementById('precursorForm');
    
    // Envío del formulario
    form.addEventListener('submit', handleFormSubmit);
    
    // Mostrar/ocultar campo de motivo según asistencia
    const radioAsistencia = document.getElementsByName('asistira');
    radioAsistencia.forEach(radio => {
        radio.addEventListener('change', toggleMotivoField);
    });
    
    // Validación en tiempo real
    setupRealTimeValidation();
}

/**
 * Muestra u oculta el campo de motivo según la selección
 */
function toggleMotivoField() {
    const motivoContainer = document.getElementById('motivoNoAsistencia');
    const motivoInput = document.getElementById('motivo');
    const asistira = document.querySelector('input[name="asistira"]:checked');
    
    if (asistira && asistira.value === 'no') {
        motivoContainer.style.display = 'block';
        animateIn(motivoContainer);
    } else {
        motivoContainer.style.display = 'none';
        motivoInput.value = '';
    }
}

/**
 * Anima la entrada de un elemento
 */
function animateIn(element) {
    element.style.animation = 'fadeInUp 0.4s ease-out';
}

/**
 * Configura el seguimiento del progreso del formulario
 */
function setupProgressTracking() {
    const form = document.getElementById('precursorForm');
    const requiredFields = form.querySelectorAll('[required]');
    
    // Actualizar progreso al cambiar cualquier campo
    form.addEventListener('input', () => updateProgress(requiredFields));
    form.addEventListener('change', () => updateProgress(requiredFields));
    
    // Actualizar progreso inicial
    updateProgress(requiredFields);
}

/**
 * Actualiza la barra de progreso
 */
function updateProgress(requiredFields) {
    let filledFields = 0;
    
    requiredFields.forEach(field => {
        if (field.type === 'radio') {
            const radioGroup = document.getElementsByName(field.name);
            const isChecked = Array.from(radioGroup).some(radio => radio.checked);
            if (isChecked) filledFields++;
        } else if (field.value.trim() !== '') {
            filledFields++;
        }
    });
    
    // Calcular porcentaje (contando cada grupo de radio una vez)
    const uniqueFields = new Set();
    requiredFields.forEach(field => {
        if (field.type === 'radio') {
            uniqueFields.add(field.name);
        } else {
            uniqueFields.add(field.id);
        }
    });
    
    const totalFields = uniqueFields.size;
    const percentage = Math.round((filledFields / totalFields) * 100);
    
    // Actualizar UI
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    
    progressFill.style.width = percentage + '%';
    progressPercent.textContent = percentage + '%';
}

/**
 * Configura validación en tiempo real
 */
function setupRealTimeValidation() {
    // Email
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('blur', function() {
        validateEmail(this);
    });
    
    // Teléfono
    const telefonoInput = document.getElementById('telefono');
    telefonoInput.addEventListener('blur', function() {
        validatePhone(this);
    });
}

/**
 * Valida un campo de email
 */
function validateEmail(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (input.value && !emailRegex.test(input.value)) {
        showFieldError(input, 'Ingrese un correo electrónico válido');
        return false;
    } else {
        removeFieldError(input);
        return true;
    }
}

/**
 * Valida un campo de teléfono
 */
function validatePhone(input) {
    if (input.value && input.value.length < 7) {
        showFieldError(input, 'Ingrese un número de teléfono válido');
        return false;
    } else {
        removeFieldError(input);
        return true;
    }
}

/**
 * Muestra un error en un campo
 */
function showFieldError(field, message) {
    removeFieldError(field);
    
    field.style.borderColor = 'var(--error)';
    
    const errorSpan = document.createElement('span');
    errorSpan.className = 'field-error';
    errorSpan.textContent = message;
    errorSpan.style.cssText = `
        display: block;
        color: var(--error);
        font-size: 0.875rem;
        margin-top: 0.5rem;
        animation: fadeIn 0.3s ease-out;
    `;
    
    field.parentElement.appendChild(errorSpan);
}

/**
 * Elimina el error de un campo
 */
function removeFieldError(field) {
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    field.style.borderColor = '';
}

/**
 * Maneja el envío del formulario
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    // Check if submissions are enabled in admin settings
    try {
        const adminRaw = localStorage.getItem('adminSettings');
        if (adminRaw) {
            const adminSettings = JSON.parse(adminRaw);
            if (adminSettings.submissionsEnabled === false) {
                showNotification('Los registros están cerrados temporalmente.', 'error');
                return;
            }
        }
    } catch (e) {
        console.warn('No se pudo leer adminSettings', e);
    }

    // Obtener datos del formulario
    const formData = getFormData();
    
    // Validar campos requeridos
    if (!validateFormData(formData)) {
        showNotification('Por favor, complete todos los campos requeridos correctamente', 'error');
        return;
    }

    // Prevención de duplicados (verificar email o teléfono)
    const submissions = getSubmissions();
    const isDuplicate = submissions.some(s => 
        s.email.toLowerCase() === formData.email.toLowerCase() || 
        s.telefono.replace(/\D/g,'') === formData.telefono.replace(/\D/g,'')
    );

    if (isDuplicate) {
        showNotification('Ya existe un registro con este correo o teléfono.', 'error');
        return;
    }
    
    // Guardar registro localmente como backup
    saveSubmission(formData);
    
    // Abrir WhatsApp para enviar al administrador
    sendSubmissionToAdmin(formData);
    
    // Mostrar mensaje de éxito
    showSuccessMessage();
    
    // Resetear formulario
    document.getElementById('precursorForm').reset();
    updateProgress(document.querySelectorAll('[required]'));
}

/**
 * Envía los datos del formulario al administrador vía WhatsApp
 */
function sendSubmissionToAdmin(data) {
    // El número del administrador se puede configurar en GLOBAL_DATA o por defecto
    const adminPhone = (window.GLOBAL_DATA && window.GLOBAL_DATA.adminPhone) || '51900000000'; // REEMPLAZAR CON NÚMERO REAL
    
    let message = `*NUEVO REGISTRO: ESCUELA DE PRECURSORES*\n\n`;
    message += `• *Congregación:* ${data.congregacion}\n`;
    message += `• *Nombres:* ${data.nombres}\n`;
    message += `• *Apellido Paterno:* ${data.apellidoPaterno}\n`;
    message += `• *Apellido Materno:* ${data.apellidoMaterno}\n`;
    if (data.apellidoEsposo) message += `• *Esposo(a):* ${data.apellidoEsposo}\n`;
    message += `• *Email:* ${data.email}\n`;
    message += `• *Teléfono:* ${data.telefono}\n`;
    message += `• *Asistirá:* ${data.asistira === 'si' ? 'SÍ ✅' : 'NO ❌'}\n`;
    message += `• *Alojamiento:* ${data.alojamiento === 'si' ? 'SÍ 🏠' : 'NO'}\n`;
    if (data.motivo) message += `• *Motivo:* ${data.motivo}\n`;
    message += `\n*ID:* ${data.id}`;

    const url = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

/**
 * Obtiene los datos del formulario
 */
function getFormData() {
    const asistira = document.querySelector('input[name="asistira"]:checked');
    const alojamiento = document.querySelector('input[name="alojamiento"]:checked');
    
    return {
        id: generateId(),
        congregacion: document.getElementById('congregacion').value,
        nombres: document.getElementById('nombres').value.trim(),
        apellidoPaterno: document.getElementById('apellidoPaterno').value.trim(),
        apellidoMaterno: document.getElementById('apellidoMaterno').value.trim(),
        apellidoEsposo: document.getElementById('apellidoEsposo').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        asistira: asistira ? asistira.value : '',
        alojamiento: alojamiento ? alojamiento.value : '',
        motivo: document.getElementById('motivo').value.trim(),
        fecha: new Date().toISOString(),
        fechaLegible: formatDate(new Date())
    };
}

/**
 * Valida los datos del formulario
 */
function validateFormData(data) {
    // Validar campos requeridos
    if (!data.congregacion || !data.nombres || !data.apellidoPaterno || 
        !data.apellidoMaterno || !data.email || !data.telefono || 
        !data.asistira || !data.alojamiento) {
        return false;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return false;
    }
    
    // Validar teléfono
    if (data.telefono.length < 7) {
        return false;
    }
    
    return true;
}

/**
 * Guarda un registro en localStorage
 */
function saveSubmission(data) {
    try {
        let submissions = getSubmissions();
        submissions.push(data);
        localStorage.setItem('precursorSubmissions', JSON.stringify(submissions));
        console.log('Registro guardado:', data);
        return true;
    } catch (error) {
        console.error('Error al guardar:', error);
        return false;
    }
}

/**
 * Obtiene todos los registros guardados
 */
function getSubmissions() {
    try {
        const data = localStorage.getItem('precursorSubmissions');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error al obtener registros:', error);
        return [];
    }
}

/**
 * Muestra el mensaje de éxito
 */
function showSuccessMessage() {
    const form = document.getElementById('precursorForm');
    const successMessage = document.getElementById('successMessage');
    
    form.style.opacity = '0';
    form.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
        form.classList.add('hidden');
        successMessage.classList.remove('hidden');
        
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, 300);
}

/**
 * Resetea el formulario para un nuevo envío
 */
function resetForm() {
    const form = document.getElementById('precursorForm');
    const successMessage = document.getElementById('successMessage');
    
    successMessage.classList.add('hidden');
    form.classList.remove('hidden');
    
    setTimeout(() => {
        form.style.opacity = '1';
        form.style.transform = 'translateY(0)';
    }, 100);
    
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Muestra una notificación
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    const colors = {
        success: 'var(--success)',
        error: 'var(--error)',
        info: 'var(--info)'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: var(--shadow-xl);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 90%;
        font-weight: 600;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

/**
 * Genera un ID único
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Formatea una fecha
 */
function formatDate(date) {
    return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Agregar estilos de animación
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);
