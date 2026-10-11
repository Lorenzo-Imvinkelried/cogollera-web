// =============================================================================
// CONFIGURACIÓN DE SUPABASE (PROYECTO COGOLLERA)
// =============================================================================
const DEFAULT_SUPABASE_URL = "https://pqydjwpjclfnwfrzpsvb.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_jGjzJtPJeXKfqIwatNmRIA_oqSGTYRZ";

let supabaseClient = null;
let ultimaFecha = null;
let historial = [];

const tempValue = document.getElementById('tempValue');
const tempSub = document.getElementById('tempSub');
const counterValue = document.getElementById('counterValue');
const lastSyncTime = document.getElementById('lastSyncTime');
const syncDiff = document.getElementById('syncDiff');
const historyBody = document.getElementById('historyBody');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');

// Función central: actualiza las métricas y la tabla
function actualizarDatos(temp, contador, fecha = new Date()) {
  ultimaFecha = fecha;

  // Actualizar tarjeta temperatura
  const tempNum = Number(temp);
  tempValue.innerText = `${tempNum.toFixed(1)} °C`;
  const tempF = (tempNum * 9/5 + 32).toFixed(1);
  tempSub.innerText = `Equivale a ${tempF} °F`;

  // Color dinámico según temperatura
  if (tempNum > 55) tempValue.style.color = '#ef4444';
  else if (tempNum > 45) tempValue.style.color = '#f59e0b';
  else tempValue.style.color = '#38bdf8';

  // Actualizar contador
  counterValue.innerText = `#${contador}`;

  // Hora y estados
  const horaStr = fecha.toLocaleTimeString();
  lastSyncTime.innerText = horaStr;
  syncDiff.innerText = 'Recién actualizado';

  statusText.innerText = 'Conectado - Recibiendo datos';
  statusDot.style.background = '#22c55e';
  statusDot.style.boxShadow = '0 0 10px #22c55e';

  // Agregar a historial
  agregarHistorial(horaStr, tempNum, contador);
}

function agregarHistorial(hora, temp, contador) {
  historial.unshift({ hora, temp, contador });
  if (historial.length > 8) historial.pop();

  historyBody.innerHTML = historial.map((item, idx) => `
    <tr class="${idx === 0 ? 'new-row' : ''}">
      <td>${item.hora}</td>
      <td><b>${item.temp.toFixed(1)} °C</b></td>
      <td>#${item.contador}</td>
      <td><span style="color: #22c55e; font-weight: 500;">● Recibido</span></td>
    </tr>
  `).join('');
}

// Cronómetro relativo "Hace X segundos"
setInterval(() => {
  if (!ultimaFecha) return;
  const seg = Math.floor((new Date() - ultimaFecha) / 1000);
  if (seg === 0) syncDiff.innerText = 'Recién actualizado';
  else syncDiff.innerText = `Hace ${seg} segundo${seg > 1 ? 's' : ''}`;
}, 1000);

// Botón de prueba simulada (Inserta directamente en Supabase si está conectado)
let contadorPrueba = 1;
async function simularEnvio() {
  const tempSim = Number((35.5 + Math.random() * 5).toFixed(1));
  const cont = contadorPrueba++;

  if (supabaseClient) {
    console.log('Insertando simulación en Supabase...', { tempSim, cont });
    const { error } = await supabaseClient
      .from('mediciones')
      .insert([{ temperatura: tempSim, contador: cont }]);

    if (error) {
      console.error('Error insertando en Supabase:', error);
      alert('Error al insertar en Supabase: ' + error.message);
    }
  } else {
    // Si no está conectado a Supabase, actualiza solo en local
    actualizarDatos(tempSim, cont);
  }
}

// =========================================================================
// CONEXIÓN CON SUPABASE REALTIME
// =========================================================================
function conectarSupabase(urlManual, keyManual) {
  const url = urlManual || (document.getElementById('sbUrl') ? document.getElementById('sbUrl').value.trim() : '') || DEFAULT_SUPABASE_URL;
  const key = keyManual || (document.getElementById('sbKey') ? document.getElementById('sbKey').value.trim() : '') || DEFAULT_SUPABASE_KEY;

  if (!url || !key) {
    console.warn('Credenciales de Supabase no disponibles.');
    return;
  }

  try {
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);

    supabaseClient = supabase.createClient(url, key);
    const sbStatus = document.getElementById('sbStatus');
    if (sbStatus) {
      sbStatus.innerText = '🟢 Conectado a Realtime';
      sbStatus.style.color = '#22c55e';
    }

    // Escuchar inserciones en vivo en la tabla "mediciones"
    supabaseClient
      .channel('mediciones_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mediciones' }, payload => {
        console.log('Nuevo registro recibido desde Supabase:', payload.new);
        const data = payload.new;
        actualizarDatos(data.temperatura, data.contador, new Date(data.created_at || Date.now()));
      })
      .subscribe(status => {
        console.log('Estado canal Supabase Realtime:', status);
      });

    // Cargar última medición existente al conectar
    supabaseClient
      .from('mediciones')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const ult = data[0];
          actualizarDatos(ult.temperatura, ult.contador, new Date(ult.created_at || Date.now()));
          contadorPrueba = (Number(ult.contador) || 0) + 1;
        }
      });

  } catch (err) {
    console.error('Error al conectar con Supabase:', err);
    const sbStatus = document.getElementById('sbStatus');
    if (sbStatus) {
      sbStatus.innerText = '🔴 Error de conexión';
      sbStatus.style.color = '#ef4444';
    }
  }
}

// Conexión automática al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  const url = localStorage.getItem('sb_url') || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem('sb_key') || DEFAULT_SUPABASE_KEY;

  const urlInput = document.getElementById('sbUrl');
  const keyInput = document.getElementById('sbKey');

  if (urlInput) urlInput.value = url;
  if (keyInput) keyInput.value = key;

  conectarSupabase(url, key);
});
