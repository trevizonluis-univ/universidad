const SUPABASE_URL = 'https://lqdovfnemhotouljektr.supabase.co';   // Cambia por tu URL
const SUPABASE_ANON_KEY = 'sb_publishable_tygjFhHRzQFmOnl-lRj4iA_Lb44gmHC';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cargarArticulo() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) {
        document.getElementById('articulo').innerHTML = '<div class="error">No se especificó el artículo.</div>';
        return;
    }
    const { data, error } = await supabaseClient
        .from('articulos')
        .select('*, articulo_categorias(categorias(id, nombre))')
        .eq('id', id)
        .single();
    if (error || !data) {
        document.getElementById('articulo').innerHTML = '<div class="error">Artículo no encontrado.</div>';
        return;
    }

    // Construir lista de categorías
    let categoriasHtml = '';
    if (data.articulo_categorias && data.articulo_categorias.length) {
        const nombres = data.articulo_categorias.map(ac => ac.categorias.nombre);
        categoriasHtml = `<strong>Categorías:</strong> ${nombres.join(', ')}`;
    }

    // Autor: si no existe, mostrar "Anónimo" o el email como fallback
    const autorMostrar = data.autor ? escapeHtml(data.autor) : (data.user_id ? 'Usuario' : 'Anónimo');

    const html = `
        <h1 class="article-title">${escapeHtml(data.title)}</h1>
        <div class="article-meta" style="border-bottom: 1px solid #ffb81c; padding-bottom: 10px; margin-bottom: 20px;">
            <div style="font-size: 1.1rem; margin-bottom: 8px;">
                ✍️ <strong>${autorMostrar}</strong>
            </div>
            <div>
                ${categoriasHtml ? `<span>📂 ${categoriasHtml}</span>` : ''}
                ${categoriasHtml && data.date ? ' | ' : ''}
                ${data.date ? `<span>📅 ${escapeHtml(data.date)}</span>` : ''}
                ${data.readTime ? ` | ⏱️ ${escapeHtml(data.readTime)}` : ''}
            </div>
        </div>
        ${data.img ? `<img src="${escapeHtml(data.img)}" alt="${escapeHtml(data.title)}" class="article-img">` : ''}
        <div class="article-content">${data.content || '<p>Contenido no disponible.</p>'}</div>
    `;
    document.getElementById('articulo').innerHTML = html;
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

cargarArticulo();