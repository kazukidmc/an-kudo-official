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

/* ---------- 画像のダウンロード抑止（右クリック/ドラッグ/長押し保存を防ぐ） ---------- */
(function protectImages(){
  document.addEventListener('contextmenu', e=>{ if(e.target && e.target.tagName === 'IMG') e.preventDefault(); }, { capture:true });
  document.addEventListener('dragstart',   e=>{ if(e.target && e.target.tagName === 'IMG') e.preventDefault(); }, { capture:true });
})();

/* ---------- YouTube ヘルパー（埋め込み・容量ゼロ） ---------- */
function ytId(s){
  if(!s) return '';
  s = String(s).trim();
  if(/^[\w-]{11}$/.test(s)) return s;                       // すでにID
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m ? m[1] : '';
}
function isYouTube(m){ return m && typeof m.url === 'string' && m.url.indexOf('youtube:') === 0; }
function ytIdOf(m){ return m.url.slice(8); }
function ytThumb(id, q){ return `https://img.youtube.com/vi/${id}/${q || 'hqdefault'}.jpg`; }

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
  if(type === 'youtube'){
    lbInner.innerHTML = `<div class="lb-yt"><iframe src="https://www.youtube.com/embed/${src}?autoplay=1&rel=0&playsinline=1" title="YouTube" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  } else if(type === 'video'){
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
// 大画像クリックで拡大表示
$('#gmStage') && $('#gmStage').addEventListener('click', ()=>{
  const s = $('#gmStage'); if(s && s.dataset.src) openLightbox(s.dataset.type || 'image', s.dataset.src);
});

/* ============================================================
   ここから下は Supabase 接続が必要
   ============================================================ */
function requireBackend(){
  if(!sb){ toast('準備中：Supabase接続後に使えます'); return false; }
  return true;
}

/* ---------- プロフィール ----------
   DBの message 列に JSON で保存（スキーマ変更不要・全項目「任意」で空欄OK）。
   保存がまだ無ければ DEFAULT_PROFILE を表示。 */
const PROFILE_SCHEMA = [
  ['name','名 前'],['age','年 齢'],['height','身 長'],['bwh','スリーサイズ'],['cup','おっぱい❤'],
  ['blood','血液型'],['visual','ビジュアル'],['personality','性格・キャラ'],['hobby','趣 味'],
  ['skill','特 技'],['likes','好きなもの'],['charm','チャームポイント'],['shop','所属店舗'],
  ['service','接客スタイル'],['reserve','予 約']
];
const LINK_SCHEMA = [
  ['twitter_url','X(Twitter) URL'],['heaven_url','写メ日記・予約 URL']
];
/* おみくじ：種類（確率の重み）と既定メッセージ */
const OMIKUJI_TYPES = [
  {key:'daikichi', label:'大吉', weight:20, cls:'r-daikichi'},
  {key:'chukichi', label:'中吉', weight:40, cls:'r-chukichi'},
  {key:'shokichi', label:'小吉', weight:35, cls:'r-shokichi'},
  {key:'kyo',      label:'凶',   weight:5,  cls:'r-kyo'},
];
const DEFAULT_OMIKUJI = {
  daikichi:{ messages:['最高の一日になる予感♡ えまと両想い確定！','大吉ｷﾀ━━━♡ 今日のあなたは無敵だよ！'], images:[] },
  chukichi:{ messages:['いいことありそう♪ えまに会いに来てね','中吉♡ 笑顔でいればもっと良くなる！'], images:[] },
  shokichi:{ messages:['コツコツが吉。えまも応援してるよ！','小吉♡ 小さな幸せ、見つけてね'], images:[] },
  kyo:{ messages:['今日は無理しないで。えまがギュッてしてあげる♡','凶でも大丈夫、明日は上がるだけ！'], images:[] },
};
const OMIKUJI_KEYS = OMIKUJI_TYPES.map(t=>t.key);
function normalizeOmikuji(o){
  o = (o && typeof o === 'object') ? o : {};
  OMIKUJI_KEYS.forEach(k=>{
    o[k] = (o[k] && typeof o[k] === 'object') ? o[k] : {};
    o[k].messages = Array.isArray(o[k].messages) ? o[k].messages : [];
    o[k].images   = Array.isArray(o[k].images)   ? o[k].images   : [];
  });
  return o;
}

const DEFAULT_PROFILE = {
  name:'えま', age:'永遠の21歳', height:'149cm', bwh:'B88 W56 H86', cup:'Eカップ❤',
  blood:'B型', visual:'むちむちぷりてぃがーる', personality:'明るい、えっちなお姉さん',
  hobby:'旅行、ぎゃんぶる、散歩', skill:'ニャンちゅうのモノマネ、騎♡位', likes:'炭水化物',
  charm:'おしりのﾎｸﾛ', shop:'萌えフードル学園大宮本校', service:'甘々いちゃいちゃからすんごいやつまで！',
  reserve:'シティヘブンから',
  twitter_url:'https://x.com/MOE_Emachi',
  heaven_url:'https://www.cityheaven.net/saitama/A1101/A110101/moegaku/girlid-44311496/',
  hero_url:'images/photo1.jpg',      // トップ写真（運営が変更可）
  profile_url:'images/photo2.jpg',   // プロフィール写真（運営が変更可）
  recommends:[],                     // おすすめ商品（アフィリエイト）
  omikuji: JSON.parse(JSON.stringify(DEFAULT_OMIKUJI))   // おみくじの結果（運営が編集可）
};
let profileCache = {...DEFAULT_PROFILE};

async function loadProfile(){
  let data = {...DEFAULT_PROFILE};
  if(sb){
    const { data:row } = await sb.from('profile').select('message').eq('id',1).single();
    if(row && row.message){
      try{ const j = JSON.parse(row.message); if(j && typeof j === 'object') data = {...DEFAULT_PROFILE, ...j}; }
      catch(_){ /* 旧テキストはJSONでないので無視し、初期値を表示 */ }
    }
  }
  data.omikuji = normalizeOmikuji(data.omikuji);
  profileCache = data;
  renderProfile(data);
  renderOmikujiEditor();
}
function renderProfile(p){
  const rows = PROFILE_SCHEMA
    .map(([k,label])=> [label, esc(p[k])])
    .filter(r=> r[1] && r[1] !== 'undefined' && r[1] !== 'null');
  $('#profileData').innerHTML = rows.map(r=>`<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');
  if(p.twitter_url){ $('#snsBtn').href = p.twitter_url; }
  if(p.heaven_url){ const h=$('#heavenBtn'); if(h) h.href = p.heaven_url; }
  // トップ写真・プロフィール写真（運営が変更したURL）
  const hero = $('.hero-img'); if(hero && p.hero_url && hero.getAttribute('src') !== p.hero_url) hero.src = p.hero_url;
  const ppic = $('#profilePic'); if(ppic && p.profile_url && ppic.getAttribute('src') !== p.profile_url) ppic.src = p.profile_url;
  renderRecommends(Array.isArray(p.recommends) ? p.recommends : []);
}

/* ---------- プロフィールJSONの保存（画像・おすすめ共通） ---------- */
async function saveProfile(){
  if(!sb){ toast('保存にはSupabase接続が必要です'); return false; }
  const { error } = await sb.from('profile').update({ message: JSON.stringify(profileCache), updated_at: new Date().toISOString() }).eq('id',1);
  if(error){ toast('保存に失敗: '+error.message); return false; }
  return true;
}

/* ---------- トップ／プロフィール写真の変更（運営） ---------- */
function changeImage(targetKey){
  if(!requireBackend()) return;
  const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.onchange = async ()=>{
    const file = inp.files[0]; if(!file) return;
    toast('アップロード中…');
    try{
      const path = `prof_${Date.now()}_${file.name.replace(/[^\w.\-]/g,'_')}`;
      const { error:upErr } = await sb.storage.from('media').upload(path, file, { cacheControl:'3600', upsert:false });
      if(upErr) throw upErr;
      const { data:{ publicUrl } } = sb.storage.from('media').getPublicUrl(path);
      profileCache[targetKey] = publicUrl;
      if(await saveProfile()){ toast('写真を変更しました'); renderProfile(profileCache); }
    }catch(e){ toast('失敗: '+e.message); }
  };
  inp.click();
}
$('#heroEditBtn') && $('#heroEditBtn').addEventListener('click', ()=> changeImage('hero_url'));
$('#profEditBtn') && $('#profEditBtn').addEventListener('click', ()=> changeImage('profile_url'));

/* ---------- おすすめ（アフィリエイト） ---------- */
function renderRecommends(list){
  const wrap = $('#recommendList'); if(!wrap) return;
  if(!list.length){ wrap.innerHTML=''; $('#recoEmpty').hidden=false; $('#recoHint').hidden=true; return; }
  $('#recoEmpty').hidden = true;
  $('#recoHint').hidden = (list.length < 2);
  wrap.innerHTML = list.map((r,i)=>{
    const img = r.img ? `<img class="reco-img" src="${esc(r.img)}" alt="" loading="lazy">` : '';
    const mv  = `<div class="mv-bar admin-only"><button class="mv-btn" data-mv-reco="${i}" data-dir="-1" title="前へ">◀</button><button class="mv-btn" data-mv-reco="${i}" data-dir="1" title="後ろへ">▶</button></div>`;
    const del = `<button class="del-btn admin-only" data-del-reco="${i}">削除</button>`;
    return `<a class="reco-card" href="${esc(r.url)}" target="_blank" rel="noopener nofollow sponsored">
      ${img}
      <div class="reco-body"><div class="reco-title">${esc(r.title) || '商品を見る'}</div><span class="reco-cta">▶ 見てみる</span></div>
      ${mv}${del}
    </a>`;
  }).join('');
}
$('#recoAddBtn') && $('#recoAddBtn').addEventListener('click', async ()=>{
  if(!requireBackend()) return;
  const title = $('#recoTitle').value.trim();
  const url = $('#recoUrl').value.trim();
  if(!/^https?:\/\//.test(url)){ toast('アフィリエイトURL（https://…）を入れてください'); return; }
  const btn = $('#recoAddBtn'); btn.disabled = true; const st = $('#recoStatus'); st.textContent = '追加中…';
  try{
    let img = $('#recoImg').value.trim();
    const file = $('#recoFile').files[0];
    if(file){
      const path = `reco_${Date.now()}_${file.name.replace(/[^\w.\-]/g,'_')}`;
      const { error:upErr } = await sb.storage.from('media').upload(path, file, { cacheControl:'3600', upsert:false });
      if(upErr) throw upErr;
      img = sb.storage.from('media').getPublicUrl(path).data.publicUrl;
    }
    if(!Array.isArray(profileCache.recommends)) profileCache.recommends = [];
    profileCache.recommends.unshift({ url, title, img });
    if(await saveProfile()){
      st.textContent='完了！'; $('#recoTitle').value=''; $('#recoUrl').value=''; $('#recoImg').value=''; $('#recoFile').value='';
      toast('おすすめを追加しました'); renderRecommends(profileCache.recommends);
    }
  }catch(e){ st.textContent='失敗: '+e.message; toast('追加に失敗'); }
  finally{ btn.disabled=false; setTimeout(()=> st.textContent='', 4000); }
});
$('#recommendList') && $('#recommendList').addEventListener('click', async e=>{
  const mv  = e.target.closest('[data-mv-reco]');
  const del = e.target.closest('[data-del-reco]');
  if(!mv && !del) return;
  e.preventDefault();
  const arr = Array.isArray(profileCache.recommends) ? profileCache.recommends : (profileCache.recommends = []);
  if(mv){
    const i = parseInt(mv.dataset.mvReco,10), dir = parseInt(mv.dataset.dir,10), j = i + dir;
    if(j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    if(await saveProfile()){ toast('順番を変更しました'); renderRecommends(arr); }
    return;
  }
  if(!confirm('このおすすめを削除しますか？')) return;
  arr.splice(parseInt(del.dataset.delReco,10), 1);
  if(await saveProfile()){ toast('削除しました'); renderRecommends(arr); }
});

/* ---------- おみくじ ---------- */
const _omiSound = (()=>{ try{ const a = new Audio('sounds/omikuji.mp3'); a.preload='auto'; a.volume=0.2; return a; }catch(_){ return null; } })();
function playOmikujiSound(){ if(!_omiSound) return; try{ _omiSound.currentTime = 0; const p = _omiSound.play(); if(p && p.catch) p.catch(()=>{}); }catch(_){} }
function omiToday(){ const d = new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function omiDrawnToday(){ try{ return localStorage.getItem('omikuji_date') === omiToday(); }catch(_){ return false; } }
function updateOmikujiButtonState(){
  const done = omiDrawnToday() && !isAdmin;
  const b = $('#omikujiBtn'), d = $('#omikujiDone');
  if(b) b.classList.toggle('disabled', done);
  if(d) d.hidden = !done;
}
function drawOmikuji(){
  const o = profileCache.omikuji = normalizeOmikuji(profileCache.omikuji);
  const total = OMIKUJI_TYPES.reduce((s,t)=> s + t.weight, 0);
  let r = Math.random()*total, picked = OMIKUJI_TYPES[OMIKUJI_TYPES.length-1];
  for(const t of OMIKUJI_TYPES){ if(r < t.weight){ picked = t; break; } r -= t.weight; }
  const d = o[picked.key];
  const msgs = (d.messages && d.messages.length) ? d.messages : DEFAULT_OMIKUJI[picked.key].messages;
  const imgs = d.images || [];
  const msg = msgs.length ? msgs[(Math.random()*msgs.length)|0] : '';
  const img = imgs.length ? imgs[(Math.random()*imgs.length)|0] : '';
  $('#omikujiStage').innerHTML = `<div class="omi-result ${picked.cls}">
    <div class="omi-kanji">${picked.label}</div>
    ${img ? `<img class="omi-img" src="${esc(img)}" alt="">` : ''}
    ${msg ? `<div class="omi-msg">${esc(msg)}</div>` : ''}
  </div>`;
}
$('#omikujiBtn') && $('#omikujiBtn').addEventListener('click', ()=>{
  if(!isAdmin && omiDrawnToday()){ toast('今日はもう引いたよ！また明日♡'); updateOmikujiButtonState(); return; }
  playOmikujiSound();
  drawOmikuji();
  try{ localStorage.setItem('omikuji_date', omiToday()); }catch(_){}
  updateOmikujiButtonState();
});

/* おみくじ編集（運営：結果ごとに画像・メッセージを複数登録） */
function renderOmikujiEditor(){
  const wrap = $('#omikujiEditor'); if(!wrap) return;
  const o = profileCache.omikuji = normalizeOmikuji(profileCache.omikuji);
  wrap.innerHTML = OMIKUJI_TYPES.map(t=>{
    const d = o[t.key];
    const msgs = d.messages.map((m,i)=>`<span class="omi-chip">${esc(m)}<button data-omi-delmsg="${t.key}:${i}" title="削除">✕</button></span>`).join('');
    const imgs = d.images.map((u,i)=>`<span class="omi-thumb"><img src="${esc(u)}" alt=""><button data-omi-delimg="${t.key}:${i}" title="削除">✕</button></span>`).join('');
    return `<div class="omi-edit-block">
      <p class="omi-edit-title ${t.cls}">${t.label}</p>
      <div class="omi-chips">${msgs || '<span class="dim">メッセージ未登録（無ければ既定文を表示）</span>'}</div>
      <div class="omi-add"><input type="text" data-omi-msgkey="${t.key}" placeholder="メッセージを追加"><button class="btn-ghost" data-omi-addmsg="${t.key}">＋文</button></div>
      <div class="omi-thumbs">${imgs}</div>
      <div class="omi-add"><input type="file" accept="image/*" data-omi-imgkey="${t.key}"><button class="btn-ghost" data-omi-addimg="${t.key}">＋画像</button><span class="dim">画像が無ければ文字だけ表示</span></div>
    </div>`;
  }).join('');
}
$('#omikujiEditor') && $('#omikujiEditor').addEventListener('click', async e=>{
  const addMsg = e.target.closest('[data-omi-addmsg]'), delMsg = e.target.closest('[data-omi-delmsg]');
  const addImg = e.target.closest('[data-omi-addimg]'), delImg = e.target.closest('[data-omi-delimg]');
  if(!addMsg && !delMsg && !addImg && !delImg) return;
  const o = profileCache.omikuji = normalizeOmikuji(profileCache.omikuji);
  if(addMsg){
    const key = addMsg.dataset.omiAddmsg;
    const inp = document.querySelector(`#omikujiEditor [data-omi-msgkey="${key}"]`);
    const v = (inp.value || '').trim(); if(!v) return;
    o[key].messages.push(v);
    if(await saveProfile()){ toast('メッセージを追加しました'); renderOmikujiEditor(); }
    return;
  }
  if(delMsg){ const [key,i] = delMsg.dataset.omiDelmsg.split(':'); o[key].messages.splice(+i,1); if(await saveProfile()){ toast('削除しました'); renderOmikujiEditor(); } return; }
  if(addImg){
    if(!requireBackend()) return;
    const key = addImg.dataset.omiAddimg;
    const fin = document.querySelector(`#omikujiEditor [data-omi-imgkey="${key}"]`);
    const file = fin.files[0]; if(!file){ toast('画像を選んでください'); return; }
    toast('アップロード中…');
    try{
      const path = `omi_${key}_${Date.now()}_${file.name.replace(/[^\w.\-]/g,'_')}`;
      const { error:up } = await sb.storage.from('media').upload(path, file, { cacheControl:'3600', upsert:false }); if(up) throw up;
      const url = sb.storage.from('media').getPublicUrl(path).data.publicUrl;
      o[key].images.push(url);
      if(await saveProfile()){ toast('画像を追加しました'); renderOmikujiEditor(); }
    }catch(err){ toast('失敗: '+err.message); }
    return;
  }
  if(delImg){ const [key,i] = delImg.dataset.omiDelimg.split(':'); o[key].images.splice(+i,1); if(await saveProfile()){ toast('削除しました'); renderOmikujiEditor(); } return; }
});
updateOmikujiButtonState();

// プロフィール編集（全項目「任意」＝空欄のまま保存してもOK）
$('#editProfileBtn').addEventListener('click', ()=>{
  if(!requireBackend()) return;
  const p = profileCache || {};
  const fields = [...PROFILE_SCHEMA, ...LINK_SCHEMA];
  $('#peGrid').innerHTML = fields.map(([k,label])=>{
    const v = esc(p[k]);
    const long = (k==='service' || k==='personality');
    const input = long ? `<textarea data-k="${k}">${v}</textarea>` : `<input data-k="${k}" value="${v}">`;
    return `<div><label>${label}（任意）</label>${input}</div>`;
  }).join('');
  $('#profileModal').classList.add('show');
});
$('#peCancel').addEventListener('click', ()=> $('#profileModal').classList.remove('show'));
$('#peSave').addEventListener('click', async ()=>{
  $$('#peGrid [data-k]').forEach(el=> profileCache[el.dataset.k] = el.value.trim());
  if(await saveProfile()){ $('#profileModal').classList.remove('show'); toast('プロフィールを更新しました'); loadProfile(); }
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
let galleryData = [];   // 現在の表示順
let galleryIndex = 0;   // 大画像に表示中のインデックス
let gallerySlideTimer = null;

async function loadGallery(){
  if(!sb) return;
  const { data, error } = await sb.from('media').select('*').order('sort',{ascending:true}).order('created_at',{ascending:false});
  if(error){ console.warn(error); return; }
  galleryData = data.length ? data : SAMPLE_MEDIA.map((m,i)=> ({ id:'sample-'+i, type:'image', url:m.src, caption:m.cap }));
  $('#galleryEmpty').hidden = !!galleryData.length;
  if(galleryIndex >= galleryData.length) galleryIndex = 0;
  renderGalleryMain(); renderGalleryThumbs(); startGallerySlideshow();
}
function renderGalleryMain(){
  const stage = $('#gmStage'); if(!stage || !galleryData.length) return;
  const m = galleryData[galleryIndex];
  let media, type = m.type, src = m.url;
  if(isYouTube(m)){
    const id = ytIdOf(m); type = 'youtube'; src = id;
    media = `<img class="gm-media" src="${ytThumb(id,'hqdefault')}" alt=""><span class="play-badge"></span>`;
  } else if(m.type === 'video'){
    media = `<video class="gm-media" src="${esc(m.url)}#t=0.1" muted playsinline preload="metadata"></video><span class="play-badge"></span>`;
  } else {
    media = `<img class="gm-media" src="${esc(m.url)}" alt="">`;
  }
  const cap = m.caption ? `<figcaption class="gm-cap">${esc(m.caption)}</figcaption>` : '';
  stage.innerHTML = media + cap;
  stage.dataset.type = type; stage.dataset.src = src;
}
function renderGalleryThumbs(){
  const wrap = $('#galleryThumbs'); if(!wrap) return;
  wrap.innerHTML = galleryData.map((m,i)=>{
    const real = m.id && !String(m.id).startsWith('sample');
    const media = isYouTube(m)
      ? `<img src="${ytThumb(ytIdOf(m),'mqdefault')}" alt="" loading="lazy"><span class="t-play">▶</span>`
      : (m.type === 'video'
        ? `<video src="${esc(m.url)}#t=0.1" muted preload="metadata"></video><span class="t-play">▶</span>`
        : `<img src="${esc(m.url)}" alt="" loading="lazy">`);
    const adm = real ? `<div class="thumb-admin admin-only">
        <button class="t-mv" data-mv-media="${m.id}" data-dir="-1" title="前へ">◀</button>
        <button class="t-del" data-del-media="${m.id}" data-url="${esc(m.url)}" title="削除">✕</button>
        <button class="t-mv" data-mv-media="${m.id}" data-dir="1" title="後ろへ">▶</button></div>` : '';
    return `<div class="thumb${i===galleryIndex?' active':''}" data-idx="${i}">${media}${adm}</div>`;
  }).join('');
}
function markActiveThumb(){ $$('#galleryThumbs .thumb').forEach((t,i)=> t.classList.toggle('active', i===galleryIndex)); }
function showGallery(i){
  if(!galleryData.length) return;
  galleryIndex = (i + galleryData.length) % galleryData.length;
  renderGalleryMain(); markActiveThumb(); startGallerySlideshow();   // 手動操作でタイマーリセット
}
function startGallerySlideshow(){
  clearInterval(gallerySlideTimer);
  if(galleryData.length < 2) return;
  gallerySlideTimer = setInterval(()=>{
    let n; do { n = Math.floor(Math.random()*galleryData.length); } while(n === galleryIndex);
    galleryIndex = n; renderGalleryMain(); markActiveThumb();
  }, 5000);   // 5秒ごとにランダムで大画像を変更
}
// 左右ナビ＆サムネ選択
$('#gmPrev') && $('#gmPrev').addEventListener('click', ()=> showGallery(galleryIndex - 1));
$('#gmNext') && $('#gmNext').addEventListener('click', ()=> showGallery(galleryIndex + 1));
$('#galleryThumbs') && $('#galleryThumbs').addEventListener('click', e=>{
  if(e.target.closest('.thumb-admin')) return;
  const t = e.target.closest('.thumb'); if(!t) return;
  showGallery(parseInt(t.dataset.idx,10));
});

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

// YouTube動画を追加（埋め込み・Supabase容量を使わない）
$('#ytAddBtn') && $('#ytAddBtn').addEventListener('click', async ()=>{
  if(!requireBackend()) return;
  const id = ytId($('#ytUrl').value);
  if(!id){ toast('YouTubeのURLを正しく貼ってください'); return; }
  const { error } = await sb.from('media').insert({ type:'video', url:'youtube:'+id, caption: $('#mediaCaption').value.trim() || null });
  if(error){ toast('追加失敗: '+error.message); return; }
  $('#ytUrl').value=''; $('#mediaCaption').value=''; toast('YouTube動画を追加しました'); loadGallery();
});

// 運営：サムネの並び替え（◀▶）・削除（✕）
$('#galleryThumbs') && $('#galleryThumbs').addEventListener('click', async e=>{
  const mv  = e.target.closest('[data-mv-media]');
  const del = e.target.closest('[data-del-media]');
  if(!mv && !del) return;
  e.stopPropagation();
  if(mv){
    const id = mv.dataset.mvMedia, dir = parseInt(mv.dataset.dir,10);
    const idx = galleryData.findIndex(m=> String(m.id) === String(id)); const j = idx + dir;
    if(idx < 0 || j < 0 || j >= galleryData.length) return;
    [galleryData[idx], galleryData[j]] = [galleryData[j], galleryData[idx]];
    try{
      await Promise.all(galleryData.map((m,i)=> sb.from('media').update({ sort:i }).eq('id', m.id)));
      toast('順番を変更しました'); loadGallery();
    }catch(err){ toast('順番変更に失敗: '+err.message); }
    return;
  }
  if(!confirm('この投稿を削除しますか？')) return;
  const id = del.dataset.delMedia, url = del.dataset.url;
  try{
    const path = url.split('/media/')[1];
    if(path) await sb.storage.from('media').remove([decodeURIComponent(path)]);
    await sb.from('media').delete().eq('id', id);
    toast('削除しました'); loadGallery();
  }catch(err){ toast('削除失敗: '+err.message); }
});

/* ---------- 日記 ---------- */
let diaryCache = { posts:[], byPost:{} };
let currentDiaryPost = null;
async function loadDiary(){
  if(!sb) return;
  const [pRes, cRes] = await Promise.all([
    sb.from('diary').select('*').order('created_at',{ascending:false}),
    sb.from('comments').select('*').order('created_at',{ascending:true})
  ]);
  if(pRes.error){ console.warn(pRes.error); return; }
  const posts = pRes.data || [];
  const dcs = (cRes.error ? [] : (cRes.data||[])).filter(c=> c.diary_id);   // 日記へのコメントのみ
  const byPost = {}; dcs.forEach(c=> (byPost[c.diary_id] ||= []).push(c));
  diaryCache = { posts, byPost };
  const feed = $('#diaryFeed');
  if(!posts.length){ feed.innerHTML=''; $('#diaryEmpty').hidden=false; $('#diaryHint').hidden=true; return; }
  $('#diaryEmpty').hidden = true;
  $('#diaryHint').hidden = (posts.length < 2);
  feed.innerHTML = posts.map(d=>{
    const tops = (byPost[d.id]||[]).filter(c=> !c.parent_id);
    const latest = tops[tops.length-1];   // 最新1件のみ表示
    const preview = latest
      ? `<div class="diary-latest">💬 <b>${esc(latest.name)||'名無し'}</b>：${esc(latest.body)}${tops.length>1?` <span class="dim">他${tops.length-1}件</span>`:''}</div>`
      : `<div class="diary-latest dim">タップしてコメントしてね♡</div>`;
    return `<article class="diary-card" data-post="${d.id}">
      <div class="body">${esc(d.body)}</div>
      <div class="date">${fmtDate(d.created_at)}</div>
      ${preview}
      <span class="diary-open">タップで全コメント ›</span>
      <button class="del-btn admin-only" data-del-diary="${d.id}">削除</button>
    </article>`;
  }).join('');
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

/* 投稿タップ → コメント詳細を開く */
$('#diaryFeed').addEventListener('click', e=>{
  if(e.target.closest('[data-del-diary]')) return;
  const card = e.target.closest('.diary-card'); if(!card) return;
  openDiaryDetail(card.dataset.post);
});
function diaryCommentCardHtml(c, replies){
  const reps = (replies||[]).map(r=>`<div class="reply"><div class="c-head"><span class="c-name"></span><span class="c-date">${fmtDate(r.created_at)}</span><button class="del-btn admin-only" data-del-comment="${r.id}">削除</button></div><div class="c-body">${esc(r.body)}</div></div>`).join('');
  return `<div class="comment" data-id="${c.id}">
    <div class="c-head"><span class="c-name">${esc(c.name)||'名無しさん'}</span><span class="c-date">${fmtDate(c.created_at)}</span></div>
    <div class="c-body">${esc(c.body)}</div>
    <div class="c-actions admin-only"><button class="btn-ghost" data-reply="${c.id}" data-diary="${esc(c.diary_id)}">返信</button><button class="del-btn" data-del-comment="${c.id}">削除</button></div>
    ${reps}
  </div>`;
}
function openDiaryDetail(postId){
  currentDiaryPost = postId;
  const post = diaryCache.posts.find(p=> String(p.id) === String(postId)); if(!post) return;
  const all = diaryCache.byPost[postId] || [];
  const tops = all.filter(c=> !c.parent_id);
  const repliesByParent = {}; all.filter(c=> c.parent_id).forEach(r=> (repliesByParent[r.parent_id] ||= []).push(r));
  const commentsHtml = tops.length
    ? tops.slice().reverse().map(c=> diaryCommentCardHtml(c, repliesByParent[c.id])).join('')   // 新しい順で全件
    : '<p class="dim" style="text-align:center">まだコメントがないよ。最初のひとことを♡</p>';
  $('#diaryDetail').innerHTML = `
    <div class="dd-post"><div class="dd-body">${esc(post.body)}</div><div class="dd-date">${fmtDate(post.created_at)}</div></div>
    <p class="dd-label">💬 コメント（${tops.length}）</p>
    <div class="dd-comments">${commentsHtml}</div>
    <form class="comment-form dd-form" data-post="${esc(postId)}">
      <input type="text" class="dd-name" placeholder="お名前（任意）" maxlength="24">
      <textarea class="dd-body-in" placeholder="この投稿にコメント♡" maxlength="400" required></textarea>
      <button class="btn" type="submit">コメントする</button>
    </form>`;
  $('#diaryModal').classList.add('show');
}
async function refreshDiaryDetail(){ await loadDiary(); if(currentDiaryPost) openDiaryDetail(currentDiaryPost); }
// 詳細内：閲覧者のコメント投稿
$('#diaryDetail') && $('#diaryDetail').addEventListener('submit', async e=>{
  e.preventDefault();
  const form = e.target.closest('.dd-form'); if(!form || !sb) return;
  const postId = form.dataset.post;
  const body = form.querySelector('.dd-body-in').value.trim(); if(!body) return;
  const name = form.querySelector('.dd-name').value.trim() || null;
  const { error } = await sb.from('comments').insert({ diary_id:postId, name, body, is_admin:false, parent_id:null });
  if(error){ toast('投稿失敗: '+error.message); return; }
  toast('コメントありがとう♡'); refreshDiaryDetail();
});
// 詳細内：運営の返信・削除
$('#diaryDetail') && $('#diaryDetail').addEventListener('click', async e=>{
  const rep = e.target.closest('[data-reply]');
  const del = e.target.closest('[data-del-comment]');
  if(rep){
    const id = rep.dataset.reply, did = rep.dataset.diary;
    const c = rep.closest('.comment'); if(c.querySelector('.reply-form')) return;
    const f = document.createElement('div'); f.className='reply-form';
    f.innerHTML = `<textarea placeholder="えまとして返信…"></textarea><button class="btn">送信</button>`;
    c.appendChild(f);
    f.querySelector('button').addEventListener('click', async ()=>{
      const body = f.querySelector('textarea').value.trim(); if(!body) return;
      const { error } = await sb.from('comments').insert({ diary_id:did, body, is_admin:true, parent_id:id });
      if(error){ toast('返信失敗: '+error.message); return; }
      toast('返信しました'); refreshDiaryDetail();
    });
    return;
  }
  if(del){
    if(!confirm('このコメントを削除しますか？')) return;
    const { error } = await sb.from('comments').delete().eq('id', del.dataset.delComment);
    if(error){ toast('削除失敗'); return; } toast('削除しました'); refreshDiaryDetail();
  }
});
$('#diaryModalClose') && $('#diaryModalClose').addEventListener('click', ()=> $('#diaryModal').classList.remove('show'));
$('#diaryModal') && $('#diaryModal').addEventListener('click', e=>{ if(e.target.id === 'diaryModal') $('#diaryModal').classList.remove('show'); });

/* ---------- コメント ---------- */
async function loadComments(){
  if(!sb) return;
  const { data, error } = await sb.from('comments').select('*').order('created_at',{ascending:true});
  if(error){ console.warn(error); return; }
  const gen = data.filter(c=> !c.diary_id);               // 一般コメント欄（日記コメントは除外）
  const tops = gen.filter(c=> !c.parent_id).reverse();    // 最新を左に
  const repliesByParent = {};
  gen.filter(c=> c.parent_id).forEach(r=> (repliesByParent[r.parent_id] ||= []).push(r));
  const list = $('#commentList');
  if(!tops.length){ list.innerHTML=''; $('#commentEmpty').hidden=false; $('#commentHint').hidden=true; return; }
  $('#commentEmpty').hidden = true;
  $('#commentHint').hidden = (tops.length < 2);
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
  if(on) loadAccessStats();
  if(typeof updateOmikujiButtonState === 'function') updateOmikujiButtonState();
}

/* ---------- アクセス数（記録＝全員1セッション1回／集計の閲覧＝運営のみ） ---------- */
(function logView(){
  if(!sb) return;
  try{ if(sessionStorage.getItem('av_viewed')) return; sessionStorage.setItem('av_viewed','1'); }catch(_){}
  sb.from('views').insert({}).then(()=>{}, ()=>{});   // viewsテーブルが無ければ静かに失敗
})();
async function loadAccessStats(){
  if(!sb) return;
  const start = new Date(); start.setHours(0,0,0,0);
  try{
    const today = await sb.from('views').select('*', { count:'exact', head:true }).gte('created_at', start.toISOString());
    const total = await sb.from('views').select('*', { count:'exact', head:true });
    if(!today.error && $('#accToday')) $('#accToday').textContent = (today.count ?? 0).toLocaleString();
    if(!total.error && $('#accTotal')) $('#accTotal').textContent = (total.count ?? 0).toLocaleString();
  }catch(_){}
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
    // デモモード：プロフィールは初期値を表示。バックエンド機能は接続後に有効化。
    loadProfile();
    console.info('[DEMO] Supabase未接続。config.js を設定すると全機能が有効になります。');
  }
})();
