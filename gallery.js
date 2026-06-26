/* ============================================================
   えま GALLERY 一覧ページ（masonry）
   ============================================================ */
'use strict';
const CFG = window.APP_CONFIG || {};
const CONFIGURED = /^https?:\/\/.+\.supabase\.co/.test(CFG.SUPABASE_URL || '');
const sb = (CONFIGURED && window.supabase) ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

const $ = (s, r = document) => r.querySelector(s);
function esc(t){ const d = document.createElement('div'); d.textContent = (t ?? ''); return d.innerHTML; }

/* 画像のダウンロード抑止 */
document.addEventListener('contextmenu', e=>{ if(e.target && e.target.tagName === 'IMG') e.preventDefault(); }, { capture:true });
document.addEventListener('dragstart',   e=>{ if(e.target && e.target.tagName === 'IMG') e.preventDefault(); }, { capture:true });

/* 星 */
(function stars(){
  const w = $('#bgStars'); if(!w) return; let h='';
  for(let i=0;i<70;i++){ h += `<i style="left:${(Math.random()*100).toFixed(2)}%;top:${(Math.random()*100).toFixed(2)}%;animation-delay:${(Math.random()*3).toFixed(2)}s;transform:scale(${(0.5+Math.random()).toFixed(2)})"></i>`; }
  w.innerHTML = h;
})();

/* ライトボックス */
const lb = $('#lightbox'), lbInner = $('#lbInner');
function openLightbox(type, src){
  lbInner.innerHTML = (type === 'video')
    ? `<video src="${src}" controls autoplay playsinline></video>`
    : `<img src="${src}" alt="">`;
  lb.classList.add('show');
}
function closeLightbox(){ lb.classList.remove('show'); lbInner.innerHTML = ''; }
$('#lbClose').addEventListener('click', closeLightbox);
lb.addEventListener('click', e=>{ if(e.target === lb) closeLightbox(); });

/* 読み込み＆masonry描画 */
async function load(){
  if(!sb){ $('#gpEmpty').hidden = false; $('#gpEmpty').textContent = '準備中です。'; return; }
  const { data, error } = await sb.from('media').select('*').order('sort',{ascending:true}).order('created_at',{ascending:false});
  if(error){ console.warn(error); $('#gpEmpty').hidden = false; return; }
  const wrap = $('#masonry');
  if(!data.length){ $('#gpEmpty').hidden = false; return; }
  $('#gpEmpty').hidden = true;
  wrap.innerHTML = data.map(x=>{
    const cap = x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : '';
    const media = (x.type === 'video')
      ? `<video src="${esc(x.url)}#t=0.1" muted playsinline preload="metadata"></video><span class="m-play">▶</span>`
      : `<img src="${esc(x.url)}" alt="" loading="lazy">`;
    return `<figure class="m-item" data-type="${x.type}" data-src="${esc(x.url)}">${media}${cap}</figure>`;
  }).join('');
}
$('#masonry').addEventListener('click', e=>{
  const it = e.target.closest('.m-item'); if(!it) return;
  openLightbox(it.dataset.type || 'image', it.dataset.src);
});

load();
