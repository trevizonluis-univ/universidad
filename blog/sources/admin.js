// ⭐⭐⭐ CONFIGURACIÓN - REEMPLAZA CON TUS DATOS ⭐⭐⭐
const SUPABASE_URL = 'https://lqdovfnemhotouljektr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tygjFhHRzQFmOnl-lRj4iA_Lb44gmHC';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let quillEditor = null;
let categoriasList = [];
let isAdmin = false;
let currentDisplayName = null;

// ================= FUNCIONES AUXILIARES =================
function mostrarMensaje(elId, texto, esError = false) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = texto;
    el.className = 'mensaje' + (esError ? ' error' : '');
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ================= GESTIÓN DEL NOMBRE DE AUTOR (PRIMER LOGIN) =================
async function ensureDisplayName() {
    if (!currentUser) return false;

    // Buscar en la tabla profiles
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('display_name')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (error) {
        console.error('Error al obtener perfil:', error);
        return false;
    }

    if (data && data.display_name) {
        currentDisplayName = data.display_name;
        return true;
    }

    // No tiene nombre: pedírselo
    let nombre = null;
    while (!nombre || nombre.trim() === '') {
        nombre = prompt('Bienvenido. Por favor, ingresa el nombre con el que firmarás tus artículos (ej: Luis Trevizon):');
        if (nombre === null) {
            alert('Necesitas un nombre de autor para continuar. Cierra sesión y vuelve a intentarlo.');
            await logout();
            return false;
        }
        nombre = nombre.trim();
        if (nombre === '') alert('El nombre no puede estar vacío.');
    }

    // Guardar en profiles
    const { error: insertError } = await supabaseClient
        .from('profiles')
        .upsert({ id: currentUser.id, display_name: nombre });

    if (insertError) {
        alert('Error al guardar tu nombre. Intenta de nuevo.');
        console.error(insertError);
        return false;
    }

    currentDisplayName = nombre;
    // Mostrar mensaje de bienvenida
    const welcomeDiv = document.getElementById('welcomeMessage');
    if (welcomeDiv) welcomeDiv.innerText = `Bienvenido, ${currentDisplayName}`;
    return true;
}

// ================= INICIALIZACIÓN DEL EDITOR QUILL =================
function initQuill() {
    if (quillEditor) return;
    quillEditor = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: 'Escribe aquí el artículo completo...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ]
        }
    });
    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            const url = await subirImagenStorage(file);
            if (url) {
                const range = quillEditor.getSelection(true);
                quillEditor.insertEmbed(range.index, 'image', url);
            }
        };
    };
    const toolbar = quillEditor.getModule('toolbar');
    toolbar.addHandler('image', imageHandler);
}

async function subirImagenStorage(file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabaseClient.storage
        .from('articulos')
        .upload(fileName, file);
    if (error) {
        mostrarMensaje('mensajeListado', 'Error al subir imagen: ' + error.message, true);
        return null;
    }
    const { data: publicUrlData } = supabaseClient.storage
        .from('articulos')
        .getPublicUrl(fileName);
    return publicUrlData.publicUrl;
}

// ================= GESTIÓN DE CATEGORÍAS =================
async function cargarCategorias() {
    const { data, error } = await supabaseClient
        .from('categorias')
        .select('*')
        .order('nombre');
    if (error) {
        console.error(error);
        return [];
    }
    categoriasList = data || [];

    // Actualizar checkboxes
    const container = document.getElementById('categorias-checkboxes');
    if (container) {
        if (categoriasList.length === 0) {
            container.innerHTML = '<p>No hay categorías. Crea una nueva.</p>';
        } else {
            let html = '';
            categoriasList.forEach(cat => {
                html += `
                    <label style="display:inline-block; margin-right:15px; margin-bottom:8px;">
                        <input type="checkbox" value="${escapeHtml(cat.nombre)}" class="cat-checkbox">
                        ${escapeHtml(cat.nombre)}
                    </label>
                `;
            });
            container.innerHTML = html;
        }
    }

    const gestionContainer = document.getElementById('listaCategorias');
    if (gestionContainer) {
        if (categoriasList.length === 0) {
            gestionContainer.innerHTML = '<p>No hay categorías. Crea una nueva.</p>';
        } else {
            let html = '<ul style="list-style:none; padding:0;">';
            categoriasList.forEach(cat => {
                html += `
                    <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span>${escapeHtml(cat.nombre)}</span>
                        <button class="danger eliminar-categoria" data-id="${cat.id}" style="padding:2px 8px;">Eliminar</button>
                    </li>
                `;
            });
            html += '</ul>';
            gestionContainer.innerHTML = html;
            document.querySelectorAll('.eliminar-categoria').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.getAttribute('data-id');
                    await eliminarCategoria(id);
                });
            });
        }
    }
    return categoriasList;
}

async function agregarCategoria(nombre) {
    if (!nombre.trim()) return;
    const { error } = await supabaseClient
        .from('categorias')
        .insert([{ nombre: nombre.trim() }]);
    if (error) {
        mostrarMensaje('mensajeListado', 'Error al agregar categoría: ' + error.message, true);
    } else {
        mostrarMensaje('mensajeListado', 'Categoría agregada');
        await cargarCategorias();
    }
}

async function eliminarCategoria(id) {
    if (!confirm('¿Eliminar esta categoría? Se eliminará de los artículos que la usen.')) return;
    const { error } = await supabaseClient
        .from('categorias')
        .delete()
        .eq('id', id);
    if (error) {
        mostrarMensaje('mensajeListado', 'Error al eliminar categoría: ' + error.message, true);
    } else {
        mostrarMensaje('mensajeListado', 'Categoría eliminada');
        await cargarCategorias();
        cargarArticulos();
    }
}

function getSelectedCategorias() {
    const checkboxes = document.querySelectorAll('#categorias-checkboxes .cat-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function setSelectedCategorias(categoriasNombres) {
    const checkboxes = document.querySelectorAll('#categorias-checkboxes .cat-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = categoriasNombres.includes(cb.value);
    });
}

async function getCategoriasDeArticulo(articuloId) {
    const { data, error } = await supabaseClient
        .from('articulo_categorias')
        .select('categoria_id, categorias(nombre)')
        .eq('articulo_id', articuloId);
    if (error) return [];
    return data.map(item => item.categorias.nombre);
}

// ================= CRUD DE ARTÍCULOS =================
async function cargarArticulos() {
    let query = supabaseClient
        .from('articulos')
        .select('*, articulo_categorias(categorias(id, nombre))')
        .order('created_at', { ascending: false });

    if (!isAdmin && currentUser) {
        query = query.eq('user_id', currentUser.id);
    }

    const { data: articulos, error } = await query;
    if (error) return mostrarMensaje('mensajeListado', 'Error: ' + error.message, true);

    const tbody = document.getElementById('tbodyArticulos');
    tbody.innerHTML = '';
    if (articulos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No hay artículos. Crea uno.</td></tr>';
        return;
    }
    for (let art of articulos) {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = art.id;
        row.insertCell(1).textContent = art.title || '';
        let categoriasTexto = '';
        if (art.articulo_categorias && art.articulo_categorias.length) {
            categoriasTexto = art.articulo_categorias.map(ac => ac.categorias.nombre).join(', ');
        }
        row.insertCell(2).textContent = categoriasTexto;
        row.insertCell(3).textContent = art.date || '';
        const acc = row.insertCell(4);
        const btnEdit = document.createElement('button');
        btnEdit.textContent = 'Editar';
        btnEdit.style.background = '#ffc107';
        btnEdit.style.color = '#000';
        btnEdit.onclick = () => cargarParaEditar(art.id);
        const btnDel = document.createElement('button');
        btnDel.textContent = 'Eliminar';
        btnDel.className = 'danger';
        btnDel.onclick = () => eliminarArticulo(art.id);
        acc.appendChild(btnEdit);
        acc.appendChild(btnDel);
    }
}

async function cargarParaEditar(articuloId) {
    const { data: art, error } = await supabaseClient
        .from('articulos')
        .select('*')
        .eq('id', articuloId)
        .single();
    if (error) return mostrarMensaje('mensajeListado', 'Error al cargar artículo: ' + error.message, true);

    document.getElementById('formTitle').textContent = 'Editar artículo';
    document.getElementById('editId').value = art.id;
    document.getElementById('title').value = art.title || '';
    document.getElementById('date').value = art.date || '';
    document.getElementById('readTime').value = art.readTime || '';
    document.getElementById('excerpt').value = art.excerpt || '';
    if (art.img) {
        document.getElementById('imgPreview').innerHTML = `<img src="${art.img}" style="max-width:100%">`;
        document.getElementById('imgUrl').value = art.img;
    } else {
        document.getElementById('imgPreview').innerHTML = '';
        document.getElementById('imgUrl').value = '';
    }
    if (quillEditor) {
        quillEditor.root.innerHTML = art.content || '';
    }
    const categoriasActuales = await getCategoriasDeArticulo(art.id);
    setSelectedCategorias(categoriasActuales);
    document.querySelector('.formulario-edicion').scrollIntoView({ behavior: 'smooth' });
}

async function guardarArticulo() {
    const id = document.getElementById('editId').value;
    const contenidoHTML = quillEditor ? quillEditor.root.innerHTML : '';
    const datosArticulo = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        readTime: document.getElementById('readTime').value,
        excerpt: document.getElementById('excerpt').value,
        img: document.getElementById('imgUrl').value,
        content: contenidoHTML,
        user_id: currentUser.id,
        autor: currentDisplayName
    };
    if (!datosArticulo.title) return mostrarMensaje('mensajeListado', 'El título es obligatorio', true);

    let articuloId = id;
    let result;
    if (id) {
        result = await supabaseClient.from('articulos').update(datosArticulo).eq('id', id);
        if (result.error) return mostrarMensaje('mensajeListado', 'Error al actualizar: ' + result.error.message, true);
        articuloId = parseInt(id);
    } else {
        result = await supabaseClient.from('articulos').insert([datosArticulo]).select();
        if (result.error) return mostrarMensaje('mensajeListado', 'Error al insertar: ' + result.error.message, true);
        articuloId = result.data[0].id;
    }

    const categoriasSeleccionadas = getSelectedCategorias();
    let categoriaIds = [];
    if (categoriasSeleccionadas.length > 0) {
        const { data: catsData, error: catsError } = await supabaseClient
            .from('categorias')
            .select('id')
            .in('nombre', categoriasSeleccionadas);
        if (catsError) return mostrarMensaje('mensajeListado', 'Error al obtener ids de categorías: ' + catsError.message, true);
        categoriaIds = catsData.map(c => c.id);
    }

    const { error: delError } = await supabaseClient
        .from('articulo_categorias')
        .delete()
        .eq('articulo_id', articuloId);
    if (delError) return mostrarMensaje('mensajeListado', 'Error al actualizar categorías: ' + delError.message, true);

    if (categoriaIds.length > 0) {
        const relaciones = categoriaIds.map(catId => ({
            articulo_id: articuloId,
            categoria_id: catId
        }));
        const { error: insError } = await supabaseClient
            .from('articulo_categorias')
            .insert(relaciones);
        if (insError) return mostrarMensaje('mensajeListado', 'Error al guardar categorías: ' + insError.message, true);
    }

    mostrarMensaje('mensajeListado', 'Artículo guardado correctamente');
    limpiarFormulario();
    cargarArticulos();
}

async function eliminarArticulo(id) {
    if (!confirm('¿Eliminar permanentemente?')) return;
    const { error } = await supabaseClient.from('articulos').delete().eq('id', id);
    if (error) mostrarMensaje('mensajeListado', 'Error al eliminar: ' + error.message, true);
    else {
        mostrarMensaje('mensajeListado', 'Artículo eliminado');
        cargarArticulos();
    }
}

function limpiarFormulario() {
    document.getElementById('formTitle').textContent = 'Agregar nuevo artículo';
    document.getElementById('editId').value = '';
    document.getElementById('title').value = '';
    document.getElementById('date').value = '';
    document.getElementById('readTime').value = '';
    document.getElementById('excerpt').value = '';
    document.getElementById('imgUrl').value = '';
    document.getElementById('imgPreview').innerHTML = '';
    if (quillEditor) quillEditor.root.innerHTML = '';
    document.getElementById('imgFile').value = '';
    const checkboxes = document.querySelectorAll('#categorias-checkboxes .cat-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
}

document.getElementById('imgFile')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await subirImagenStorage(file);
    if (url) {
        document.getElementById('imgUrl').value = url;
        document.getElementById('imgPreview').innerHTML = `<img src="${url}" style="max-width:100%">`;
    }
});

document.getElementById('btnNuevaCategoriaArticulo')?.addEventListener('click', () => {
    const nueva = prompt('Ingrese el nombre de la nueva categoría:');
    if (nueva && nueva.trim()) {
        agregarCategoria(nueva.trim()).then(() => {
            setTimeout(() => {
                const checkboxes = document.querySelectorAll('#categorias-checkboxes .cat-checkbox');
                checkboxes.forEach(cb => {
                    if (cb.value === nueva.trim()) cb.checked = true;
                });
            }, 500);
        });
    }
});

// ================= AUTENTICACIÓN Y PRIMER LOGIN =================
async function login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentUser = data.user;

    // Verificar si es admin
    const { data: adminData } = await supabaseClient
        .from('admin_users')
        .select('user_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();
    isAdmin = !!adminData;

    // **Punto clave**: Asegurar que tiene nombre de autor (primer login)
    const nameOk = await ensureDisplayName();
    if (!nameOk) throw new Error('No se pudo establecer el nombre de autor.');
}

async function logout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    isAdmin = false;
    currentDisplayName = null;
    document.getElementById('loginBox').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    limpiarFormulario();
}

async function verificarSesion() {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
        currentUser = data.session.user;
        const { data: adminData } = await supabaseClient
            .from('admin_users')
            .select('user_id')
            .eq('user_id', currentUser.id)
            .maybeSingle();
        isAdmin = !!adminData;

        // Obtener display_name si ya existe
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('display_name')
            .eq('id', currentUser.id)
            .maybeSingle();
        currentDisplayName = profile?.display_name || null;

        if (!currentDisplayName) {
            // Primera vez que inicia sesión (aún no tiene nombre)
            const nameOk = await ensureDisplayName();
            if (!nameOk) {
                await logout();
                return;
            }
        } else {
            const welcomeDiv = document.getElementById('welcomeMessage');
            if (welcomeDiv) welcomeDiv.innerText = `Bienvenido, ${currentDisplayName}`;
        }

        document.getElementById('loginBox').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        initQuill();
        await cargarCategorias();
        await cargarArticulos();
    } else {
        document.getElementById('loginBox').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
    }
}

// Eventos
document.getElementById('btnLogin').onclick = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    if (!email || !pass) return mostrarMensaje('loginMsg', 'Completa email y contraseña', true);
    try {
        await login(email, pass);
        await verificarSesion();
    } catch (e) {
        mostrarMensaje('loginMsg', e.message, true);
    }
};
document.getElementById('btnLogout').onclick = logout;
document.getElementById('btnSave').onclick = guardarArticulo;
document.getElementById('btnCancel').onclick = limpiarFormulario;
document.getElementById('btnAgregarCategoria')?.addEventListener('click', () => {
    const nombre = document.getElementById('nuevaCategoria').value;
    if (nombre.trim()) {
        agregarCategoria(nombre);
        document.getElementById('nuevaCategoria').value = '';
    }
});

verificarSesion();