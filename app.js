/* ============================================================
   えま 公式サイト  ─  アプリ本体
   Supabase（DB/Storage/Auth）連携 + 各機能
   ============================================================ */
'use strict';

const CFG = window.APP_CONFIG || {};
const CONFIGURED = /^https?:\/\/.+\.supabase\.co/.test(CFG.SUPABASE_URL || '');
let sb = null;
let isAdmin = false;

if (CONFIGURED && window.supabase) {
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
}

/* ---------- 小物 ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function esc(t){ const d = document.createElement('div'); d.textContent = (t ?? ''); return d.innerHTML; }
function fmtDate(s){
  try { const d = new Date(s); return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
  catch { return ''; }
}
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(()=> t.classList.remove('show'), 2600);
}

/* ---------- 背景：星 & 光の粒子 ---------- */
(function stars(){
  const w = $('#bgStars'); let h='';
  for(let i=0;i<80;i++){ const x=(Math.random()*100).toFixed(2),y=(Math.random()*100).toFixed(2),d=(Math.random()*3).toFixed(2),s=(0.5+Math.random()*1.5).toFixed(2);
    h+=`<i style="left:${x}%;top:${y}%;animation-delay:${d}s;transform:scale(${s})"></i>`; }
  w.innerHTML = h;
})();
(function fx(){
  const c=$('#fx'),ctx=c.getContext('2d'); let W,H,parts=[];
  const resize=()=>{ W=c.width=innerWidth; H=c.height=innerHeight; }; resize(); addEventListener('resize',resize);
  const COL=['#ffffff','#8fd2ff','#b7a0ff','#ffe08a','#ff8fc7'];
  const sp=y=>({x:Math.random()*W,y:y??H+10,r:0.7+Math.random()*2.4,s:0.25+Math.random()*0.9,dr:(Math.random()-0.5)*0.5,c:COL[(Math.random()*COL.length)|0],a:0.3+Math.random()*0.6,tw:Math.random()*6.28});
  for(let i=0;i<Math.min(64,Math.floor(W/24));i++) parts.push(sp(Math.random()*H));
  (function loop(){ ctx.clearRect(0,0,W,H);
    for(const p of parts){ p.y-=p.s; p.x+=p.dr; p.tw+=0.05; ctx.globalAlpha=p.a*(0.55+0.45*Math.sin(p.tw)); ctx.fillStyle=p.c; ctx.shadowColor=p.c; ctx.shadowBlur=9; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.283); ctx.fill(); if(p.y<-10) Object.assign(p,sp(H+10)); }
    ctx.globalAlpha=1; ctx.shadowBlur=0; requestAnimationFrame(loop); })();
})();

/* ---------- ライトボックス ---------- */
const lb = $('#lightbox'), lbInner = $('#lbInner');
function openLightbox(type, src){
  lbInner.innerHTML = '';
  if(type === 'video'){
    const v = document.createElement('video'); v.src = src; v.controls = true; v.autoplay = true; v.playsInline = true;
    lbInner.appendChild(v);
  } else {
    const i = document.createElement('img'); i.src = src; lbInner.appendChild(i);
  }
  lb.classList.add('show');
}
function closeLightbox(){ lb.classList.remove('show'); lbInner.innerHTML=''; }
$('#lbClose').addEventListener('click', closeLightbox);
lb.addEventListener('click', e=>{ if(e.target === lb) closeLightbox(); });

// ギャラリーのクリック（委譲：DB項目・サンプル両対応）
$('#galleryGrid').addEventListener('click', e=>{
  if(e.target.closest('.del-btn')) return;
  const item = e.target.closest('.g-item'); if(!item) return;
  openLightbox(item.dataset.type || 'image', item.dataset.src);
});

/* ============================================================
   ここから下は Supabase 接続が必要
   ============================================================ */
function requireBackend(){
  if(!sb){ toast('準備中：Supabase接続後に使えます'); return false; }
  return true;
}

/* ---------- プロフィール ---------- */
const PROFILE_FIELDS = [
  ['name','名前'],['age','年齢'],['height','身長'],['bwh','スリーサイズ'],['cup','おっぱい❤'],
  ['blood','血液型'],['visual','ビジュアル'],['personality','性格・キャラ'],['hobby','趣味'],
  ['skill','特技'],['likes','好きなもの'],['charm','チャームポイント'],['shop','所属店舗'],
  ['service','接客スタイル'],['reserve','予約'],['message','ひとこと(任意)'],
  ['twitter_url','X(Twitter) URL'],['heaven_url','写メ日記/予約 URL']
];
let profileCache = null;

async function loadProfile(){
  if(!sb) return; // デモ時はHTMLの初期値
  const { data, error } = await sb.from('profile').select('*').eq('id',1).single();
  if(error || !data) return;
  profileCache = data;
  renderProfile(data);
}
function renderProfile(p){
  const rows = [
    ['名 前', esc(p.name)],
    ['年 齢', esc(p.age)],
    ['身 長', esc(p.height)],
    ['スリーサイズ', esc(p.bwh)],
    ['おっぱい❤', esc(p.cup)],
    ['血液型', esc(p.blood)],
    ['ビジュアル', esc(p.visual)],
    ['性 格', esc(p.personality)],
    ['趣 味', esc(p.hobby)],
    ['特 技', esc(p.skill)],
    ['好きなもの', esc(p.likes)],
    ['チャームポイント', esc(p.charm)],
    ['所属店舗', esc(p.shop)],
    ['接客スタイル', esc(p.service)],
    ['予 約', esc(p.reserve)],
  ].filter(r=> r[1] && r[1] !== 'undefined' && r[1] !== 'null');
  $('#profileData').innerHTML = rows.map(r=>`<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');
  $('#profileMsg').textContent = p.message || '';
  // SNS/予約リンクはHTML側の正しい値（@MOE_Emachi / シティヘブン）を使う。
  // DBの古い値で上書きしないよう、ここでは href を変更しない。
}

// プロフィール編集
$('#editProfileBtn').addEventListener('click', ()=>{
  if(!requireBackend()) return;
  const p = profileCache || {};
  $('#peGrid').innerHTML = PROFILE_FIELDS.map(([k,label])=>{
    const v = esc(p[k]);
    const input = (k==='message') ? `<textarea data-k="${k}">${v}</textarea>` : `<input data-k="${k}" value="${v}">`;
    return `<div><label>${label}</label>${input}</div>`;
  }).join('');
  $('#profileModal').classList.add('show');
});
$('#peCancel').addEventListener('click', ()=> $('#profileModal').classList.remove('show'));
$('#peSave').addEventListener('click', async ()=>{
  const upd = {}; $$('#peGrid [data-k]').forEach(el=> upd[el.dataset.k] = el.value.trim());
  upd.updated_at = new Date().toISOString();
  const { error } = await sb.from('profile').update(upd).eq('id',1);
  if(error){ toast('保存に失敗: '+error.message); return; }
  $('#profileModal').classList.remove('show'); toast('プロフィールを更新しました'); loadProfile();
});

/* ---------- ギャラリー ---------- */
const SAMPLE_MEDIA = [
  {src:'images/photo1.jpg', cap:'浴衣 ─ YUKATA'},
  {src:'images/photo3.jpg', cap:'放課後 ─ SCHOOL'},
  {src:'images/photo4.jpg', cap:'おでかけ ─ OUTING'},
  {src:'images/photo5.jpg', cap:'ステージ ─ STAGE'},
  {src:'images/photo2.jpg', cap:'自然体 ─ NATURAL'},
];
function sampleGalleryHTML(){
  return SAMPLE_MEDIA.map(m=>`<figure class="g-item" data-type="image" data-src="${m.src}"><img src="${m.src}" alt="" loading="lazy"><figcaption>${m.cap}</figcaption></figure>`).join('');
}
async function loadGallery(){
  if(!sb) return; // デモ時はサンプルのまま
  const { data, error } = await sb.from('media').select('*').order('created_at',{ascending:false});
  if(error){ console.warn(error); return; }
  const grid = $('#galleryGrid');
  if(!data.length){ grid.innerHTML = sampleGalleryHTML(); $('#galleryEmpty').hidden = true; return; }
  $('#galleryEmpty').hidden = true;
  grid.innerHTML = data.map(m=>{
    const cap = m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : '';
    const del = `<button class="del-btn admin-only" data-del-media="${m.id}" data-url="${esc(m.url)}">削除</button>`;
    if(m.type === 'video'){
      return `<figure class="g-item" data-type="video" data-src="${esc(m.url)}">
        <video src="${esc(m.url)}#t=0.1" muted playsinline preload="metadata"></video>
        <span class="play-badge"></span>${cap}${del}</figure>`;
    }
    return `<figure class="g-item" data-type="image" data-src="${esc(m.url)}">
      <img src="${esc(m.url)}" alt="" loading="lazy">${cap}${del}</figure>`;
  }).join('');
}

// アップロード
$('#uploadBtn').addEventListener('click', async ()=>{
  if(!requireBackend()) return;
  const file = $('#mediaFile').files[0];
  if(!file){ toast('ファイルを選んでください'); return; }
  const isVideo = file.type.startsWith('video');
  const isImage = file.type.startsWith('image');
  if(!isVideo && !isImage){ toast('画像か動画を選んでください'); return; }
  const btn = $('#uploadBtn'); btn.disabled = true;
  const st = $('#uploadStatus'); st.textContent = 'アップロード中…';
  try{
    const safe = file.name.replace(/[^\w.\-]/g,'_');
    const path = `${Date.now()}_${safe}`;
    const { error: upErr } = await sb.storage.from('media').upload(path, file, { cacheControl:'3600', upsert:false });
    if(upErr) throw upErr;
    const { data:{ publicUrl } } = sb.storage.from('media').getPublicUrl(path);
    const { error: insErr } = await sb.from('media').insert({ type: isVideo?'video':'image', url: publicUrl, caption: $('#mediaCaption').value.trim() || null });
    if(insErr) throw insErr;
    st.textContent = '完了！'; $('#mediaFile').value=''; $('#mediaCaption').value='';
    toast('ギャラリーに追加しました'); loadGallery();
  }catch(e){ st.textContent='失敗: '+e.message; toast('アップロード失敗'); }
  finally{ btn.disabled = false; setTimeout(()=> st.textContent='', 4000); }
});

// 削除（委譲）
$('#galleryGrid').addEventListener('click', async e=>{
  const b = e.target.closest('[data-del-media]'); if(!b) return;
  e.stopPropagation();
  if(!confirm('この投稿を削除しますか？')) return;
  const id = b.dataset.delMedia, url = b.dataset.url;
  try{
    const path = url.split('/media/')[1];
    if(path) await sb.storage.from('media').remove([decodeURIComponent(path)]);
    await sb.from('media').delete().eq('id', id);
    toast('削除しました'); loadGallery();
  }catch(err){ toast('削除失敗: '+err.message); }
});

/* ---------- 日記 ---------- */
async function loadDiary(){
  if(!sb) return;
  const { data, error } = await sb.from('diary').select('*').order('created_at',{ascending:false});
  if(error){ console.warn(error); return; }
  const feed = $('#diaryFeed');
  if(!data.length){ feed.innerHTML=''; $('#diaryEmpty').hidden=false; return; }
  $('#diaryEmpty').hidden = true;
  feed.innerHTML = data.map(d=>`
    <article class="diary-card">
      <div class="body">${esc(d.body)}</div>
      <div class="date">${fmtDate(d.created_at)}</div>
      <button class="del-btn admin-only" data-del-diary="${d.id}">削除</button>
    </article>`).join('');
}
$('#diaryPostBtn').addEventListener('click', async ()=>{
  if(!requireBackend()) return;
  const body = $('#diaryInput').value.trim(); if(!body){ toast('内容を入力してください'); return; }
  const { error } = await sb.from('diary').insert({ body });
  if(error){ toast('投稿失敗: '+error.message); return; }
  $('#diaryInput').value=''; toast('投稿しました'); loadDiary();
});
$('#diaryFeed').addEventListener('click', async e=>{
  const b = e.target.closest('[data-del-diary]'); if(!b) return;
  if(!confirm('この投稿を削除しますか？')) return;
  const { error } = await sb.from('diary').delete().eq('id', b.dataset.delDiary);
  if(error){ toast('削除失敗'); return; } toast('削除しました'); loadDiary();
});

/* ---------- コメント ---------- */
async function loadComments(){
  if(!sb) return;
  const { data, error } = await sb.from('comments').select('*').order('created_at',{ascending:true});
  if(error){ console.warn(error); return; }
  const tops = data.filter(c=> !c.parent_id);
  const repliesByParent = {};
  data.filter(c=> c.parent_id).forEach(r=> (repliesByParent[r.parent_id] ||= []).push(r));
  const list = $('#commentList');
  if(!tops.length){ list.innerHTML=''; $('#commentEmpty').hidden=false; return; }
  $('#commentEmpty').hidden = true;
  list.innerHTML = tops.map(c=>{
    const reps = (repliesByParent[c.id]||[]).map(r=>`
      <div class="reply"><div class="c-head"><span class="c-name"></span><span class="c-date">${fmtDate(r.created_at)}</span>
      <button class="del-btn admin-only" data-del-comment="${r.id}">削除</button></div>
      <div class="c-body">${esc(r.body)}</div></div>`).join('');
    return `<div class="comment" data-id="${c.id}">
      <div class="c-head">
        <span class="c-name">${esc(c.name) || '名無しさん'}</span>
        <span class="c-date">${fmtDate(c.created_at)}</span>
      </div>
      <div class="c-body">${esc(c.body)}</div>
      <div class="c-actions admin-only">
        <button class="btn-ghost" data-reply="${c.id}">返信</button>
        <button class="del-btn" data-del-comment="${c.id}">削除</button>
      </div>
      ${reps}
    </div>`;
  }).join('');
}
// 閲覧者の投稿
$('#commentForm').addEventListener('submit', async e=>{
  e.preventDefault();
  if(!requireBackend()) return;
  const body = $('#commentBody').value.trim(); if(!body) return;
  const name = $('#commentName').value.trim() || null;
  const { error } = await sb.from('comments').insert({ name, body, is_admin:false, parent_id:null });
  if(error){ toast('投稿失敗: '+error.message); return; }
  $('#commentBody').value=''; toast('コメントありがとう♡'); loadComments();
});
// 返信・削除（委譲）
$('#commentList').addEventListener('click', async e=>{
  const rep = e.target.closest('[data-reply]');
  const del = e.target.closest('[data-del-comment]');
  if(rep){
    const id = rep.dataset.reply;
    const c = rep.closest('.comment');
    if(c.querySelector('.reply-form')) return;
    const f = document.createElement('div'); f.className='reply-form';
    f.innerHTML = `<textarea placeholder="えまとして返信…"></textarea><button class="btn">送信</button>`;
    c.appendChild(f);
    f.querySelector('button').addEventListener('click', async ()=>{
      const body = f.querySelector('textarea').value.trim(); if(!body) return;
      const { error } = await sb.from('comments').insert({ body, is_admin:true, parent_id:id });
      if(error){ toast('返信失敗: '+error.message); return; }
      toast('返信しました'); loadComments();
    });
    return;
  }
  if(del){
    if(!confirm('このコメントを削除しますか？')) return;
    const { error } = await sb.from('comments').delete().eq('id', del.dataset.delComment);
    if(error){ toast('削除失敗'); return; } toast('削除しました'); loadComments();
  }
});

/* ---------- 管理者ログイン ---------- */
function setAdmin(on){
  isAdmin = on;
  document.body.classList.toggle('is-admin', on);
}
$('#adminFab').addEventListener('click', async ()=>{
  if(isAdmin){
    if(confirm('ログアウトしますか？')){ if(sb) await sb.auth.signOut(); setAdmin(false); toast('ログアウトしました'); }
  } else {
    $('#loginErr').textContent=''; $('#adminPass').value='';
    $('#loginModal').classList.add('show'); setTimeout(()=>$('#adminPass').focus(),50);
  }
});
$('#loginCancel').addEventListener('click', ()=> $('#loginModal').classList.remove('show'));
$('#adminPass').addEventListener('keydown', e=>{ if(e.key==='Enter') $('#loginBtn').click(); });
$('#loginBtn').addEventListener('click', async ()=>{
  if(!sb){ $('#loginErr').textContent='Supabase未接続です（公開後に有効）'; return; }
  const password = $('#adminPass').value; if(!password) return;
  $('#loginBtn').disabled = true; $('#loginErr').textContent='確認中…';
  const { error } = await sb.auth.signInWithPassword({ email: CFG.ADMIN_EMAIL, password });
  $('#loginBtn').disabled = false;
  if(error){ $('#loginErr').textContent='パスワードが違います'; return; }
  $('#loginModal').classList.remove('show'); setAdmin(true); toast('管理モードに入りました 🛠');
  loadComments(); loadGallery(); loadDiary();
});

/* ---------- 起動 ---------- */
(async function init(){
  if(sb){
    // 既存セッション復帰
    const { data:{ session } } = await sb.auth.getSession();
    if(session) setAdmin(true);
    sb.auth.onAuthStateChange((_e, s)=> setAdmin(!!s));
    await Promise.all([loadProfile(), loadGallery(), loadDiary(), loadComments()]);
    // リアルタイム更新（ベストエフォート）
    try{
      sb.channel('public-all')
        .on('postgres_changes',{event:'*',schema:'public',table:'comments'}, loadComments)
        .on('postgres_changes',{event:'*',schema:'public',table:'diary'}, loadDiary)
        .on('postgres_changes',{event:'*',schema:'public',table:'media'}, loadGallery)
        .subscribe();
    }catch(_){}
  } else {
    // デモモード：サンプル表示のまま。バックエンド機能は接続後に有効化。
    console.info('[DEMO] Supabase未接続。config.js を設定すると全機能が有効になります。');
  }
})();
