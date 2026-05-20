// Configuración de Supabase (cámbiala por la tuya)
const SUPABASE_URL = 'https://lqdovfnemhotouljektr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tygjFhHRzQFmOnl-lRj4iA_Lb44gmHC';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cargar categorías para el dropdown
    async function cargarCategoriasDropdown() {
        const dropdown = document.getElementById('categoriasDropdown');
        if (!dropdown) return;
        const { data, error } = await supabaseClient
            .from('categorias')
            .select('nombre')
            .order('nombre');
        if (error) {
            dropdown.innerHTML = '<span>Error al cargar categorías</span>';
            return;
        }
        if (data.length === 0) {
            dropdown.innerHTML = '<span>No hay categorías</span>';
            return;
        }
        // Mostrar cada categoría como un elemento no enlazado (span)
        dropdown.innerHTML = data.map(cat => `<span>${escapeHtml(cat.nombre)}</span>`).join('');
    }

    // Cargar artículos (igual que antes)
    async function cargarArticulos() {
        const container = document.getElementById('posts-container');
        container.innerHTML = '<div style="text-align:center; padding:20px;">Cargando...</div>';
        const { data, error } = await supabaseClient
            .from('articulos')
            .select('*, articulo_categorias(categorias(id, nombre))')
            .order('created_at', { ascending: false });
        if (error) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#dc3545;">Error: ${error.message}</div>`;
            return;
        }
        if (!data || data.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">No hay artículos aún. Vuelve pronto.</div>';
            return;
        }
        let html = '';
        for (let art of data) {
            const titulo = escapeHtml(art.title);
            const fecha = escapeHtml(art.date || '');
            const readTime = escapeHtml(art.readTime || '');
            const excerpt = escapeHtml(art.excerpt || '');
            const imgUrl = art.img || 'https://picsum.photos/id/20/400/250';
            const id = art.id;
            let categoriasHtml = '';
            if (art.articulo_categorias && art.articulo_categorias.length) {
                categoriasHtml = art.articulo_categorias.map(ac => 
                    `<span class="post-category">${escapeHtml(ac.categorias.nombre)}</span>`
                ).join('');
            } else {
                categoriasHtml = '<span class="post-category">General</span>';
            }
            html += `
                <article class="post-card">
                    <img src="${imgUrl}" alt="${titulo}" class="post-img">
                    <div class="post-content">
                        ${categoriasHtml}
                        <h3 class="post-title"><a href="articulo.html?id=${id}">${titulo}</a></h3>
                        <div class="post-meta">
                            ${art.autor ? `<span><i class="fas fa-user"></i> ${escapeHtml(art.autor)}</span>` : ''}
                            <span><i class="far fa-calendar-alt"></i> ${fecha}</span>
                            <span><i class="far fa-clock"></i> ${readTime}</span>
                        </div>
                        <p class="post-excerpt">${excerpt}</p>
                        <a href="articulo.html?id=${id}" class="read-more">Leer más →</a>
                    </div>
                </article>
            `;
        }
        container.innerHTML = html;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        cargarCategoriasDropdown();
        cargarArticulos();
    });