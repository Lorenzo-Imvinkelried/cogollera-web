// =============================================================================
// APP.JS - DASHBOARD EN TIEMPO REAL: TRAMPA INTELIGENTE COGOLLERA
// =============================================================================

// Credenciales públicas de Supabase
const SUPABASE_URL = "https://pqydjwpjclfnwfrzpsvb.supabase.co";
const SUPABASE_KEY = "sb_publishable_jGjzJtPJeXKfqIwatNmRIA_oqSGTYRZ";

// Inicializar cliente Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Elementos del DOM
const elBadgeConexion       = document.getElementById('connectionBadge');
const elBtnRefresh          = document.getElementById('btnRefresh');
const elTotalCogolleras     = document.getElementById('kpiTotalCogolleras');
const elUltimoIncremento    = document.getElementById('kpiUltimoIncremento');
const elUltimaHora          = document.getElementById('kpiUltimaHora');
const elUltimaFecha         = document.getElementById('kpiUltimaFecha');
const elTemperatura         = document.getElementById('kpiTemperatura');
const elEstadoHaz           = document.getElementById('kpiEstadoHaz');
const elUltimosSensores     = document.getElementById('kpiUltimosSensores');
const elTotalRegistros      = document.getElementById('lblTotalRegistros');
const elTablaBody           = document.getElementById('tablaBody');

// Formatear fechas
function formatearFechaHora(isoString) {
    if (!isoString) return { fecha: '--/--/--', hora: '--:--:--' };
    const d = new Date(isoString);
    return {
        fecha: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
}

// Cargar datos históricos y actualizar la interfaz
async function cargarDatos() {
    try {
        const { data, error } = await supabaseClient
            .from('mediciones')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Conexión exitosa
        elBadgeConexion.className = 'badge badge-connected';
        elBadgeConexion.innerHTML = '<span class="dot"></span> En Vivo (Supabase)';

        if (!data || data.length === 0) {
            elTablaBody.innerHTML = '<tr><td colspan="6" class="text-center loading-row">No hay registros aún en Supabase. Esperando detecciones del ESP32...</td></tr>';
            elTotalRegistros.textContent = '0 registros';
            return;
        }

        // Actualizar KPIs con el registro más reciente
        const masReciente = data[0];
        const { fecha, hora } = formatearFechaHora(masReciente.created_at);

        elUltimaHora.textContent = hora;
        elUltimaFecha.textContent = fecha;
        elTemperatura.textContent = masReciente.temperatura ? `${masReciente.temperatura} °C` : '-- °C';

        if (masReciente.sensor1 !== null && masReciente.sensor2 !== null) {
            elUltimosSensores.textContent = `Haz 1: ${masReciente.sensor1} | Haz 2: ${masReciente.sensor2}`;
        }

        // Contar el total de capturas reales de cogollera
        // Si el ESP32 manda contador acumulado en masReciente.contador, usamos el más alto
        let maxContador = 0;
        let totalCapturas = 0;

        data.forEach(item => {
            if (item.contador && item.contador > maxContador) {
                maxContador = item.contador;
            }
            if (item.tipo_evento === 'captura_cogollera') {
                totalCapturas++;
            }
        });

        const valorTotal = maxContador > 0 ? maxContador : totalCapturas;
        elTotalCogolleras.textContent = valorTotal;
        elUltimoIncremento.textContent = `Último registro: ${hora}`;
        elTotalRegistros.textContent = `${data.length} registros cargados`;

        // Renderizar tabla
        renderizarTabla(data);

    } catch (err) {
        console.error('Error al cargar mediciones:', err);
        elBadgeConexion.className = 'badge badge-connecting';
        elBadgeConexion.innerHTML = '<span class="dot"></span> Error de conexión';
        elTablaBody.innerHTML = `<tr><td colspan="6" class="text-center loading-row" style="color: #ef4444;">Error al consultar Supabase: ${err.message}.<br>¿Ejecutaste el script supabase_setup.sql en el panel de Supabase?</td></tr>`;
    }
}

// Renderizar filas de la tabla
function renderizarTabla(registros) {
    elTablaBody.innerHTML = '';

    registros.forEach(item => {
        const { fecha, hora } = formatearFechaHora(item.created_at);
        const tr = document.createElement('tr');

        const esCaptura = item.tipo_evento === 'captura_cogollera';
        const badgeClass = esCaptura ? 'badge-cogollera' : 'badge-latido';
        const badgeText  = esCaptura ? '🦗 Cogollera Detectada' : '📡 Latido Online';

        tr.innerHTML = `
            <td><strong>${hora}</strong> <span style="color: #64748b; font-size: 0.8rem;">${fecha}</span></td>
            <td><span class="event-badge ${badgeClass}">${badgeText}</span></td>
            <td><strong>#${item.contador || 0}</strong></td>
            <td>${item.temperatura ? item.temperatura + ' °C' : '--'}</td>
            <td>${item.sensor1 !== null && item.sensor1 !== undefined ? item.sensor1 : '--'}</td>
            <td>${item.sensor2 !== null && item.sensor2 !== undefined ? item.sensor2 : '--'}</td>
        `;
        elTablaBody.appendChild(tr);
    });
}

// Suscribirse a eventos en tiempo real con Supabase Realtime
function suscribirTiempoReal() {
    supabaseClient
        .channel('cambios-mediciones')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'mediciones' },
            (payload) => {
                console.log('¡Nuevo registro en tiempo real recibido!', payload.new);
                // Efecto visual rápido
                document.body.style.transition = 'background-color 0.3s';
                document.body.style.backgroundColor = '#132822';
                setTimeout(() => {
                    document.body.style.backgroundColor = 'var(--bg-primary)';
                }, 400);

                // Recargar datos
                cargarDatos();
            }
        )
        .subscribe();
}

// Event Listeners
elBtnRefresh.addEventListener('click', () => {
    cargarDatos();
});

// Inicio
cargarDatos();
suscribirTiempoReal();

