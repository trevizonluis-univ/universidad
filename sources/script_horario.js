// ======================================================================
// SISTEMA DE GESTIÓN DE HORARIOS ACADÉMICOS - UCLA
// ======================================================================
// 
// Este código implementa un sistema completo para gestionar horarios de clases
// con tres turnos (mañana, tarde y noche). Incluye funcionalidades para:
// - Registrar materias en bloques horarios
// - Visualizar horarios en tablas interactivas
// - Detección de conflictos de horario
// - Impresión profesional del horario
// - Gestión de turnos y días de la semana
//
// Estructura principal:
// 1. Variables globales con configuración de horarios
// 2. Inicialización de eventos y UI
// 3. Funciones de gestión de horarios (registro, actualización)
// 4. Funciones de visualización (tablas dinámicas)
// 5. Utilidades (impresión, limpieza, navegación)
//
// Autor: Luis Trevizon (Ayuda de Deepseek)
// Versión: 1.0
// ======================================================================

// ==========================
// VARIABLES GLOBALES
// ==========================
// Arrays con valores y textos para los bloques horarios de cada turno:
// - value_*: Valores numéricos de bloques (1 = primer bloque)
// - texto_*: Rangos horarios reales (ej: "7:25-8:10")
const value_m = ["", "1", "2", "3", "4", "5", "6"];
const value_t = ["", "1", "2", "3", "4", "5"];
const value_n = ["", "1", "2", "3", "4", "5"];

const texto_m = ["N/A", "7:25-8:10", "8:10-8:55", "9:00-9:45", "9:45-10:35", "10:35-11:20", "11:25-12:05"];
const texto_t = ["N/A", "12:40-1:20", "1:20-2:00", "2:00-2:40", "2:45-3:25", "3:25-4:05"];
const texto_n = ["N/A", "5:00-5:40", "5:40-6:20", "6:20-7:00", "7:05-7:45", "7:45-8:25"];

// Días de la semana (lunes a sábado)
const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

// Estructura principal para almacenar todos los eventos:
// - 3 turnos (m=mañana, t=tarde, n=noche)
// - Por cada turno: matriz de [bloques x días]
// - Ej: eventos.m[3][2] = evento del bloque 3 (mañana) del miércoles
const eventos = {
    m: Array(7).fill().map(() => Array(6).fill(null)), // 7 bloques x 6 días
    t: Array(6).fill().map(() => Array(6).fill(null)), // 6 bloques x 6 días
    n: Array(6).fill().map(() => Array(6).fill(null))  // 6 bloques x 6 días
};

// ==========================
// INICIALIZACIÓN
// ==========================
// Configura los eventos iniciales al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    // Solo ejecutar en la página principal de creación de horarios
    if (document.getElementById('check_m')) {
        // Event listeners para checkboxes de turnos
        document.querySelectorAll('#check_m, #check_t, #check_n').forEach(checkbox => {
            checkbox.addEventListener('change', mostrar_turnos);
        });

        // Event listener para selector de turnos
        document.getElementById('turno').addEventListener('change', cambia_turnos);

        // Mostrar todos los turnos inicialmente (checkboxes activados por defecto)
        document.querySelectorAll('#check_m, #check_t, #check_n').forEach(checkbox => {
            checkbox.checked = true;
        });
        mostrar_turnos();

        // Inicializar selector de turnos
        cambia_turnos();
    }

    // Si estamos en la página de horario generado, cargar los datos
    if (document.getElementById('schedule-content')) {
        loadGeneratedSchedule();
    }
});

// ==========================
// FUNCIONES DE GESTIÓN DE HORARIOS
// ==========================

/**
 * Muestra u oculta las tablas de horarios según los checkboxes seleccionados
 * No recibe parámetros y no retorna valores (efecto lateral en el DOM)
 */
function mostrar_turnos() {
    document.getElementById('hidden_m').hidden = !document.getElementById('check_m').checked;
    document.getElementById('hidden_t').hidden = !document.getElementById('check_t').checked;
    document.getElementById('hidden_n').hidden = !document.getElementById('check_n').checked;
}

/**
 * Redirige a la página principal (index.html)
 */
function volverIndex() {
    window.location.href = "index.html";
}

/**
 * Actualiza los selectores de hora según el turno seleccionado
 * Depende de los arrays value_* y texto_* definidos globalmente
 */
function cambia_turnos() {
    const turno = document.getElementById('turno').value;
    const hora_entrada = document.getElementById('hora_entrada');
    const hora_salida = document.getElementById('hora_salida');

    // Limpiar selectores
    hora_entrada.innerHTML = '';
    hora_salida.innerHTML = '';

    if (turno) {
        let value_arr, texto_arr;

        // Seleccionar arrays según el turno
        switch (turno) {
            case 'm':
                value_arr = value_m;
                texto_arr = texto_m;
                break;
            case 't':
                value_arr = value_t;
                texto_arr = texto_t;
                break;
            case 'n':
                value_arr = value_n;
                texto_arr = texto_n;
                break;
        }

        // Llenar los selectores con las opciones del turno
        for (let i = 0; i < value_arr.length; i++) {
            const option1 = document.createElement('option');
            option1.value = value_arr[i];
            option1.text = texto_arr[i];
            hora_entrada.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = value_arr[i];
            option2.text = texto_arr[i];
            hora_salida.appendChild(option2);
        }
    } else {
        // Opción por defecto si no hay turno seleccionado
        const option1 = document.createElement('option');
        option1.value = '';
        option1.text = 'N/A';
        hora_entrada.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = '';
        option2.text = 'N/A';
        hora_salida.appendChild(option2);
    }
}

/**
 * Registra un nuevo evento en el horario con validaciones
 * Proceso:
 * 1. Recoge datos del formulario
 * 2. Realiza validaciones básicas
 * 3. Verifica conflictos de horario
 * 4. Almacena el evento en la estructura 'eventos'
 * 5. Actualiza la visualización
 */
function registrar() {
    // 1. Recoger datos del formulario
    const materia = document.getElementById('materia').value.trim();
    const seccion = document.getElementById('seccion').value.trim();
    const dia = parseInt(document.getElementById('dia').value);
    const profesor = document.getElementById('prof_nom').value.trim();
    const salon = document.getElementById('salon_num').value.trim();
    const turno = document.getElementById('turno').value;
    const entrada = parseInt(document.getElementById('hora_entrada').value);
    const salida = parseInt(document.getElementById('hora_salida').value);

    // 2. Validaciones básicas
    if (!turno) {
        alert('Por favor seleccione un turno');
        return;
    }

    if (isNaN(dia) || dia < 1 || dia > 6) {
        alert('Por favor seleccione un día válido');
        return;
    }

    if (isNaN(entrada) || isNaN(salida) || entrada < 1 || salida < 1) {
        alert('Por favor seleccione horas válidas');
        return;
    }

    if (entrada > salida) {
        alert('La hora de entrada no puede ser posterior a la hora de salida');
        return;
    }

    if (materia === '') {
        alert('Por favor ingrese el nombre de la materia');
        return;
    }

    // 3. Verificar disponibilidad
    const diaIndex = dia - 1; // Convertir a índice base 0

    // Verificar si hay conflicto en alguno de los bloques
    let conflicto = false;
    for (let bloque = entrada; bloque <= salida; bloque++) {
        if (eventos[turno][bloque] && eventos[turno][bloque][diaIndex]) {
            conflicto = true;
            break;
        }
    }

    if (conflicto) {
        alert('Conflicto de horario: Uno o más bloques ya están ocupados');
        return;
    }

    // 4. Crear y almacenar el evento
    const evento = {
        materia: materia,
        profesor: profesor || 'N/A',
        salon: salon || 'N/A',
        seccion,
        entrada,
        salida
    };

    // Guardar en todos los bloques que ocupa
    for (let bloque = entrada; bloque <= salida; bloque++) {
        if (!eventos[turno][bloque]) eventos[turno][bloque] = Array(6).fill(null);
        eventos[turno][bloque][diaIndex] = evento;
    }

    // 5. Actualizar UI y limpiar formulario
    actualizarTablaTurno(turno);
    limpiarFormulario();
}

/**
 * Actualiza la tabla HTML para un turno específico
 * @param {string} turno - Letra identificadora del turno ('m', 't' o 'n')
 */
function actualizarTablaTurno(turno) {
    const tbody = document.getElementById(`turno_${turno}`);
    tbody.innerHTML = '';

    // Configuración según turno
    let numBloques, horas;
    switch (turno) {
        case 'm':
            numBloques = 6;
            horas = texto_m.slice(1);
            break;
        case 't':
            numBloques = 5;
            horas = texto_t.slice(1);
            break;
        case 'n':
            numBloques = 5;
            horas = texto_n.slice(1);
            break;
    }

    // Construir filas de la tabla
    for (let bloque = 1; bloque <= numBloques; bloque++) {
        const tr = document.createElement('tr');
        tr.id = `${bloque}${turno}`;

        // Celda de hora (primera columna)
        const horaTd = document.createElement('td');
        horaTd.className = 'hora-col';
        horaTd.textContent = horas[bloque - 1];
        tr.appendChild(horaTd);

        // Celdas para cada día
        for (let dia = 0; dia < 6; dia++) {
            const evento = eventos[turno][bloque] ? eventos[turno][bloque][dia] : null;

            // Si hay un evento que COMIENZA en este bloque
            if (evento && evento.entrada === bloque) {
                const duracion = evento.salida - evento.entrada + 1;
                const td = document.createElement('td');

                // Configurar rowSpan si ocupa múltiples bloques
                if (duracion > 1) {
                    td.rowSpan = duracion;
                }

                td.className = 'filled-cell';

                // Contenido de la celda
                td.innerHTML = `
                    <div>
                        <div class="event-title">${evento.materia}</div>
                        <div>Sección: ${evento.seccion}</div>
                        <div>Prof: ${evento.profesor}</div>
                        <div>Salón: ${evento.salon}</div>
                    </div>
                `;

                tr.appendChild(td);
            }
            // Si no hay evento o el evento no comienza aquí
            else if (!evento) {
                // Celda vacía si no hay evento
                const td = document.createElement('td');
                tr.appendChild(td);
            }
            // Nota: Si hay evento pero no comienza aquí, no se añade celda
            // (ya fue cubierto por rowSpan)
        }

        tbody.appendChild(tr);
    }
}

/**
 * Limpia todos los campos del formulario
 */
function limpiarFormulario() {
    document.getElementById('materia').value = '';
    document.getElementById('prof_nom').value = '';
    document.getElementById('salon_num').value = '';
    document.getElementById('seccion').value = '';
    document.getElementById('hora_entrada').value = '';
    document.getElementById('hora_salida').value = '';
    document.getElementById('dia').value = '';
    document.getElementById('turno').value = '';
    document.getElementById('turno').value = '';
}

/**
 * Genera y guarda el contenido del horario para ser mostrado en la página de visualización
 */
function GenerateScheduleContent() {
    let scheduleColor = document.getElementById("color_personalizado").value
    const colorOscuro = ajustarBrillo(scheduleColor, -40); // -40% de brillo

    // Verificar si hay al menos un evento registrado
    let hasEvents = false;
    for (const turno in eventos) {
        for (const bloque of eventos[turno]) {
            if (bloque && bloque.some(evento => evento !== null)) {
                hasEvents = true;
                break;
            }
        }
        if (hasEvents) break;
    }

    if (!hasEvents) {
        alert('No hay eventos registrados para generar el horario');
        return;
    }

    // Obtener los turnos visibles
    const turnosVisibles = [];
    if (document.getElementById('check_m').checked) turnosVisibles.push('m');
    if (document.getElementById('check_t').checked) turnosVisibles.push('t');
    if (document.getElementById('check_n').checked) turnosVisibles.push('n');

    // Generar el HTML del horario
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

        // Generar las filas de la tabla
        const numBloques = turno === 'm' ? 6 : 5;
        const horas = turno === 'm' ? texto_m.slice(1) : turno === 't' ? texto_t.slice(1) : texto_n.slice(1);

        for (let bloque = 1; bloque <= numBloques; bloque++) {
            scheduleHTML += `<tr>`;
            scheduleHTML += `<td class="hora-col">${horas[bloque - 1]}</td>`;

            for (let dia = 0; dia < 6; dia++) {
                const evento = eventos[turno][bloque] ? eventos[turno][bloque][dia] : null;

                if (evento && evento.entrada === bloque) {
                    const duracion = evento.salida - evento.entrada + 1;
                    scheduleHTML += `<td class="filled-cell"${duracion > 1 ? ` rowspan="${duracion}"` : ''}>
                        <div>
                            <div class="event-title">${evento.materia}</div>
                            <div>Prof: ${evento.profesor}</div>
                            <div>Salón: ${evento.salon}</div>
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

    // Guardar en sessionStorage y redirigir
    sessionStorage.setItem('scheduleContent', scheduleHTML);
    sessionStorage.setItem('scheduleColor', scheduleColor);
    sessionStorage.setItem('scheduleNewColor', colorOscuro);

    sessionStorage.setItem('generationDate', new Date().toLocaleString('es-VE'));
    document.getElementById('color_personalizado').value = getComputedStyle(document.body).getPropertyValue('--ucla')

    // Redirigir a la página de visualización
    window.location.href = 'horario_generado.html';
}

/**
 * Carga el horario generado en la página de visualización
 */
function loadGeneratedSchedule() {
    const scheduleContent = sessionStorage.getItem('scheduleContent');
    const generationDate = sessionStorage.getItem('generationDate');
    const scheduleColor = sessionStorage.getItem("scheduleColor");
    const scheduleNewColor = sessionStorage.getItem("scheduleNewColor")

    if (scheduleColor) {
        document.body.style.setProperty('--ucla', scheduleColor)
        document.body.style.setProperty('--ucla-gradient', scheduleNewColor)

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

/**
 * Limpia todos los eventos de un turno específico
 * Solicita confirmación antes de proceder
 */
function limpiar_tabla() {
    const turno = prompt("Escoja el turno para limpiar (m=mañana, t=tarde, n=noche)");

    if (turno && ['m', 't', 'n'].includes(turno)) {
        const turnoNombre =
            turno === 'm' ? 'mañana' :
                turno === 't' ? 'tarde' : 'noche';

        if (confirm(`¿Está seguro que desea limpiar todo el turno de ${turnoNombre}?`)) {
            // Reiniciar la estructura de datos
            eventos[turno] = Array(eventos[turno].length).fill().map(() => Array(6).fill(null));
            actualizarTablaTurno(turno);
            alert('Turno limpiado exitosamente');
        }
    } else {
        alert('Turno no válido. Use m, t o n');
    }
}

function ajustarBrillo(hex, porcentaje) {
    // Convertir hex a RGB
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    // Ajustar brillo
    r = Math.max(0, Math.min(255, r + (r * porcentaje / 100)));
    g = Math.max(0, Math.min(255, g + (g * porcentaje / 100)));
    b = Math.max(0, Math.min(255, b + (b * porcentaje / 100)));

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}