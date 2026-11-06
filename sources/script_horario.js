// ======================================================================
// SISTEMA DE GESTIÓN DE HORARIOS ACADÉMICOS - UCLA
// ======================================================================

const value_m = ["", "1", "2", "3", "4", "5", "6"];
const value_t = ["", "1", "2", "3", "4", "5"];
const value_n = ["", "1", "2", "3", "4", "5"];

const texto_m = ["N/A", "7:25-8:10", "8:10-8:55", "9:00-9:45", "9:45-10:35", "10:35-11:20", "11:20-12:05"];
const texto_t = ["N/A", "12:40-1:20", "1:20-2:00", "2:00-2:40", "2:45-3:25", "3:25-4:05"];
const texto_n = ["N/A", "5:00-5:40", "5:40-6:20", "6:20-7:00", "7:05-7:45", "7:45-8:25"];

const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

const eventos = {
    m: Array(7).fill().map(() => Array(6).fill(null)),
    t: Array(6).fill().map(() => Array(6).fill(null)),
    n: Array(6).fill().map(() => Array(6).fill(null))
};

const STORAGE_KEY = 'ucla_horario_eventos_v1';

function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function guardarEventos() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(eventos)); } catch (e) { }
}

function cargarEventos() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        let hay = false;
        ['m', 't', 'n'].forEach(t => {
            if (!Array.isArray(data[t])) return;
            data[t].forEach((fila, b) => {
                if (!Array.isArray(fila) || !eventos[t][b]) return;
                fila.forEach((ev, d) => {
                    if (!ev || d > 5) return;
                    const entrada = parseInt(ev.entrada), salida = parseInt(ev.salida);
                    if (isNaN(entrada) || isNaN(salida)) return;
                    eventos[t][b][d] = {
                        materia: String(ev.materia ?? ''), profesor: String(ev.profesor ?? 'N/A'),
                        salon: String(ev.salon ?? 'N/A'), seccion: String(ev.seccion ?? ''),
                        entrada, salida
                    };
                    hay = true;
                });
            });
        });
        return hay;
    } catch (e) { return false; }
}

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('check_m')) {
        document.querySelectorAll('#check_m, #check_t, #check_n').forEach(checkbox => {
            checkbox.addEventListener('change', mostrar_turnos);
        });

        document.getElementById('turno').addEventListener('change', cambia_turnos);

        document.querySelectorAll('#check_m, #check_t, #check_n').forEach(checkbox => {
            checkbox.checked = true;
        });
        mostrar_turnos();
        cambia_turnos();

        if (cargarEventos()) ['m', 't', 'n'].forEach(actualizarTablaTurno);
    }

    if (document.getElementById('schedule-content')) {
        loadGeneratedSchedule();
    }
});

function mostrar_turnos() {
    document.getElementById('hidden_m').hidden = !document.getElementById('check_m').checked;
    document.getElementById('hidden_t').hidden = !document.getElementById('check_t').checked;
    document.getElementById('hidden_n').hidden = !document.getElementById('check_n').checked;
}

function volverIndex() {
    window.location.href = "index.html";
}

function cambia_turnos() {
    const turno = document.getElementById('turno').value;
    const hora_entrada = document.getElementById('hora_entrada');
    const hora_salida = document.getElementById('hora_salida');

    hora_entrada.innerHTML = '';
    hora_salida.innerHTML = '';

    if (turno) {
        let value_arr, texto_arr;
        switch (turno) {
            case 'm': value_arr = value_m; texto_arr = texto_m; break;
            case 't': value_arr = value_t; texto_arr = texto_t; break;
            case 'n': value_arr = value_n; texto_arr = texto_n; break;
        }

        for (let i = 0; i < value_arr.length; i++) {
            const option1 = document.createElement('option');
            option1.value = value_arr[i]; option1.text = texto_arr[i];
            hora_entrada.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = value_arr[i]; option2.text = texto_arr[i];
            hora_salida.appendChild(option2);
        }
    } else {
        const option1 = document.createElement('option');
        option1.value = ''; option1.text = 'N/A';
        hora_entrada.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = ''; option2.text = 'N/A';
        hora_salida.appendChild(option2);
    }
}

function registrar() {
    const materia = document.getElementById('materia').value.trim();
    const seccion = document.getElementById('seccion').value.trim();
    const dia = parseInt(document.getElementById('dia').value);
    const profesor = document.getElementById('prof_nom').value.trim();
    const salon = document.getElementById('salon_num').value.trim();
    const turno = document.getElementById('turno').value;
    const entrada = parseInt(document.getElementById('hora_entrada').value);
    const salida = parseInt(document.getElementById('hora_salida').value);

    if (!turno) { alert('Por favor seleccione un turno'); return; }
    if (isNaN(dia) || dia < 1 || dia > 6) { alert('Por favor seleccione un día válido'); return; }
    if (isNaN(entrada) || isNaN(salida) || entrada < 1 || salida < 1) { alert('Por favor seleccione horas válidas'); return; }
    if (entrada > salida) { alert('La hora de entrada no puede ser posterior a la hora de salida'); return; }
    if (materia === '') { alert('Por favor ingrese el nombre de la materia'); return; }

    const diaIndex = dia - 1;
    let conflicto = false;
    for (let bloque = entrada; bloque <= salida; bloque++) {
        if (eventos[turno][bloque] && eventos[turno][bloque][diaIndex]) {
            conflicto = true; break;
        }
    }

    if (conflicto) { alert('Conflicto de horario: Uno o más bloques ya están ocupados'); return; }

    const evento = { materia, profesor: profesor || 'N/A', salon: salon || 'N/A', seccion, entrada, salida };

    for (let bloque = entrada; bloque <= salida; bloque++) {
        if (!eventos[turno][bloque]) eventos[turno][bloque] = Array(6).fill(null);
        eventos[turno][bloque][diaIndex] = evento;
    }

    actualizarTablaTurno(turno);
    guardarEventos();
    limpiarFormulario();
}

function actualizarTablaTurno(turno) {
    const tbody = document.getElementById(`turno_${turno}`);
    tbody.innerHTML = '';

    let numBloques, horas;
    switch (turno) {
        case 'm': numBloques = 6; horas = texto_m.slice(1); break;
        case 't': numBloques = 5; horas = texto_t.slice(1); break;
        case 'n': numBloques = 5; horas = texto_n.slice(1); break;
    }

    for (let bloque = 1; bloque <= numBloques; bloque++) {
        const tr = document.createElement('tr');
        tr.id = `${bloque}${turno}`;

        const horaTd = document.createElement('td');
        horaTd.className = 'hora-col';
        horaTd.textContent = horas[bloque - 1];
        tr.appendChild(horaTd);

        for (let dia = 0; dia < 6; dia++) {
            const evento = eventos[turno][bloque] ? eventos[turno][bloque][dia] : null;

            if (evento && evento.entrada === bloque) {
                const duracion = evento.salida - evento.entrada + 1;
                const td = document.createElement('td');
                if (duracion > 1) td.rowSpan = duracion;
                td.className = 'filled-cell';
                td.innerHTML = `
                    <div>
                        <div class="event-title">${esc(evento.materia)}</div>
                        <div>Sección: ${esc(evento.seccion)}</div>
                        <div>Prof: ${esc(evento.profesor)}</div>
                        <div>Salón: ${esc(evento.salon)}</div>
                    </div>`;
                tr.appendChild(td);
            } else if (!evento) {
                tr.appendChild(document.createElement('td'));
            }
        }
        tbody.appendChild(tr);
    }
}

function limpiarFormulario() {
    document.getElementById('materia').value = '';
    document.getElementById('prof_nom').value = '';
    document.getElementById('salon_num').value = '';
    document.getElementById('seccion').value = '';
    document.getElementById('hora_entrada').value = '';
    document.getElementById('hora_salida').value = '';
    document.getElementById('dia').value = '';
    document.getElementById('turno').value = '';
}

function GenerateScheduleContent() {
    let scheduleColor = document.getElementById("color_personalizado").value;
    const colorOscuro = ajustarBrillo(scheduleColor, -40);

    let hasEvents = false;
    for (const turno in eventos) {
        for (const bloque of eventos[turno]) {
            if (bloque && bloque.some(evento => evento !== null)) {
                hasEvents = true; break;
            }
        }
        if (hasEvents) break;
    }

    if (!hasEvents) { alert('No hay eventos registrados para generar el horario'); return; }

    const turnosVisibles = [];
    if (document.getElementById('check_m').checked) turnosVisibles.push('m');
    if (document.getElementById('check_t').checked) turnosVisibles.push('t');
    if (document.getElementById('check_n').checked) turnosVisibles.push('n');

    let scheduleHTML = '<div class="tables-container">';

    turnosVisibles.forEach(turno => {
        const turnoNombre = turno === 'm' ? 'Mañana' : turno === 't' ? 'Tarde' : 'Noche';
        const turnoId = turno === 'm' ? 'm' : turno === 't' ? 't' : 'n';

        scheduleHTML += `
            <div class="turno-section">
                <div class="turno-header">Turno de ${turnoNombre}</div>
                <table id="${turnoId}">
                    <thead>
                        <tr>
                            <th>Bloque</th>
                            <th>Lunes</th>
                            <th>Martes</th>
                            <th>Miércoles</th>
                            <th>Jueves</th>
                            <th>Viernes</th>
                            <th>Sábado</th>
                        </tr>
                    </thead>
                    <tbody>`;

        const numBloques = turno === 'm' ? 6 : 5;
        const horas = turno === 'm' ? texto_m.slice(1) : turno === 't' ? texto_t.slice(1) : texto_n.slice(1);

        for (let bloque = 1; bloque <= numBloques; bloque++) {
            scheduleHTML += `<tr><td class="hora-col">${horas[bloque - 1]}</td>`;

            for (let dia = 0; dia < 6; dia++) {
                const evento = eventos[turno][bloque] ? eventos[turno][bloque][dia] : null;

                if (evento && evento.entrada === bloque) {
                    const duracion = evento.salida - evento.entrada + 1;
                    scheduleHTML += `<td class="filled-cell"${duracion > 1 ? ` rowspan="${duracion}"` : ''}>
                        <div>
                            <div class="event-title">${esc(evento.materia)}</div>
                            <div>Prof: ${esc(evento.profesor)}</div>
                            <div>Salón: ${esc(evento.salon)}</div>
                        </div>
                    </td>`;
                } else if (!evento) {
                    scheduleHTML += `<td></td>`;
                }
            }
            scheduleHTML += `</tr>`;
        }
        scheduleHTML += `</tbody></table></div>`;
    });
    scheduleHTML += '</div>';

    sessionStorage.setItem('scheduleContent', scheduleHTML);
    sessionStorage.setItem('scheduleColor', scheduleColor);
    sessionStorage.setItem('scheduleNewColor', colorOscuro);
    sessionStorage.setItem('generationDate', new Date().toLocaleString('es-VE'));
    document.getElementById('color_personalizado').value = getComputedStyle(document.body).getPropertyValue('--ucla');

    window.location.href = 'horario_generado.html';
}

function loadGeneratedSchedule() {
    const scheduleContent = sessionStorage.getItem('scheduleContent');
    const generationDate = sessionStorage.getItem('generationDate');
    const scheduleColor = sessionStorage.getItem("scheduleColor");
    const scheduleNewColor = sessionStorage.getItem("scheduleNewColor");

    if (scheduleColor) {
        document.body.style.setProperty('--ucla', scheduleColor);
        document.body.style.setProperty('--ucla-gradient', scheduleNewColor);
    }
    if (scheduleContent) {
        document.getElementById('schedule-content').innerHTML = scheduleContent;
        if (generationDate) {
            document.getElementById('generation-date').textContent = `Generado el: ${generationDate}`;
        }
    } else {
        document.getElementById('schedule-content').innerHTML = `
            <p style="text-align: center; color: #666;">
                No hay horario disponible. Por favor, regrese a la página de creación de horarios.
            </p>
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn" onclick="window.location.href='horario.html'">Crear Horario</button>
            </div>
        `;
    }
}

function ejecutar_limpieza() {
    const opcion = document.getElementById('opcion_limpiar').value;
    if (opcion === 'm' || opcion === 't' || opcion === 'n') {
        limpiar_turno(opcion);
    } else if (opcion === 'todo') {
        limpiar_tabla();
    } else {
        alert('Por favor, seleccione qué sección desea limpiar en la lista desplegable.');
    }
    document.getElementById('opcion_limpiar').value = '';
}

function limpiar_turno(turno) {
    const nombre = { m: 'mañana', t: 'tarde', n: 'noche' }[turno];
    if (!nombre) return;
    if (!confirm(`¿Limpiar todo el turno de ${nombre}?`)) return;
    eventos[turno] = Array(eventos[turno].length).fill().map(() => Array(6).fill(null));
    actualizarTablaTurno(turno);
    guardarEventos();
}

function limpiar_tabla() {
    if (!confirm('¿Borrar TODO el horario (mañana, tarde y noche)?')) return;
    ['m', 't', 'n'].forEach(t => {
        eventos[t] = Array(eventos[t].length).fill().map(() => Array(6).fill(null));
        actualizarTablaTurno(t);
    });
    guardarEventos();
}

function ajustarBrillo(hex, porcentaje) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.min(255, r + (r * porcentaje / 100)));
    g = Math.max(0, Math.min(255, g + (g * porcentaje / 100)));
    b = Math.max(0, Math.min(255, b + (b * porcentaje / 100)));
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function cargarHtml2Canvas() {
    return new Promise((resolve, reject) => {
        if (window.html2canvas) return resolve(window.html2canvas);
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        sc.onload = () => resolve(window.html2canvas);
        sc.onerror = () => reject(new Error('No se pudo cargar html2canvas (sin conexion?)'));
        document.head.appendChild(sc);
    });
}

async function descargarImagen() {
    const nodo = document.getElementById('schedule-content');
    const btn = document.getElementById('btn-descargar-img');
    const textoOriginal = btn.innerHTML;
    const previo = nodo.style.cssText;
    const pie = document.createElement('div');
    pie.style.cssText = 'text-align:center;font:12px sans-serif;color:#555;margin-top:12px;';
    pie.textContent = 'Horario NO OFICIAL - generado el ' + (sessionStorage.getItem('generationDate') || '');
    try {
        btn.disabled = true;
        btn.textContent = 'Generando...';
        const h2c = await cargarHtml2Canvas();
        nodo.style.padding = '24px';
        nodo.style.background = '#ffffff';
        nodo.appendChild(pie);
        const canvas = await h2c(nodo, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const file = new File([blob], 'mi_horario_ucla.png', { type: 'image/png' });
        const esMovil = window.matchMedia('(pointer: coarse)').matches;
        if (esMovil && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Mi horario UCLA' });
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = file.name;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        }
    } catch (e) {
        if (e && e.name !== 'AbortError') alert('No se pudo generar la imagen: ' + e.message);
    } finally {
        if (pie.parentNode) pie.remove();
        nodo.style.cssText = previo;
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}