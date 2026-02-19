// ======================================================================
// SISTEMA DE GESTIÓN DE HORARIOS ACADÉMICOS - UCLA (Módulo de Consulta)
// ======================================================================
//
// Este módulo proporciona funcionalidades para:
// - Consultar horarios por carrera y semestre
// - Visualizar electivas y autodesarrollos
// - Gestionar la presentación de información académica
//
// Estructura principal:
// 1. Base de datos de horarios por carrera/semestre
// 2. Funciones de utilidad para procesamiento de datos
// 3. Funciones de interfaz para mostrar resultados
//
// Autor: Luis Trevizon (Ayuda de Deepseek)
// Versión: 1.0
// ======================================================================

// ==========================
// BASE DE DATOS DE HORARIOS
// ==========================
/**
 * Estructura que contiene todos los códigos de horarios disponibles
 * organizados por carrera y semestre.
 * 
 * Formato:
 *   clave: [carrera]_[semestre]
 *   valor: array de códigos de horario (ej: "m01")
 * 
 * Notas:
 * - Las carreras combinadas (administracion_contaduria) se usan para semestres iniciales
 * - Economía tiene estructura especial para semestres avanzados
 */
const token_cat = "live_OrGbCjsfy5Bxz6Eq3RGWv41xJBwDBGAFOEmhQXSKv8V3mBhv3kryyi6GEolyZsiM"
const token_dog = "live_ntTQz8hs76V8ThY32a5kRjR8TvFgbx9Vg0tnP8BuI8fkKzMlCMtoRHmdkirqCU9D"

async function mantenimiento() {
    alert("El sistema se encuentra en mantenimiento. Por favor, intente más tarde.");
    img = await getAnimalito();
    document.getElementById("horarios").innerHTML = `
        <div class="empty-result">
            <i class="fas fa-tools" 
                style="font-size: 3rem; color: var(--warning); margin-bottom: 15px;">
            </i>
            <p>El sistema se encuentra en mantenimiento</p>
            <p class="creator-note">Por favor, intente más tarde</p>
            <img class="animalito" src="${img.url}">
            <br>
            <p class="animalito-caption ${img.tipo_animal}-caption">Animalito de mantenimiento</p>
        </div>
    `;
}
async function getAnimalito() {
    var animal = ["cat", "dog"]
    var random = Math.floor(Math.random() * animal.length);
    if (animal[random] == "cat") {
        response = await fetch("https://api.thecatapi.com/v1/images/search?api_key=" + token_cat);
    }
    else if (animal[random] == "dog") {
        response = await fetch("https://api.thedogapi.com/v1/images/search?api_key=" + token_dog);
    }
    if (!response.ok) {
        throw new Error("Error al obtener la imagen del animal: " + response.statusText);
    }
    const data = await response.json();
    new_data = {
        url: data[0].url,
        width: data[0].width,
        height: data[0].height,
        tipo_animal: animal[random],
    }
    return new_data;
}
var mantenimiento_dcee = false
var mantenimiento_deha = true
const decanatos_carreras = {
    dcee: {
        economia_1: ["m01", "m02", "t01", "t02", "m03", "t03"],
        economia_2: ["m01", "t01", "t02"],
        economia_3: ["m01", "t01"],
        administracion_contaduria_1: ["m01", "m02", "m03", "m04", "m05", "m06", "m07", "m08", "m09", "m10", "m11", "t01", "t02", "t03", "n01", "n02"],
        administracion_contaduria_2: ["m01", "m02", "m03", "m04", "m05", "m06", "t01", "t02", "t04", "n01", "n02", "n03", "n04", "n05", "n06"],
        administracion_contaduria_3: ["m01", "m02", "m03", "m04", "m05", "t01", "t02", "t03", "n01", "n02", "n03"],
        administracion_contaduria_4: ["m01", "m02", "m03", "t01", "n01", "n02", "n03"],
        administracion_contaduria_5: ["m01", "m02", "n01", "n02"],
        administracion_contaduria_6: ["m01", "m02", "m03", "n01", "n02"],
        contaduria_7: ['m01', "m02", 'n01', 'n02'],
        administracion_7: ['m01', "m02", "t01", 'n01', 'n02'],
        administracion_8: ['m01', "m02", "m03", 'n01', 'n02', 'n03', 'n04'],
        contaduria_8: ['m01', "m02", "m03", 'n01', 'n02', 'n04'],
        contaduria_9: ["m01", "m02", "m03", "n01", "n02", "n03"],
        administracion_9: ["m01", "m02", "m03", "t01", "n01", "n03"],
    },
    deha: {
        desarrollo_humano_1: ["m01", "m02"],
        desarrollo_humano_2: ["m01", "t01"],
        desarrollo_humano_3: ["m01"],
        psicologia_1: ["seccion_1", "seccion_2", "seccion_3", "seccion_4", "seccion_5", "seccion_lab"],
        psicologia_2: ["seccion_1", "seccion_2", "seccion_3"],
        psicologia_3: ["seccion_1", "seccion_2", "seccion_3", "seccion_4"],
        psiscologia_4: ["seccion_1"],
    }
}
const decanato_carrera = {
    dcee: ["", "economia", "administracion", "contaduria"],
    deha: ["", "desarrollo_humano", "psicologia"],
}
const decanato_texto = {
    dcee: ["N/A", "Economía", "Administración", "Contaduría"],
    deha: ["N/A", "Desarrollo Humano", "Psicología"]
}

// ==========================
// FUNCIONES DE INTERFAZ
// ==========================

/**
 * Limpia los resultados mostrados y restablece los controles de formulario
 * - Borra el contenido del contenedor de resultados
 * - Restablece los selectores a su valor predeterminado ("n/a")
 * - Muestra un estado vacío con icono informativo
 */
function limpiar() {
    document.getElementById("horarios").innerHTML = `
        <div class="empty-result">
            <i class="fas fa-calendar-check" 
               style="font-size: 3rem; color: var(--success); margin-bottom: 15px;"></i>
            <p>Se han limpiado los resultados</p>
            <p class="creator-note">Utilice los controles para realizar una nueva búsqueda</p>
        </div>
    `;
    // Mantener el decanato seleccionado
    const decanatoSeleccionado = document.getElementById("decanatos").value;

    // Resetear solo controles dependientes
    document.getElementById("carreras").value = "n/a";
    document.getElementById("semestres").value = "n/a";
    document.getElementById("electiva").value = "n/a";

    // Recargar carreras según decanato actual
    if (decanatoSeleccionado !== "n/a") {
        cargarCarreras();
    }
}

/**
 * Genera una clave normalizada para acceder a los horarios
 * @param {string} carrera - Nombre de la carrera (economia, administracion, contaduria)
 * @param {number} nroSemestre - Número del semestre (1-9)
 * @returns {string} Clave normalizada para semestres_totales
 * 
 * Lógica de normalización:
 * - Para administración/contaduría en semestres < 9: usa clave combinada
 * - Para economía en semestre >= 3: usa semestre 3
 */
function getSemesterKey(carrera, nroSemestre) {
    let carreraAcomodada = carrera;
    let nroSemestreAcomodado = nroSemestre;

    // Normalización para administración/contaduría
    if (carrera === "administracion" || carrera === "contaduria") {
        if (nroSemestre <= 6) {
            carreraAcomodada = "administracion_contaduria";
        }
    }
    // Normalización para economía
    else if (carrera === "economia") {
        if (nroSemestre == 1) {
            nroSemestreAcomodado = 1
        }
        if (nroSemestre == 2) {
            nroSemestreAcomodado = 2
        }
        if (nroSemestre >= 3) {
            nroSemestreAcomodado = 3;
        }
    }
    //Normalizacion para DH
    else if (carrera === "desarrollo_humano") {
        if (nroSemestre == 2 || nroSemestre >= 8) {
            nroSemestreAcomodado = 3
        }
        else if (nroSemestre > 2) {
            nroSemestreAcomodado = 2
        }
    } else if (carrera === "psicologia") {
        if ((nroSemestre >= 2 && nroSemestre <= 4) && nroSemestre == 6) {
            nroSemestreAcomodado = 2
        }
        else if (nroSemestre == 5) {
            nroSemestreAcomodado = 3
        } else if (nroSemestre >= 7) {
            nroSemestreAcomodado = 4
        }
    }
    return `${carreraAcomodada}_${nroSemestreAcomodado}`;
}

/**
 * Construye las rutas de imágenes para los horarios
 * @param {string[]} arr - Array donde se almacenarán las rutas
 * @param {string} carrera - Nombre de la carrera
 * @param {string} semestre - Semestre en formato "X_semestre"
 * @param {string[]} variable - Array de códigos de horario
 */
function agregar_src(arr, decanato, carrera, semestre, variable) {
    for (let i = 0; i < variable.length; i++) {
        // Formato: horarios/[carrera]/[semestre]/[codigo].png
        arr.push("horarios/" + decanato + "/" + carrera + "/" + semestre + "/" + variable[i] + ".png");
    }
}

/**
 * Obtiene y muestra los horarios según la selección del usuario
 * Flujo principal:
 * 1. Valida selecciones
 * 2. Normaliza clave de búsqueda
 * 3. Recupera códigos de horario
 * 4. Construye rutas de imágenes
 * 5. Genera y muestra HTML con resultados
 */
function getHorario() {
    // 1. Obtener selecciones del usuario
    var carrera = document.getElementById("carreras").value;
    const nro_semestre = document.getElementById("semestres").value;
    const decanato = document.getElementById("decanatos").value;
    const semestre = nro_semestre + "_semestre";
    let src = [];
    if (mantenimiento_dcee && decanato === "dcee") {
        mantenimiento();
        return;
    }
    if (mantenimiento_deha && decanato === "deha") {
        mantenimiento();
        return;
    }
    // Validación básica
    if (carrera === "n/a" || nro_semestre === "n/a" || decanato === "n/a") {
        alert("Por favor, seleccione una carrera, un decanato o un semestre");
        return;
    }

    // 2. Generar clave normalizada
    const key = getSemesterKey(carrera, nro_semestre);
    // 3. Recuperar códigos de horario
    console.log("Clave generada:", key);
    console.log("Decanato:", decanato)
    var especifico = decanatos_carreras[decanato][key];
    console.log("Códigos de horario encontrados:", especifico);
    if (!especifico) {
        alert("No se encontraron horarios para esta combinación");
        return;
    }

    // 4. Construir rutas de imágenes
    let carreraNombre = carrera;
    // Normalizar nombre para rutas de archivo
    if ((carrera === "administracion" || carrera === "contaduria") && nro_semestre <= 5) {
        carreraNombre = "administracion_contaduria";
    }
    agregar_src(src, decanato, carreraNombre, semestre, especifico);

    // 5. Construir HTML de resultados
    if (carrera === "desarrollo_humano") {
        carrera = "desarrollo humano"
    }
    let htmlContent = `<h2 class="result-title">Horarios del ${nro_semestre}° semestre - ${carrera.toUpperCase()}</h2>`;

    for (let i = 0; i < especifico.length; i++) {
        let carreraTexto = carrera;
        // Ajustar texto para mostrar al usuario
        if (carreraNombre === "administracion_contaduria") {
            carreraTexto = "administración o contaduría";
        }

        htmlContent += `
            <div class="result-item">
                <p>${especifico[i].toUpperCase()} del ${nro_semestre}° semestre en la carrera de ${carreraTexto.toUpperCase()}</p>
                <img src="${src[i]}" alt="Horario ${especifico[i]}">
            </div>
            <hr class="hr-divider">
        `;
    }

    // Mostrar resultados
    document.getElementById("horarios").innerHTML = htmlContent;

}

/**
 * Redirige a la página de creación de horarios personalizados
 */
function irHorario() {
    window.open("horario.html", "_blank");
}

/**
 * Muestra las electivas disponibles para una carrera específica
 * - Valida selección de carrera
 * - Construye ruta de imagen según carrera seleccionada
 * - Genera y muestra HTML con resultados
 */
function electivas() {
    const carrera = document.getElementById("electiva").value;
    if (mantenimiento_dcee) {
        mantenimiento();
        return;
    }
    // Validación
    if (carrera === "n/a") {
        alert("Por favor, seleccione una carrera para ver las electivas");
        return;
    }

    // Mapear valor interno a nombre legible
    let carreraTexto = "";
    if (carrera === "admin_cont") {
        carreraTexto = "administración y contaduría";
    } else {
        carreraTexto = "economía";
    }

    // Construir HTML
    const htmlContent = `
        <h2 class="result-title">Electivas de ${carreraTexto.toUpperCase()}</h2>
                <div class="result-item">
                    <p>Electivas para la carrera de ${carreraTexto.toUpperCase()}</p>
                    <img src="horarios/electivas/${carrera}.png" alt="Electivas ${carreraTexto}">
                </div>
            `;

    document.getElementById("horarios").innerHTML = htmlContent;
}

// Función para mostrar autodesarrollos
async function autodesarrollos() {
    if (mantenimiento_dcee) {
        mantenimiento();
        return;
    }
    var autodesarollo = true
    if (autodesarollo == false) {
        mantenimiento()
        return
    }
    const htmlContent = `
                <h2 class="result-title">Autodesarrollos</h2>
                <div class="result-item">
                    <p>Horarios de autodesarrollos</p>
                    <img src="horarios/autodesarrollo/autodesarrollo.jpg" alt="Autodesarrollos">
                </div>
            `;

    document.getElementById("horarios").innerHTML = htmlContent;
}

//Funcion para mostrar cada carrera en cada decanato por separado

function cargarCarreras() {

    var decanato = document.getElementById("decanatos").value
    var carrera = document.getElementById("carreras");
    var carreras_value = decanato_carrera[decanato]
    var carreras_texto = decanato_texto[decanato]
    carrera.innerHTML = "";
    if (carreras_value === undefined) {
        carrera.innerHTML = `<option value="n/a">N/A</option>`;
        return;
    }
    for (let i = 0; i < carreras_value.length; i++) {
        const element = document.createElement("option");
        element.value = carreras_value[i];
        element.text = carreras_texto[i];
        carrera.appendChild(element);
    }
}