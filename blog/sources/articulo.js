const SUPABASE_URL = 'https://lqdovfnemhotouljektr.supabase.co';   // Cambia por tu URL
const SUPABASE_ANON_KEY = 'sb_publishable_tygjFhHRzQFmOnl-lRj4iA_Lb44gmHC';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let articuloId = null;
let sessionId = null;

// Obtener o crear session_id en localStorage
function getSessionId() {
    let id = localStorage.getItem('blog_session_id');
    if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        localStorage.setItem('blog_session_id', id);
    }
    return id;
}

// Cargar el artículo
async function cargarArticulo() {
    const urlParams = new URLSearchParams(window.location.search);
    articuloId = urlParams.get('id');
    if (!articuloId) {
        document.getElementById('articulo').innerHTML = '<div class="error">No se especificó el artículo.</div>';
        return;
    }
    const { data, error } = await supabaseClient.from('articulos').select('*').eq('id', articuloId).single();
    if (error || !data) {
        document.getElementById('articulo').innerHTML = '<div class="error">Artículo no encontrado.</div>';
        return;
    }
    const html = `
            <h1 class="article-title">${escapeHtml(data.title)}</h1>
            <div class="article-meta">
                ${data.category ? `<span><strong>Categoría:</strong> ${escapeHtml(data.category)}</span> &nbsp;|&nbsp; ` : ''}
                ${data.date ? `<span>📅 ${escapeHtml(data.date)}</span>` : ''}
                ${data.readTime ? ` &nbsp;|&nbsp; <span>⏱️ ${escapeHtml(data.readTime)}</span>` : ''}
            </div>
            ${data.img ? `<img src="${escapeHtml(data.img)}" alt="${escapeHtml(data.title)}" class="article-img">` : ''}
            <div class="article-content">${data.content || '<p>Contenido no disponible.</p>'}</div>
        `;
    document.getElementById('articulo').innerHTML = html;
}

// ========== LIKES ==========
async function cargarLikeCount() {
    const { count, error } = await supabaseClient
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articuloId);
    if (!error) document.getElementById('likeCount').innerText = count || 0;
}

async function checkUserLike() {
    sessionId = getSessionId();
    const { data, error } = await supabaseClient
        .from('likes')
        .select('id')
        .eq('article_id', articuloId)
        .eq('session_id', sessionId)
        .maybeSingle();
    if (!error && data) {
        document.getElementById('likeButton').classList.add('liked');
        document.getElementById('likeButton').innerHTML = '❤️ Ya no me gusta';
    } else {
        document.getElementById('likeButton').classList.remove('liked');
        document.getElementById('likeButton').innerHTML = '❤️ Me gusta';
    }
}

async function toggleLike() {
    sessionId = getSessionId();
    const { data: existing } = await supabaseClient
        .from('likes')
        .select('id')
        .eq('article_id', articuloId)
        .eq('session_id', sessionId)
        .maybeSingle();

    if (existing) {
        // Eliminar like
        await supabaseClient.from('likes').delete().eq('id', existing.id);
    } else {
        // Agregar like
        await supabaseClient.from('likes').insert([{ article_id: articuloId, session_id: sessionId }]);
    }
    // Actualizar UI
    await cargarLikeCount();
    await checkUserLike();
}

// ========== COMENTARIOS ==========
async function cargarComentarios() {
    const { data, error } = await supabaseClient
        .from('comentarios')
        .select('*')
        .eq('article_id', articuloId)
        .order('created_at', { ascending: false });
    if (error) return;
    const lista = document.getElementById('comentariosLista');
    if (!data || data.length === 0) {
        lista.innerHTML = '<p>No hay comentarios aún. Sé el primero.</p>';
        return;
    }
    let html = '';
    data.forEach(c => {
        html += `
                <div class="comentario">
                    <div><span class="comentario-nombre">${escapeHtml(c.nombre)}</span>
                    <span class="comentario-fecha">${new Date(c.created_at).toLocaleDateString()}</span></div>
                    <div class="comentario-contenido">${escapeHtml(c.contenido).replace(/\n/g, '<br>')}</div>
                </div>
            `;
    });
    lista.innerHTML = html;
}

async function enviarComentario() {
    const nombre = document.getElementById('nombre').value.trim();
    const contenido = document.getElementById('contenido').value.trim();
    if (!nombre || !contenido) {
        alert('Por favor, escribe tu nombre y el comentario.');
        return;
    }
    const { error } = await supabaseClient
        .from('comentarios')
        .insert([{ article_id: articuloId, nombre, contenido }]);
    if (error) {
        alert('Error al enviar comentario: ' + error.message);
    } else {
        document.getElementById('nombre').value = '';
        document.getElementById('contenido').value = '';
        cargarComentarios();
    }
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

// Inicializar todo
document.addEventListener('DOMContentLoaded', async () => {
    await cargarArticulo();
    if (articuloId) {
        await cargarLikeCount();
        await checkUserLike();
        await cargarComentarios();
        document.getElementById('likeButton').addEventListener('click', toggleLike);
        document.getElementById('btnEnviarComentario').addEventListener('click', enviarComentario);
    }
});