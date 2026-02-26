// Estado global
let currentView = 'dashboard';
let allSubmissions = [];
let filteredSubmissions = [];
let formConfig = {};
let adminSettings = {
    admins: [{ user: 'Michael9', pass: '8093f67972f0995f32924375f492a8326a575218d601567302f8361099f66453' }],
    submissionsEnabled: true,
    actionLog: []
};

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    // Cargar datos globales si existen
    if (window.GLOBAL_DATA) {
        if (window.GLOBAL_DATA.adminConfig) {
            adminSettings.admins = window.GLOBAL_DATA.adminConfig.admins || adminSettings.admins;
        }
        if (window.GLOBAL_DATA.formConfig) {
            formConfig = window.GLOBAL_DATA.formConfig;
        }
    }
    await checkAuthentication();
    setupEventListeners();
});

/**
 * Verifica la autenticación
 */
async function checkAuthentication() {
    const isAuthenticated = sessionStorage.getItem('adminAuthenticated') === 'true';
    if (isAuthenticated) {
        showAdminPanel();
        await loadData();
    } else {
        showLoginScreen();
    }
}

/**
 * Muestra la pantalla de login
 */
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
}

/**
 * Muestra el panel administrativo
 */
function showAdminPanel() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Búsqueda y filtros
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    const filterCongregacion = document.getElementById('filterCongregacion');
    if (filterCongregacion) {
        filterCongregacion.addEventListener('change', handleFilter);
    }
}

/**
 * Maneja el login
 */
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    // CREDENCIALES MAESTRAS (HARDCODED PARA ASEGURAR ACCESO)
    if (username === 'Michael9' && password === 'Precursores.2026') {
        sessionStorage.setItem('adminAuthenticated', 'true');
        sessionStorage.setItem('adminUser', username);
        setCurrentAdminUser(username);
        showAdminPanel();
        await loadData();
        return;
    }

    // Si no es la maestra, verificar contra GLOBAL_DATA o localStorage
    const hashedInput = await hashString(password);
    let authenticated = false;
    
    if (window.GLOBAL_DATA && window.GLOBAL_DATA.adminConfig) {
        const globalMatch = (window.GLOBAL_DATA.adminConfig.admins || []).find(a => a.user === username && a.pass === hashedInput);
        if (globalMatch) authenticated = true;
    }
    
    if (!authenticated) {
        await ensureAdminsStructure();
        const localMatch = (adminSettings.admins || []).find(a => a.user === username && a.pass === hashedInput);
        if (localMatch) authenticated = true;
    }

    if (authenticated) {
        sessionStorage.setItem('adminAuthenticated', 'true');
        sessionStorage.setItem('adminUser', username);
        setCurrentAdminUser(username);
        showAdminPanel();
        await loadData();
    } else {
        showNotification('Usuario o contraseña incorrectos', 'error');
        const pwdEl = document.getElementById('password');
        if (pwdEl) pwdEl.value = '';
    }
}

/**
 * Cierra la sesión
 */
function logout() {
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminUser');
    setCurrentAdminUser('');
    showLoginScreen();
    document.getElementById('loginForm').reset();
}

/**
 * Carga todos los datos
 */
async function loadData() {
    loadSubmissions();
    loadFormConfig();
    updateDashboard();
    await loadAdminSettings();
    applyGlobalData();
}

/**
 * Aplica los datos del archivo form-data.js si existen
 */
function applyGlobalData() {
    if (window.GLOBAL_DATA) {
        // Mezclar registros globales con locales
        if (window.GLOBAL_DATA.submissions && window.GLOBAL_DATA.submissions.length > 0) {
            const localIds = new Set(allSubmissions.map(s => s.id));
            const globalSubmissions = window.GLOBAL_DATA.submissions.filter(s => !localIds.has(s.id));
            if (globalSubmissions.length > 0) {
                allSubmissions = [...allSubmissions, ...globalSubmissions];
                filteredSubmissions = [...allSubmissions];
                updateDashboard();
            }
        }
    }
}

/**
 * Carga los registros
 */
function loadSubmissions() {
    try {
        const localData = localStorage.getItem('precursorSubmissions');
        let localSubmissions = localData ? JSON.parse(localData) : [];
        
        // Cargar globales
        let globalSubmissions = (window.GLOBAL_DATA && window.GLOBAL_DATA.submissions) || [];
        
        // Mezclar evitando duplicados por ID
        const all = [...globalSubmissions];
        const globalIds = new Set(globalSubmissions.map(s => s.id));
        
        localSubmissions.forEach(s => {
            if (!globalIds.has(s.id)) {
                all.push(s);
            }
        });
        
        allSubmissions = all;
        filteredSubmissions = [...allSubmissions];
        
        updateSubmissionCount();
        updateCongregacionFilter();
    } catch (error) {
        console.error('Error al cargar registros:', error);
        showNotification('Error al cargar los datos', 'error');
    }
}

/**
 * Carga la configuración del formulario
 */
function loadFormConfig() {
    try {
        // 1. Cargar desde GLOBAL_DATA
        if (window.GLOBAL_DATA && window.GLOBAL_DATA.formConfig) {
            formConfig = window.GLOBAL_DATA.formConfig;
            return;
        }
        
        // 2. Cargar local
        const config = localStorage.getItem('formConfig');
        formConfig = config ? JSON.parse(config) : { congregaciones: [] };
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        formConfig = { congregaciones: [] };
    }
}

async function loadAdminSettings() {
    try {
        const data = localStorage.getItem('adminSettings');
        if (data) {
            adminSettings = JSON.parse(data);
        } else {
            // Hash default password if not hashed
            const hashed = await hashString(adminSettings.admins[0].pass);
            adminSettings.admins[0].pass = hashed;
            localStorage.setItem('adminSettings', JSON.stringify(adminSettings));
        }
        // Initialize UI
        const toggle = document.getElementById('toggleSubmissions');
        if (toggle) toggle.checked = !!adminSettings.submissionsEnabled;
        await ensureAdminsStructure();
        renderActionLog();
        // populate site content inputs if present
        const titleEl = document.getElementById('siteHeroTitle');
        const subEl = document.getElementById('siteHeroSubtitle');
        if (adminSettings.siteConfig) {
            if (titleEl) titleEl.value = adminSettings.siteConfig.heroTitle || '';
            if (subEl) subEl.value = adminSettings.siteConfig.heroSubtitle || '';
        }
        // populate export fields UI
        ensureExportFields();
        renderExportFields();
        // set current user display if session active
        const cur = sessionStorage.getItem('adminUser');
        if (cur) setCurrentAdminUser(cur);
    } catch (e) {
        console.error('Error cargando adminSettings', e);
    }
}

async function saveSiteContent() {
    const titleEl = document.getElementById('siteHeroTitle');
    const subEl = document.getElementById('siteHeroSubtitle');
    if (!titleEl || !subEl) return;
    adminSettings.siteConfig = adminSettings.siteConfig || {};
    adminSettings.siteConfig.heroTitle = titleEl.value.trim();
    adminSettings.siteConfig.heroSubtitle = subEl.value.trim();
    saveAdminSettings();
    showNotification('Contenido del sitio guardado', 'success');
    logAction('Contenido del sitio actualizado por administrador');
}

async function saveAppearance() {
    const colorEl = document.getElementById('sitePrimaryColor');
    const heightEl = document.getElementById('siteHeroHeight');
    adminSettings.siteConfig = adminSettings.siteConfig || {};
    if (colorEl) adminSettings.siteConfig.primary = colorEl.value;
    if (heightEl) adminSettings.siteConfig.heroHeight = heightEl.value;
    saveAdminSettings();
    applySiteAppearance();
    showNotification('Apariencia aplicada', 'success');
    logAction('Apariencia del sitio actualizada');
}

function resetAppearance() {
    if (!confirm('Restaurar apariencia a valores predeterminados?')) return;
    adminSettings.siteConfig = adminSettings.siteConfig || {};
    adminSettings.siteConfig.primary = '';
    adminSettings.siteConfig.heroHeight = '';
    saveAdminSettings();
    applySiteAppearance();
    const colorEl = document.getElementById('sitePrimaryColor');
    const heightEl = document.getElementById('siteHeroHeight');
    if (colorEl) colorEl.value = '#6B2D5C';
    if (heightEl) heightEl.value = '60';
    showNotification('Apariencia restaurada', 'success');
    logAction('Apariencia restaurada a predeterminado');
}

function applySiteAppearance() {
    try {
        const cfg = adminSettings.siteConfig || {};
        if (cfg.primary) document.documentElement.style.setProperty('--primary', cfg.primary);
        const hero = cfg.heroHeight || '60';
        const heroEl = document.querySelector('.hero-section');
        if (heroEl) heroEl.style.minHeight = hero + 'vh';
    } catch (e) {
        console.warn('No se pudo aplicar apariencia', e);
    }
}

// Export fields definitions and helpers
const EXPORT_FIELD_DEFS = [
    { key: 'congregacion', label: 'Congregación' },
    { key: 'nombres', label: 'Nombres' },
    { key: 'apellidoPaterno', label: 'Apellido Paterno' },
    { key: 'apellidoMaterno', label: 'Apellido Materno' },
    { key: 'apellidoEsposo', label: 'Apellido Esposo(a)' },
    { key: 'email', label: 'Email' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'asistira', label: 'Asistirá' },
    { key: 'alojamiento', label: 'Alojamiento' },
    { key: 'motivo', label: 'Motivo' },
    { key: 'fechaLegible', label: 'Fecha' }
];

function ensureExportFields() {
    adminSettings.exportFields = adminSettings.exportFields || EXPORT_FIELD_DEFS.map(f => f.key);
    saveAdminSettings();
}

function renderExportFields() {
    const container = document.getElementById('exportFieldsContainer');
    if (!container) return;
    const selected = adminSettings.exportFields || [];
    container.innerHTML = EXPORT_FIELD_DEFS.map(f => `
        <label style="display:flex; align-items:center; gap:0.5rem; padding:6px; background:var(--bg-white); border-radius:8px; border:1px solid #f1f1f1;">
            <input type="checkbox" data-field="${f.key}" ${selected.includes(f.key) ? 'checked' : ''}>
            <span style="font-weight:600;">${escapeHtml(f.label)}</span>
        </label>
    `).join('');
}

function selectAllExportFields(val) {
    adminSettings.exportFields = val ? EXPORT_FIELD_DEFS.map(f => f.key) : [];
    saveAdminSettings();
    renderExportFields();
}

function saveExportFields() {
    const container = document.getElementById('exportFieldsContainer');
    if (!container) return;
    const checks = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    adminSettings.exportFields = checks.filter(c => c.checked).map(c => c.getAttribute('data-field'));
    saveAdminSettings();
    showNotification('Campos de exportación guardados', 'success');
    logAction('Campos de exportación actualizados');
}

function resetExportFields() {
    if (!confirm('Restaurar campos de exportación a predeterminado?')) return;
    adminSettings.exportFields = EXPORT_FIELD_DEFS.map(f => f.key);
    saveAdminSettings();
    renderExportFields();
    showNotification('Campos restaurados', 'success');
    logAction('Campos de exportación restaurados a predeterminado');
}

function resetSiteContent() {
    if (!confirm('Restaurar título y subtítulo del sitio a valores predeterminados?')) return;
    adminSettings.siteConfig = { heroTitle: '', heroSubtitle: '' };
    saveAdminSettings();
    const titleEl = document.getElementById('siteHeroTitle');
    const subEl = document.getElementById('siteHeroSubtitle');
    if (titleEl) titleEl.value = '';
    if (subEl) subEl.value = '';
    showNotification('Contenido restaurado', 'success');
    logAction('Contenido del sitio restaurado a predeterminado');
}

async function ensureAdminsStructure() {
    if (!adminSettings.admins || adminSettings.admins.length === 0) {
        const hashed = await hashString('Precursores.2026');
        adminSettings.admins = [{ user: 'Michael9', pass: hashed }];
        saveAdminSettings();
    }
    // Si hay más de uno, nos quedamos solo con el primero por la nueva política de un solo admin
    if (adminSettings.admins.length > 1) {
        adminSettings.admins = [adminSettings.admins[0]];
        saveAdminSettings();
    }

    let changed = false;
    if (!isHashed(adminSettings.admins[0].pass)) {
        adminSettings.admins[0].pass = await hashString(adminSettings.admins[0].pass);
        changed = true;
    }
    if (changed) saveAdminSettings();
}

function isHashed(str) {
    return /^[0-9a-f]{64}$/i.test(str);
}

async function hashString(str) {
    if (!str) return '';
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function setCurrentAdminUser(username) {
    const el = document.getElementById('currentAdminUser');
    if (el) el.textContent = `Conectado: ${username}`;
}

function saveAdminSettings() {
    try {
        localStorage.setItem('adminSettings', JSON.stringify(adminSettings));
    } catch (e) {
        console.error('Error guardando adminSettings', e);
    }
}

function logAction(text) {
    const entry = { ts: new Date().toISOString(), text };
    adminSettings.actionLog = adminSettings.actionLog || [];
    adminSettings.actionLog.unshift(entry);
    // keep recent 200
    if (adminSettings.actionLog.length > 200) adminSettings.actionLog.length = 200;
    saveAdminSettings();
    renderActionLog();
}

function renderActionLog() {
    const container = document.getElementById('actionLog');
    if (!container) return;
    const list = adminSettings.actionLog || [];
    container.innerHTML = list.map(l => `<div style="padding:6px 0;border-bottom:1px solid #f1f1f1;"><strong style="color:var(--text-medium);font-size:0.9rem">${new Date(l.ts).toLocaleString()}</strong><div style="font-size:0.95rem;">${escapeHtml(l.text)}</div></div>`).join('');
}

function downloadActionLog() {
    const data = JSON.stringify(adminSettings.actionLog || [], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registro_acciones_${getDateString()}.json`;
    link.click();
}

function clearActionLog() {
    if (!confirm('¿Limpiar el registro de acciones?')) return;
    adminSettings.actionLog = [];
    saveAdminSettings();
    renderActionLog();
    showNotification('Registro de acciones limpiado', 'success');
    logAction('Registro de acciones limpiado por administrador');
}

/**
 * Actualiza el contador de registros en el menú
 */
function updateSubmissionCount() {
    const badge = document.getElementById('submissionCount');
    if (badge) {
        badge.textContent = allSubmissions.length;
    }
}

/**
 * Actualiza el filtro de congregaciones
 */
function updateCongregacionFilter() {
    const filter = document.getElementById('filterCongregacion');
    if (!filter) return;
    
    // Obtener congregaciones únicas
    const congregaciones = [...new Set(allSubmissions.map(s => s.congregacion))].sort();
    
    // Limpiar opciones excepto la primera
    while (filter.options.length > 1) {
        filter.remove(1);
    }
    
    // Agregar opciones
    congregaciones.forEach(cong => {
        const option = document.createElement('option');
        option.value = cong;
        option.textContent = cong;
        filter.appendChild(option);
    });
}

/**
 * Muestra una vista específica
 */
function showView(viewName) {
    // Ocultar todas las vistas
    document.querySelectorAll('.admin-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // Desactivar todos los botones de navegación
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar la vista seleccionada
    const views = {
        'dashboard': 'dashboardView',
        'submissions': 'submissionsView',
        'formBuilder': 'formBuilderView',
        'export': 'exportView',
        'settings': 'settingsView',
        'sync': 'syncView'
    };
    
    const viewId = views[viewName];
    if (viewId) {
        document.getElementById(viewId).classList.remove('hidden');
        
        // Activar botón de navegación correspondiente
        const navBtn = document.getElementById('nav' + viewName.charAt(0).toUpperCase() + viewName.slice(1));
        if (navBtn) {
            navBtn.classList.add('active');
        }
        
        // Acciones específicas por vista
        if (viewName === 'dashboard') {
            updateDashboard();
        } else if (viewName === 'submissions') {
            renderSubmissions();
        } else if (viewName === 'formBuilder') {
            renderFormBuilder();
        } else if (viewName === 'settings') {
            loadAdminSettings();
        } else if (viewName === 'sync') {
            loadSyncSettings();
        }
        
        currentView = viewName;
    }
}

/**
 * Carga los ajustes de sincronización
 */
function loadSyncSettings() {
    const token = localStorage.getItem('ghToken') || '';
    const repo = localStorage.getItem('ghRepo') || '';
    
    const tokenEl = document.getElementById('ghToken');
    const repoEl = document.getElementById('ghRepo');
    
    if (tokenEl) tokenEl.value = token;
    if (repoEl) repoEl.value = repo;
}

/**
 * Guarda los ajustes de sincronización
 */
function saveSyncSettings() {
    const token = document.getElementById('ghToken').value.trim();
    const repo = document.getElementById('ghRepo').value.trim();
    
    localStorage.setItem('ghToken', token);
    localStorage.setItem('ghRepo', repo);
    
    showNotification('Ajustes de sincronización guardados', 'success');
}

/**
 * Genera el código para el archivo form-data.js
 */
function generateGlobalCode() {
    const data = {
        formConfig: formConfig,
        siteConfig: adminSettings.siteConfig || {},
        adminConfig: { admins: adminSettings.admins },
        submissions: allSubmissions
    };
    
    const code = `/**
 * ARCHIVO DE CONFIGURACIÓN GLOBAL Y DATOS
 * Este archivo actúa como la "Base de Datos" central del sitio.
 */

window.GLOBAL_DATA = ${JSON.stringify(data, null, 4)};`;

    // Crear un modal para mostrar el código
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
    
    modal.innerHTML = `
        <div style="background:white;width:100%;max-width:800px;padding:30px;border-radius:20px;max-height:90vh;display:flex;flex-direction:column;">
            <h2 style="margin-bottom:1rem;">Código para form-data.js</h2>
            <p style="margin-bottom:1rem;color:var(--text-medium);">Copia todo este código y reemplaza el contenido del archivo <code>form-data.js</code> en GitHub.</p>
            <textarea style="flex:1;width:100%;padding:1rem;font-family:monospace;font-size:0.85rem;border:1px solid #ddd;border-radius:10px;margin-bottom:1rem;" readonly>${code}</textarea>
            <div style="display:flex;gap:1rem;justify-content:flex-end;">
                <button class="secondary-button" onclick="this.closest('.modal').remove()">Cerrar</button>
                <button class="save-button" onclick="copyToClipboard(this)">Copiar Código</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

/**
 * Copia el contenido del textarea al portapapeles
 */
function copyToClipboard(btn) {
    const textarea = btn.closest('.modal').querySelector('textarea');
    textarea.select();
    document.execCommand('copy');
    
    const originalText = btn.textContent;
    btn.textContent = '¡Copiado!';
    setTimeout(() => btn.textContent = originalText, 2000);
}

/**
 * Importa datos pegados desde WhatsApp
 */
function importFromWhatsApp() {
    const text = document.getElementById('whatsappImport').value.trim();
    if (!text) {
        showNotification('El campo está vacío', 'error');
        return;
    }
    
    // Buscar el JSON en el mensaje (si el mensaje incluye el JSON)
    // O procesar el texto estructurado. Por ahora, asumiremos que el mensaje tiene un formato reconocible.
    // Una forma simple es que el mensaje incluya: "ID: [id]"
    
    // Intento de encontrar JSON si existe
    const jsonMatch = text.match(/\{.*\}/s);
    if (jsonMatch) {
        try {
            const data = JSON.parse(jsonMatch[0]);
            if (data.id) {
                addSubmissionIfNew(data);
                document.getElementById('whatsappImport').value = '';
                return;
            }
        } catch (e) {
            console.log('No es JSON puro, intentando parsear texto...');
        }
    }
    
    // Parseo manual de texto estructurado (formato que definiremos en script.js)
    try {
        const lines = text.split('\n');
        const data = {};
        
        lines.forEach(line => {
            if (line.includes('• *Congregación:*')) data.congregacion = line.split(':*')[1].trim();
            if (line.includes('• *Nombres:*')) data.nombres = line.split(':*')[1].trim();
            if (line.includes('• *Apellido Paterno:*')) data.apellidoPaterno = line.split(':*')[1].trim();
            if (line.includes('• *Apellido Materno:*')) data.apellidoMaterno = line.split(':*')[1].trim();
            if (line.includes('• *Email:*')) data.email = line.split(':*')[1].trim();
            if (line.includes('• *Teléfono:*')) data.telefono = line.split(':*')[1].trim();
            if (line.includes('• *Asistirá:*')) data.asistira = line.includes('SÍ') ? 'si' : 'no';
            if (line.includes('• *Alojamiento:*')) data.alojamiento = line.includes('SÍ') ? 'si' : 'no';
            if (line.includes('• *Motivo:*')) data.motivo = line.split(':*')[1].trim();
            if (line.includes('ID:')) data.id = line.split('ID:')[1].trim();
        });
        
        if (data.id && data.nombres) {
            if (!data.fecha) data.fecha = new Date().toISOString();
            if (!data.fechaLegible) data.fechaLegible = formatDate(new Date());
            addSubmissionIfNew(data);
            document.getElementById('whatsappImport').value = '';
        } else {
            showNotification('No se pudo reconocer el formato del mensaje', 'error');
        }
    } catch (e) {
        showNotification('Error al procesar el texto', 'error');
    }
}

/**
 * Agrega un registro si no existe por ID
 */
function addSubmissionIfNew(data) {
    const exists = allSubmissions.some(s => s.id === data.id);
    if (exists) {
        showNotification('Este registro ya existe', 'info');
        return;
    }
    
    allSubmissions.push(data);
    localStorage.setItem('precursorSubmissions', JSON.stringify(allSubmissions));
    loadData();
    showNotification('Registro importado con éxito', 'success');
}

/**
 * Actualiza el dashboard con estadísticas
 */
function updateDashboard() {
    const today = new Date().toDateString();
    const confirmados = allSubmissions.filter(s => s.asistira === 'si').length;
    const alojamiento = allSubmissions.filter(s => s.alojamiento === 'si').length;
    const hoy = allSubmissions.filter(s => new Date(s.fecha).toDateString() === today).length;
    
    document.getElementById('totalSubmissions').textContent = allSubmissions.length;
    document.getElementById('confirmados').textContent = confirmados;
    document.getElementById('alojamiento').textContent = alojamiento;
    document.getElementById('hoy').textContent = hoy;
    
    renderRecentSubmissions();
}

/**
 * Renderiza los registros recientes en el dashboard
 */
function renderRecentSubmissions() {
    const container = document.getElementById('recentSubmissions');
    if (!container) return;
    
    const recent = allSubmissions
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = '<p style="color: var(--text-medium); text-align: center; padding: 2rem;">No hay registros aún</p>';
        return;
    }
    
    container.innerHTML = recent.map(submission => `
        <div class="submission-item" onclick="showDetail('${submission.id}')">
            <div class="submission-header">
                <div class="submission-name">${escapeHtml(submission.nombres)} ${escapeHtml(submission.apellidoPaterno)}</div>
                <div class="submission-date">${submission.fechaLegible}</div>
            </div>
            <div class="submission-info">
                <div class="info-item">
                    <span class="info-label">Congregación:</span>
                    <span class="info-value">${escapeHtml(submission.congregacion)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Asistencia:</span>
                    <span class="info-value">${submission.asistira === 'si' ? '✅ Confirmada' : '❌ No asistirá'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Renderiza la lista completa de registros
 */
function renderSubmissions() {
    const container = document.getElementById('submissionsList');
    if (!container) return;
    
    if (filteredSubmissions.length === 0) {
        container.innerHTML = '<div class="empty-state">No se encontraron registros que coincidan con la búsqueda</div>';
        return;
    }
    
    const tableHtml = `
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Precursor</th>
                        <th>Congregación</th>
                        <th>Contacto</th>
                        <th>Asistencia</th>
                        <th>Alojamiento</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredSubmissions
                        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                        .map(submission => `
                        <tr>
                            <td>
                                <div class="td-name">${escapeHtml(submission.nombres)} ${escapeHtml(submission.apellidoPaterno)}</div>
                                <div class="td-sub">${submission.fechaLegible}</div>
                            </td>
                            <td><span class="badge-cong">${escapeHtml(submission.congregacion)}</span></td>
                            <td>
                                <div class="td-info">📧 ${escapeHtml(submission.email)}</div>
                                <div class="td-info">📱 ${escapeHtml(submission.telefono)}</div>
                            </td>
                            <td>
                                <span class="status-badge ${submission.asistira === 'si' ? 'status-yes' : 'status-no'}">
                                    ${submission.asistira === 'si' ? '✅ Confirmado' : '❌ No'}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge ${submission.alojamiento === 'si' ? 'status-yes' : 'status-no'}">
                                    ${submission.alojamiento === 'si' ? '🏠 Sí' : '🏠 No'}
                                </span>
                            </td>
                            <td>
                                <div class="td-actions">
                                    <button class="icon-btn" title="Ver Detalle" onclick="showDetail('${submission.id}')">👁️</button>
                                    <button class="icon-btn" title="Editar" onclick="editSubmission('${submission.id}')">✏️</button>
                                    <button class="icon-btn whatsapp" title="WhatsApp" onclick="sendWhatsApp('${submission.telefono}', '${escapeHtml(submission.nombres)}', '${submission.id}')">💬</button>
                                    <button class="icon-btn delete" title="Eliminar" onclick="deleteSubmission('${submission.id}')">🗑️</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHtml;
}

/**
 * Maneja la búsqueda
 */
function handleSearch(event) {
    handleFilter();
}

/**
 * Maneja todos los filtros combinados
 */
function handleFilter() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const congFilter = document.getElementById('filterCongregacion').value;
    const asistFilter = document.getElementById('filterAsistencia').value;
    
    filteredSubmissions = allSubmissions.filter(submission => {
        // Filtro de búsqueda
        const matchesSearch = submission.nombres.toLowerCase().includes(searchTerm) ||
                             submission.apellidoPaterno.toLowerCase().includes(searchTerm) ||
                             submission.email.toLowerCase().includes(searchTerm) ||
                             submission.congregacion.toLowerCase().includes(searchTerm);
                             
        // Filtro de congregación
        const matchesCong = congFilter === 'all' || submission.congregacion === congFilter;
        
        // Filtro de asistencia
        const matchesAsist = asistFilter === 'all' || submission.asistira === asistFilter;
        
        return matchesSearch && matchesCong && matchesAsist;
    });
    
    renderSubmissions();
}

/**
 * Muestra el detalle de un registro
 */
function showDetail(id) {
    const submission = allSubmissions.find(s => s.id === id);
    if (!submission) return;
    
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
        <h2>${escapeHtml(submission.nombres)} ${escapeHtml(submission.apellidoPaterno)} ${escapeHtml(submission.apellidoMaterno)}</h2>
        
        <div class="detail-section">
            <h3>Información Personal</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Nombre Completo</div>
                    <div class="detail-value">${escapeHtml(submission.nombres)} ${escapeHtml(submission.apellidoPaterno)} ${escapeHtml(submission.apellidoMaterno)}</div>
                </div>
                ${submission.apellidoEsposo ? `
                    <div class="detail-item">
                        <div class="detail-label">Apellidos del Esposo(a)</div>
                        <div class="detail-value">${escapeHtml(submission.apellidoEsposo)}</div>
                    </div>
                ` : ''}
                <div class="detail-item">
                    <div class="detail-label">Congregación</div>
                    <div class="detail-value">${escapeHtml(submission.congregacion)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Correo Electrónico</div>
                    <div class="detail-value">${escapeHtml(submission.email)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Teléfono</div>
                    <div class="detail-value">${escapeHtml(submission.telefono)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Fecha de Registro</div>
                    <div class="detail-value">${submission.fechaLegible}</div>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Confirmación de Asistencia</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">¿Asistirá a la Escuela?</div>
                    <div class="detail-value">${submission.asistira === 'si' ? '✅ Sí' : '❌ No'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">¿Solicita Alojamiento?</div>
                    <div class="detail-value">${submission.alojamiento === 'si' ? '✅ Sí' : '❌ No'}</div>
                </div>
                ${submission.motivo ? `
                    <div class="detail-item">
                        <div class="detail-label">Motivo (si no puede asistir)</div>
                        <div class="detail-value">${escapeHtml(submission.motivo)}</div>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="submission-actions" style="margin-top: 2rem;">
            <button class="action-button" onclick="editSubmission('${submission.id}'); closeModal();">
                ✏️ Editar Registro
            </button>
            <button class="action-button whatsapp" onclick="sendWhatsApp('${submission.telefono}', '${escapeHtml(submission.nombres)}', '${submission.id}')">
                💬 Enviar WhatsApp
            </button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

/**
 * Cierra el modal de detalle
 */
function closeModal() {
    document.getElementById('detailModal').classList.add('hidden');
}

/**
 * Muestra el modal de edición
 */
function editSubmission(id) {
    const submission = allSubmissions.find(s => s.id === id);
    if (!submission) return;
    
    const modal = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');
    
    // Cargar congregaciones para el select
    let congregacionOptions = '<option value="">Elegir</option>';
    if (formConfig.congregaciones) {
        formConfig.congregaciones.forEach(cong => {
            const selected = cong === submission.congregacion ? 'selected' : '';
            congregacionOptions += `<option value="${escapeHtml(cong)}" ${selected}>${escapeHtml(cong)}</option>`;
        });
    }
    
    content.innerHTML = `
        <h2>Editar Registro</h2>
        <form id="editForm" onsubmit="saveEdit(event, '${submission.id}')">
            <div style="display: grid; gap: 1.5rem;">
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Congregación</label>
                    <select name="congregacion" required class="field-input">${congregacionOptions}</select>
                </div>
                
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Nombres</label>
                    <input type="text" name="nombres" value="${escapeHtml(submission.nombres)}" required class="field-input">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Apellido Paterno</label>
                        <input type="text" name="apellidoPaterno" value="${escapeHtml(submission.apellidoPaterno)}" required class="field-input">
                    </div>
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Apellido Materno</label>
                        <input type="text" name="apellidoMaterno" value="${escapeHtml(submission.apellidoMaterno)}" required class="field-input">
                    </div>
                </div>
                
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Apellidos del Esposo(a)</label>
                    <input type="text" name="apellidoEsposo" value="${escapeHtml(submission.apellidoEsposo || '')}" class="field-input">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Email</label>
                        <input type="email" name="email" value="${escapeHtml(submission.email)}" required class="field-input">
                    </div>
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Teléfono</label>
                        <input type="tel" name="telefono" value="${escapeHtml(submission.telefono)}" required class="field-input">
                    </div>
                </div>
                
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">¿Asistirá?</label>
                    <div style="display: flex; gap: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="radio" name="asistira" value="si" ${submission.asistira === 'si' ? 'checked' : ''} required>
                            <span>Sí</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="radio" name="asistira" value="no" ${submission.asistira === 'no' ? 'checked' : ''} required>
                            <span>No</span>
                        </label>
                    </div>
                </div>
                
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">¿Solicita Alojamiento?</label>
                    <div style="display: flex; gap: 1rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="radio" name="alojamiento" value="si" ${submission.alojamiento === 'si' ? 'checked' : ''} required>
                            <span>Sí</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="radio" name="alojamiento" value="no" ${submission.alojamiento === 'no' ? 'checked' : ''} required>
                            <span>No</span>
                        </label>
                    </div>
                </div>
                
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Motivo (si no puede asistir)</label>
                    <textarea name="motivo" rows="3" class="field-input textarea-input">${escapeHtml(submission.motivo || '')}</textarea>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                    <button type="button" onclick="closeEditModal()" class="secondary-button">Cancelar</button>
                    <button type="submit" class="save-button">Guardar Cambios</button>
                </div>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
}

/**
 * Guarda los cambios de edición
 */
function saveEdit(event, id) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const index = allSubmissions.findIndex(s => s.id === id);
    if (index === -1) return;
    
    // Actualizar el registro
    allSubmissions[index] = {
        ...allSubmissions[index],
        congregacion: formData.get('congregacion'),
        nombres: formData.get('nombres'),
        apellidoPaterno: formData.get('apellidoPaterno'),
        apellidoMaterno: formData.get('apellidoMaterno'),
        apellidoEsposo: formData.get('apellidoEsposo'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        asistira: formData.get('asistira'),
        alojamiento: formData.get('alojamiento'),
        motivo: formData.get('motivo')
    };
    
    // Guardar en localStorage
    localStorage.setItem('precursorSubmissions', JSON.stringify(allSubmissions));
    
    // Actualizar vistas
    loadData();
    renderSubmissions();
    closeEditModal();
    
    showNotification('Registro actualizado exitosamente', 'success');
}

/**
 * Cierra el modal de edición
 */
function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
}

/**
 * Elimina un registro
 */
function deleteSubmission(id) {
    if (!confirm('¿Está seguro de que desea eliminar este registro?')) {
        return;
    }
    
    allSubmissions = allSubmissions.filter(s => s.id !== id);
    filteredSubmissions = filteredSubmissions.filter(s => s.id !== id);
    
    localStorage.setItem('precursorSubmissions', JSON.stringify(allSubmissions));
    
    loadData();
    renderSubmissions();
    
    showNotification('Registro eliminado exitosamente', 'success');
    logAction(`Registro eliminado: ${id}`);
}

function clearAllSubmissions() {
    if (!confirm('¿Eliminar TODOS los registros? Esta acción es irreversible.')) return;
    localStorage.removeItem('precursorSubmissions');
    allSubmissions = [];
    filteredSubmissions = [];
    loadData();
    renderSubmissions();
    showNotification('Todos los registros han sido eliminados', 'success');
    logAction('Todos los registros eliminados por administrador');
}

function exportAllBackup() {
    if (allSubmissions.length === 0) {
        showNotification('No hay datos para exportar', 'error');
        return;
    }
    // Forzar export siempre en Excel
    downloadExcel();
    logAction('Backup Excel exportado por administrador');
}

function importSubmissions(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error('Formato inválido');
            // Merge or overwrite? Here ask to overwrite
            if (!confirm('¿Sobrescribir todos los registros con el archivo importado?')) return;
            localStorage.setItem('precursorSubmissions', JSON.stringify(data));
            loadData();
            renderSubmissions();
            showNotification('Importación finalizada', 'success');
            logAction('Registros importados desde JSON por administrador');
        } catch (err) {
            console.error(err);
            showNotification('Archivo inválido', 'error');
        }
    };
    reader.readAsText(file);
    // reset input
    event.target.value = '';
}

function toggleSubmissionsEnabled() {
    const el = document.getElementById('toggleSubmissions');
    adminSettings.submissionsEnabled = !!el.checked;
    saveAdminSettings();
    showNotification(`Nuevos registros ${adminSettings.submissionsEnabled ? 'habilitados' : 'deshabilitados'}`, 'info');
    logAction(`Nuevos registros ${adminSettings.submissionsEnabled ? 'habilitados' : 'deshabilitados'}`);
}

async function updateAdminCredentials() {
    const currentUser = sessionStorage.getItem('adminUser') || '';
    const currentPassEl = document.getElementById('currentAdminPass');
    const userEl = document.getElementById('newAdminUser');
    const passEl = document.getElementById('newAdminPass');
    const confirmEl = document.getElementById('confirmAdminPass');
    if (!currentUser || !currentPassEl || !userEl || !passEl || !confirmEl) {
        showNotification('Debe iniciar sesión para cambiar sus credenciales', 'error');
        return;
    }
    const currentPass = currentPassEl.value.trim();
    const user = userEl.value.trim();
    const newPass = passEl.value.trim();
    const confirmPass = confirmEl.value.trim();
    if (!currentPass || !user || !newPass || !confirmPass) {
        showNotification('Complete todos los campos de credenciales', 'error');
        return;
    }
    if (newPass !== confirmPass) {
        showNotification('La nueva contraseña y su confirmación no coinciden', 'error');
        return;
    }
    if (newPass.length < 8) {
        showNotification('La nueva contraseña debe tener al menos 8 caracteres', 'error');
        return;
    }
    await ensureAdminsStructure();
    const hashedCurrent = await hashString(currentPass);
    const admins = adminSettings.admins || [];
    const index = admins.findIndex(a => a.user === currentUser && a.pass === hashedCurrent);
    if (index === -1) {
        showNotification('La contraseña actual no es válida', 'error');
        return;
    }
    if (admins.some((a, i) => i !== index && a.user === user)) {
        showNotification('Ya existe un administrador con ese usuario', 'error');
        return;
    }
    const hashedNew = await hashString(newPass);
    admins[index].user = user;
    admins[index].pass = hashedNew;
    adminSettings.admins = admins;
    saveAdminSettings();
    sessionStorage.setItem('adminUser', user);
    setCurrentAdminUser(user);
    currentPassEl.value = '';
    userEl.value = '';
    passEl.value = '';
    confirmEl.value = '';
    showNotification('Credenciales actualizadas', 'success');
    logAction('Credenciales actualizadas para el administrador');
}

async function resetAdminCredentials() {
    if (!confirm('¿Restaurar credenciales a valores predeterminados?')) return;
    const currentUser = sessionStorage.getItem('adminUser') || '';
    const currentPassEl = document.getElementById('currentAdminPass');
    if (!currentUser || !currentPassEl) {
        showNotification('Debe iniciar sesión para realizar esta acción', 'error');
        return;
    }
    const currentPass = currentPassEl.value.trim();
    if (!currentPass) {
        showNotification('Ingrese la contraseña actual para confirmar', 'error');
        return;
    }
    await ensureAdminsStructure();
    const hashedCurrent = await hashString(currentPass);
    const admins = adminSettings.admins || [];
    const index = admins.findIndex(a => a.user === currentUser && a.pass === hashedCurrent);
    if (index === -1) {
        showNotification('La contraseña actual no es válida', 'error');
        return;
    }
    const hashedDefault = await hashString('Precursores.2026');
    adminSettings.admins = [{ user: 'Michael9', pass: hashedDefault }];
    saveAdminSettings();
    sessionStorage.setItem('adminUser', 'Michael9');
    setCurrentAdminUser('Michael9');
    currentPassEl.value = '';
    showNotification('Credenciales restauradas', 'success');
    logAction('Credenciales restauradas a predeterminado');
}

function importFromFileInput() {
    const input = document.getElementById('importInput');
    if (input) input.click();
}

/**
 * Renderiza el constructor de formularios
 */
function renderFormBuilder() {
    const container = document.getElementById('congregacionOptions');
    if (!container) return;
    
    const congregaciones = formConfig.congregaciones || [];
    
    container.innerHTML = congregaciones.map((cong, index) => `
        <div class="option-item">
            <input type="text" value="${escapeHtml(cong)}" onchange="updateCongregacionOption(${index}, this.value)" class="field-input">
            <button onclick="removeCongregacionOption(${index})" style="padding: 0.75rem 1rem; background: var(--error); color: white; border: none; border-radius: 8px; cursor: pointer;">
                🗑️ Eliminar
            </button>
        </div>
    `).join('');
}

/**
 * Agrega una nueva opción de congregación
 */
function addCongregacionOption() {
    if (!formConfig.congregaciones) {
        formConfig.congregaciones = [];
    }
    
    formConfig.congregaciones.push('Nueva Congregación');
    renderFormBuilder();
}

/**
 * Actualiza una opción de congregación
 */
function updateCongregacionOption(index, value) {
    if (formConfig.congregaciones && formConfig.congregaciones[index] !== undefined) {
        formConfig.congregaciones[index] = value;
    }
}

/**
 * Elimina una opción de congregación
 */
function removeCongregacionOption(index) {
    if (confirm('¿Eliminar esta congregación?')) {
        formConfig.congregaciones.splice(index, 1);
        renderFormBuilder();
    }
}

/**
 * Guarda la configuración del formulario
 */
function saveFormConfig() {
    localStorage.setItem('formConfig', JSON.stringify(formConfig));
    showNotification('Configuración guardada exitosamente', 'success');
}

/**
 * Restaura la configuración predeterminada
 */
function resetFormConfig() {
    if (!confirm('¿Restaurar la configuración predeterminada?')) {
        return;
    }
    
    formConfig = {
        congregaciones: [
            'Congregación Central',
            'Congregación Norte',
            'Congregación Sur',
            'Congregación Este',
            'Congregación Oeste',
            'Otra congregación'
        ]
    };
    
    localStorage.setItem('formConfig', JSON.stringify(formConfig));
    renderFormBuilder();
    showNotification('Configuración restaurada', 'success');
}

/**
 * Abre WhatsApp con mensaje detallado que incluye todos los datos del usuario
 */
function sendWhatsApp(phone, name, id) {
    const submission = allSubmissions.find(s => s.id === id) || {};
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Construir mensaje detallado
    let message = `*CONSULTA ESCUELA DE PRECURSORES*\n\n`;
    message += `Hola *${name}*, te contactamos desde la administración de la Escuela del Servicio de Precursor.\n\n`;
    message += `Tenemos los siguientes datos de tu registro:\n`;
    message += `• *Congregación:* ${submission.congregacion || '-'}\n`;
    message += `• *Email:* ${submission.email || '-'}\n`;
    message += `• *Asistirá:* ${submission.asistira === 'si' ? 'SÍ ✅' : 'NO ❌'}\n`;
    message += `• *Alojamiento:* ${submission.alojamiento === 'si' ? 'SÍ 🏠' : 'NO'}\n`;
    
    if (submission.motivo) {
        message += `• *Motivo indicado:* ${submission.motivo}\n`;
    }
    
    message += `\nQuisiéramos consultarte lo siguiente: `;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

/**
 * Descarga en formato Excel (Versión Mejorada)
 */
function downloadExcel() {
    if (allSubmissions.length === 0) {
        showNotification('No hay datos para exportar', 'error');
        return;
    }
    
    try {
        const selected = (adminSettings.exportFields && adminSettings.exportFields.length) ? adminSettings.exportFields : EXPORT_FIELD_DEFS.map(f => f.key);
        const fields = EXPORT_FIELD_DEFS.filter(f => selected.includes(f.key));

        // Crear el contenido HTML con estilos embebidos para Excel
        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Registros Precursores</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    .table-header {
                        background-color: #6B2D5C;
                        color: #ffffff;
                        font-weight: bold;
                        text-align: center;
                        border: 1px solid #4a1e3f;
                        height: 40px;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    }
                    .cell-data {
                        border: 1px solid #e0e0e0;
                        padding: 10px;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        font-size: 11pt;
                    }
                    .title {
                        font-size: 18pt;
                        font-weight: bold;
                        color: #6B2D5C;
                        text-align: center;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    }
                    .subtitle {
                        font-size: 12pt;
                        color: #666666;
                        text-align: center;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin-bottom: 20px;
                    }
                    .stat-row {
                        background-color: #f9f9f9;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <table>
                    <tr><td colspan="${fields.length}" class="title">ESCUELA DEL SERVICIO DE PRECURSOR</td></tr>
                    <tr><td colspan="${fields.length}" class="subtitle">Reporte de Registros - Generado el ${new Date().toLocaleString('es-PE')}</td></tr>
                    <tr><td colspan="${fields.length}"></td></tr>
                    <thead>
                        <tr>
                            ${fields.map(f => `<th class="table-header">${f.label}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        allSubmissions.forEach((s, idx) => {
            const rowClass = idx % 2 === 0 ? '' : 'style="background-color: #fcf6fa;"';
            html += `<tr ${rowClass}>`;
            fields.forEach(f => {
                let val = s[f.key];
                if (f.key === 'asistira' || f.key === 'alojamiento') {
                    val = val === 'si' ? 'SÍ' : (val === 'no' ? 'NO' : '-');
                }
                if (f.key === 'fechaLegible') {
                    val = s.fechaLegible || '';
                }
                // Escapar caracteres especiales para Excel
                const displayVal = val ? val.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
                html += `<td class="cell-data">${displayVal}</td>`;
            });
            html += '</tr>';
        });

        // Añadir fila de resumen al final
        html += `
                    <tr><td colspan="${fields.length}"></td></tr>
                    <tr class="stat-row">
                        <td colspan="${fields.length}" class="cell-data" style="text-align: right;">
                            Total de Registros: ${allSubmissions.length} | 
                            Confirmados: ${allSubmissions.filter(s => s.asistira === 'si').length} | 
                            Alojamiento: ${allSubmissions.filter(s => s.alojamiento === 'si').length}
                        </td>
                    </tr>
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Reporte_Precursores_${getDateString()}.xls`;
        link.click();
        
        showNotification('Reporte Excel generado correctamente', 'success');
        logAction('Reporte Excel detallado exportado');
    } catch (error) {
        console.error('Error al generar Excel:', error);
        showNotification('Error al generar el reporte', 'error');
    }
}

// Eliminar funciones de exportación obsoletas
function downloadPDF() { showNotification('Función deshabilitada. Use Excel.', 'info'); }
function downloadJSON() { showNotification('Función deshabilitada. Use Excel.', 'info'); }

/**
 * Muestra una notificación
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
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
        font-weight: 600;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Obtiene una cadena de fecha para nombres de archivo
 */
function getDateString() {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
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

