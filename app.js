/* 再栈 2.0 | 纯前端教学原型 | 无数据库、服务器、支付或真实认证 */
'use strict';
(() => {
  const STORE_KEY = 'zaizhan_demo_v2';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const prohibited = ['枪支','弹药','毒品','危险化学品','电子烟','处方药','违禁'];
  const ICONS = {'学习':'📚','数码':'🔌','生活':'🌿','运动':'🏸'};
  const COLORS = {'学习':'#e8ebd8','数码':'#e3ecf4','生活':'#f7ebd6','运动':'#e5eedf'};
  const SAFE_ICONS = new Set(['📚','🔌','🌿','🏸','💡','🎧','📝','🧺','🖱️']);
  const visualIcon = item => SAFE_ICONS.has(item.icon) ? item.icon : (ICONS[item.kind]||'📦');
  const KINDS = ['学习','数码','生活','运动'];
  const MODES = ['转让','赠送','求修'];
  const now = () => new Date().toISOString();
  const makeSeed = () => ({version:2,items:window.LOOP_SAMPLE_ITEMS.map(x => ({...x,status:'待流转',booking:null,mine:false})),favorites:[],activity:[]});
  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY));
      if (raw && raw.version===2 && Array.isArray(raw.items) && Array.isArray(raw.favorites) && Array.isArray(raw.activity)) {
        return {version:2,items:raw.items.filter(x => x && typeof x.id === 'string').slice(0,200),favorites:raw.favorites.slice(0,200),activity:raw.activity.slice(0,60)};
      }
    } catch (_) { /* 无本地记录时恢复默认展示数据 */ }
    return makeSeed();
  }
  let state = readState();
  let selectedMode = '全部';
  let activeTab = 'bookings';
  let lastFocused = null;
  let toastTimer = null;
  function persist() {try {localStorage.setItem(STORE_KEY,JSON.stringify(state));return true;}catch(_) {notify('本地存储受限：刷新后可能无法保留操作');return false;}}
  function notify(message){const target=$('#toast');target.textContent=message;target.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>target.classList.remove('show'),2800);}
  function logAction(title,note,symbol='↗'){state.activity.unshift({id:makeId(),title,note,at:now(),symbol});state.activity=state.activity.slice(0,60);persist();}
  function makeId(){return (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `demo-${Date.now()}-${Math.floor(Math.random()*1e6)}`;}
  function byId(id){return state.items.find(item=>item.id===id);}
  function formatPrice(item){if(item.mode==='求修')return '维修互助';if(item.mode==='赠送')return '免费赠送';return `¥ ${Number(item.price).toFixed(0)}`;}
  function timeText(value){try{return new Date(value).toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'});}catch(_){return '演示数据';}}
  function isFavorite(id){return state.favorites.includes(id);}
  function card(item){
    const booked = item.status!=='待流转';
    const bookLabel = item.status==='已完成'?'已完成':item.status==='已预约'?'已预约':item.status==='已下架'?'已下架':item.mode==='求修'?'我要协助':'预约流转';
    const bookDisabled = booked || item.mine;
    const bookButtonText = item.mine?'我的发布':bookLabel;
    const color = COLORS[item.kind] || '#e8ebd8';
    const icon = visualIcon(item);
    return `<article class="item-card" aria-label="${escapeHtml(item.title)}">
      <div class="thumb" style="background:${color}"><span class="tag">${escapeHtml(item.mode)} · ${escapeHtml(item.kind)}</span><span class="thumb-icon" aria-hidden="true">${icon}</span><span class="state-badge state-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></div>
      <div class="item-body"><button type="button" class="item-title-btn" data-action="detail" data-id="${escapeHtml(item.id)}"><h3>${escapeHtml(item.title)}</h3></button><p class="item-desc">${escapeHtml(item.desc)}</p><div class="item-meta"><span>⌁ ${escapeHtml(item.place)}</span><span>${escapeHtml(item.condition||'物况待核实')}</span></div>
      <div class="item-footer"><span class="price">${escapeHtml(formatPrice(item))}</span><div class="card-actions"><button type="button" class="fav-button ${isFavorite(item.id)?'is-fav':''}" data-action="favorite" data-id="${escapeHtml(item.id)}" aria-label="${isFavorite(item.id)?'取消收藏':'收藏'}${escapeHtml(item.title)}" title="收藏" aria-pressed="${isFavorite(item.id)}">${isFavorite(item.id)?'♥':'♡'}</button><button type="button" class="item-action" data-action="reserve" data-id="${escapeHtml(item.id)}" ${bookDisabled?'disabled':''}>${bookButtonText}</button></div></div></div></article>`;
  }
  function filters(){return {q:$('#search').value.trim().toLowerCase(),kind:$('#kind').value,status:$('#status').value,sort:$('#sort').value,favOnly:$('#favOnly').checked};}
  function getFiltered(){const f=filters();let arr=state.items.filter(item => (f.kind==='全部'||item.kind===f.kind)&&(f.status==='全部'||item.status===f.status)&&(selectedMode==='全部'||item.mode===selectedMode)&&(!f.favOnly||isFavorite(item.id))&&[item.title,item.desc,item.place,item.condition].join(' ').toLowerCase().includes(f.q));
    switch(f.sort){case 'price-asc':arr.sort((a,b)=>a.price-b.price);break;case 'price-desc':arr.sort((a,b)=>b.price-a.price);break;case 'title':arr.sort((a,b)=>a.title.localeCompare(b.title,'zh-CN'));break;default:arr.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));}
    return arr;
  }
  function renderMarket(){const filtered=getFiltered();$('#items').innerHTML=filtered.map(card).join('');$('#empty').hidden=filtered.length!==0;$('#resultCount').textContent=`共找到 ${filtered.length} 条校园流转信息`;
    $('#statTotal').textContent=String(state.items.length).padStart(2,'0');$('#statAvailable').textContent=String(state.items.filter(x=>x.status==='待流转').length).padStart(2,'0');$('#statDone').textContent=String(state.items.filter(x=>x.status==='已完成').length).padStart(2,'0');$('#statRepair').textContent=String(state.items.filter(x=>x.mode==='求修').length).padStart(2,'0');
    $('#myActivity').innerHTML=state.activity.length ? state.activity.slice(0,4).map(row=>`<div class="activity-row"><span class="activity-dot" aria-hidden="true">${escapeHtml(row.symbol)}</span><div><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.note)}</small></div></div>`).join(''):'<p>还没有操作记录。欢迎从收藏或预约一件物品开始。</p>';
  }
  function renderWorkspace(){
    const mine=state.items.filter(x=>x.mine);
    const bookings=state.items.filter(x=>x.booking?.actor==='me');
    const completed=bookings.filter(x=>x.status==='已完成').length;
    $('#myPublishedCount').textContent=mine.length;$('#myBookingsCount').textContent=bookings.length;$('#myFavoritesCount').textContent=state.favorites.length;
    $('#completionRate').textContent=bookings.length?Math.round(completed/bookings.length*100)+'%':'0%';
    $$('.tab').forEach(btn=>{const isOn=btn.dataset.tab===activeTab;btn.classList.toggle('active',isOn);btn.setAttribute('aria-selected',String(isOn));btn.tabIndex=isOn?0:-1;});
    const body=$('#workspaceBody');
    if(activeTab==='activity'){
      body.innerHTML=state.activity.length ? `<div class="record-list">${state.activity.map(a=>`<div class="record-row"><span class="activity-dot" aria-hidden="true">${escapeHtml(a.symbol)}</span><div><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml(a.note)} · ${escapeHtml(timeText(a.at))}</small></div></div>`).join('')}</div>` : emptyPanel('还没有操作记录','发布、预约、取消或收藏后，会自动形成演示记录。');return;
    }
    let list=[];
    if(activeTab==='bookings')list=bookings;
    if(activeTab==='mine')list=mine;
    if(activeTab==='favorites')list=state.items.filter(x=>isFavorite(x.id));
    if(!list.length){const msg={bookings:['暂无预约','在“探索好物”中选择一件可流转物品开始体验。'],mine:['暂无我的发布','通过“发布闲置”新增自己的物品，并试试编辑与下架。'],favorites:['还没有收藏','点击商品卡片上的爱心，就可以把它加入收藏列表。']}[activeTab];body.innerHTML=emptyPanel(msg[0],msg[1]);return;}
    body.innerHTML=`<div class="record-list">${list.map(item=>{
      const buttons=[];
      if(activeTab==='bookings' && item.status==='已预约'){buttons.push(`<button class="mini-btn solid" type="button" data-action="checkBooking" data-id="${escapeHtml(item.id)}">查看口令 / 完成交付</button>`,`<button class="mini-btn" type="button" data-action="cancel" data-id="${escapeHtml(item.id)}">取消预约</button>`);}
      if(activeTab==='mine' && (item.status==='待流转'||item.status==='已下架')){buttons.push(`<button class="mini-btn" type="button" data-action="edit" data-id="${escapeHtml(item.id)}">编辑信息</button>`,`<button class="mini-btn ${item.status==='已下架'?'solid':''}" type="button" data-action="toggleListing" data-id="${escapeHtml(item.id)}">${item.status==='已下架'?'重新上架':'下架'}</button>`);}
      if(activeTab==='favorites')buttons.push(`<button class="mini-btn" type="button" data-action="favorite" data-id="${escapeHtml(item.id)}">取消收藏</button>`);
      buttons.push(`<button class="mini-btn" type="button" data-action="detail" data-id="${escapeHtml(item.id)}">查看详情</button>`);
      return `<div class="record-row"><div class="record-icon" aria-hidden="true">${visualIcon(item)}</div><div class="record-main"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.mode)} · ${escapeHtml(item.status)} · ${escapeHtml(item.place)}${item.booking?' · 演示预约':''}</small></div><div class="record-actions">${buttons.join('')}</div></div>`;
    }).join('')}</div>`;
  }
  function emptyPanel(title,message){return `<div class="empty-panel"><span aria-hidden="true">✦</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p><a href="#market" class="mini-btn solid">去发现好物 →</a></div>`;}
  function render(){renderMarket();renderWorkspace();}
  function clearFilters(){selectedMode='全部';$('#search').value='';$('#kind').value='全部';$('#status').value='全部';$('#sort').value='newest';$('#favOnly').checked=false;$$('[data-mode]').forEach(el=>{const on=el.dataset.mode==='全部';el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on));});renderMarket();}
  function openModal(html){lastFocused=document.activeElement;$('#modalBody').innerHTML=html;$('#modal').hidden=false;document.body.style.overflow='hidden';setTimeout(()=>{const focusable=$('#modalBody').querySelector('input,button,textarea,select');(focusable||$('#close')).focus();},20);}
  function closeModal(){if($('#modal').hidden)return;$('#modal').hidden=true;$('#modalBody').innerHTML='';document.body.style.overflow='';if(lastFocused&&lastFocused.isConnected)lastFocused.focus();}
  function detail(id){const item=byId(id);if(!item)return;const flag=isFavorite(id);openModal(`<span class="kicker">ITEM DETAIL · DEMO</span><h2 id="modalTitle">${escapeHtml(item.title)}</h2><div class="modal-meta"><span>${escapeHtml(item.mode)}</span><span>${escapeHtml(item.kind)}</span><span>${escapeHtml(item.status)}</span></div><div class="detail-cover">${visualIcon(item)}</div><p class="detail-desc">${escapeHtml(item.desc)}</p><div class="detail-rows"><div><span>成色 / 状态</span><strong>${escapeHtml(item.condition)}</strong></div><div><span>公共交付地点</span><strong>${escapeHtml(item.place)}</strong></div><div><span>发布人</span><strong>${escapeHtml(item.owner)}</strong></div><div><span>流转条件</span><strong>${escapeHtml(formatPrice(item))}</strong></div></div><p class="hint">资料均为演示。线下真实交付前，请核验物品来源及安全状况。</p><div class="modal-actions"><button class="btn btn-subtle" type="button" data-action="favorite" data-id="${escapeHtml(id)}">${flag?'♥ 取消收藏':'♡ 收藏物品'}</button><button class="btn btn-solid" type="button" data-action="reserve" data-id="${escapeHtml(id)}" ${item.status!=='待流转'||item.mine?'disabled':''}>${item.mine?'我的发布':item.status==='待流转'?(item.mode==='求修'?'我要协助':'预约流转'):item.status}</button></div>`);}
  function itemForm(editItem=null){const editing=Boolean(editItem);const val=key=>escapeHtml(editItem?.[key]??'');openModal(`<span class="kicker">${editing?'EDIT ITEM':'PUBLISH ITEM'}</span><h2 id="modalTitle">${editing?'编辑我的物品':'发布一件校园好物'}</h2><p>填写非敏感的演示信息。发布后可在“我的流转工作台”中编辑或下架。</p><form id="itemForm" data-edit-id="${editing?escapeHtml(editItem.id):''}"><label class="form-field">物品名称<input name="title" required minlength="2" maxlength="35" value="${val('title')}" placeholder="例如：操作系统教材"></label><label class="form-field">物品说明<textarea name="desc" required minlength="4" maxlength="150" placeholder="描述新旧程度、配件状态和交接建议">${val('desc')}</textarea></label><div class="form-grid"><label class="form-field">物品分类<select name="kind">${KINDS.map(s=>`<option ${editItem?.kind===s?'selected':''}>${s}</option>`).join('')}</select></label><label class="form-field">流转方式<select name="mode">${MODES.map(s=>`<option ${editItem?.mode===s?'selected':''}>${s}</option>`).join('')}</select></label></div><div class="form-grid"><label class="form-field">价格（元）<input name="price" type="number" required min="0" max="9999" step="1" value="${editing?Number(editItem.price):'0'}"></label><label class="form-field">物品成色<select name="condition">${['全新','九成新','八成新','七成新','待检修'].map(s=>`<option ${editItem?.condition===s?'selected':''}>${s}</option>`).join('')}</select></label></div><label class="form-field">公共交付地点<input name="place" required minlength="2" maxlength="26" value="${val('place')}" placeholder="例如：图书馆东门"></label><p class="hint">赠送与求修自动计为0元；仅演示平台发布流程，严禁真实发布违禁品或个人敏感信息。</p><div class="modal-actions"><button type="button" class="btn btn-subtle" data-action="close">取消</button><button type="submit" class="btn btn-solid">${editing?'保存修改':'确认发布'}</button></div></form>`);
    const form=$('#itemForm');form.addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());data.title=data.title.trim();data.desc=data.desc.trim();data.place=data.place.trim();const combined=`${data.title}${data.desc}${data.place}`;if(prohibited.some(w=>combined.includes(w))){notify('演示安全规则：该类型内容不支持发布');return;}
      if(!KINDS.includes(data.kind)||!MODES.includes(data.mode)||data.title.length<2||data.desc.length<4||data.place.length<2||(data.mode==='转让'&&(!/^[0-9]+$/.test(String(data.price))||+data.price>9999))){notify('请按要求完整填写物品信息');return;}
      const price=data.mode==='转让'?Number(data.price):0;
      if(editing){const target=byId(editItem.id);if(!target||!target.mine||!['待流转','已下架'].includes(target.status)){notify('当前状态不可编辑');return;}Object.assign(target,{title:data.title,desc:data.desc,place:data.place,kind:data.kind,mode:data.mode,condition:data.condition,price,icon:ICONS[data.kind],color:COLORS[data.kind]});logAction('编辑物品信息',target.title,'✎');}
      else {const item={id:makeId(),title:data.title,desc:data.desc,kind:data.kind,mode:data.mode,price,place:data.place,condition:data.condition,icon:ICONS[data.kind],color:COLORS[data.kind],owner:'我的演示账号',createdAt:now(),status:'待流转',booking:null,mine:true};state.items.unshift(item);logAction('发布物品',item.title,'＋');}
      closeModal();clearFilters();render();notify(editing?'已保存修改':'发布成功，已写入本地浏览器');
    });
    const mode=form.elements.mode;mode.addEventListener('change',()=>{const free=mode.value!=='转让';form.elements.price.disabled=free;if(free)form.elements.price.value='0';});mode.dispatchEvent(new Event('change'));
  }
  function reserve(id){const item=byId(id);if(!item||item.status!=='待流转'||item.mine){notify('此物品当前不可预约');return;}const code=String(100000+Math.floor(Math.random()*900000));item.status='已预约';item.booking={actor:'me',code,at:now()};logAction(item.mode==='求修'?'响应维修互助':'预约流转',item.title,'✓');render();showBooking(id);}
  function showBooking(id){const item=byId(id);if(!item||item.status!=='已预约'||item.booking?.actor!=='me'){notify('当前没有可确认的预约');return;}openModal(`<span class="kicker">RESERVATION · DEMO</span><h2 id="modalTitle">${escapeHtml(item.mode==='求修'?'维修协助':'交付确认')}：${escapeHtml(item.title)}</h2><p>这是前端教学用交付口令，仅用于演示流程。实际交付请遵守校内要求，不向陌生人提供敏感信息。</p><div class="code-box" aria-label="六位演示交付口令">${escapeHtml(item.booking.code)}</div><p class="hint">公共地点：${escapeHtml(item.place)}　·　物品状态：已预约</p><label class="form-field">模拟当面确认：输入上方口令<input id="verifyCode" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" aria-label="输入六位口令" placeholder="输入六位口令"></label><div class="modal-actions"><button type="button" class="btn btn-subtle" data-action="close">稍后处理</button><button type="button" class="btn btn-solid" data-action="finish" data-id="${escapeHtml(item.id)}">确认完成</button></div><button class="cancel-link" type="button" data-action="cancel" data-id="${escapeHtml(item.id)}">本次预约不继续？取消预约</button>`);}
  function finish(id){const item=byId(id);if(!item||item.status!=='已预约'||item.booking?.actor!=='me'){notify('无法确认此预约');return;}if($('#verifyCode')?.value.trim()!==item.booking.code){notify('演示口令不匹配，请核对后重试');return;}item.status='已完成';item.booking.code=null;logAction('演示流转完成',item.title,'★');closeModal();render();notify('完成！已形成本地流转记录');}
  function cancel(id){const item=byId(id);if(!item||item.status!=='已预约'||item.booking?.actor!=='me'){notify('此预约无法取消');return;}item.status='待流转';item.booking=null;logAction('取消预约',item.title,'↶');closeModal();render();notify('已取消预约，物品恢复可流转');}
  function toggleListing(id){const item=byId(id);if(!item||!item.mine||!['待流转','已下架'].includes(item.status)){notify('当前物品不能上下架');return;}const next=item.status==='待流转'?'已下架':'待流转';item.status=next;logAction(next==='已下架'?'下架物品':'重新上架',item.title,next==='已下架'?'↓':'↑');render();notify(next==='已下架'?'已下架':'已重新上架');}
  function toggleFavorite(id){const item=byId(id);if(!item)return;const idx=state.favorites.indexOf(id);if(idx>=0)state.favorites.splice(idx,1);else state.favorites.push(id);logAction(idx>=0?'取消收藏':'收藏物品',item.title,'♥');const modalOpen=!$('#modal').hidden;const activeItemId=$('#modalBody [data-action="favorite"]')?.dataset.id;render();if(modalOpen&&activeItemId===id)detail(id);else notify(idx>=0?'已取消收藏':'已加入我的收藏');}
  function exportData(){const output={project:'再栈（课程演示）',exportedAt:now(),notice:'仅供课程演示；非真实交易或经营数据',version:state.version,items:state.items,favorites:state.favorites,activity:state.activity};const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='再栈_本地演示记录.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('已导出当前浏览器的演示记录');}
  function reset(){if(!confirm('重置将清空当前浏览器里的发布、预约、收藏和操作记录。确定继续吗？'))return;state=makeSeed();persist();activeTab='bookings';clearFilters();render();notify('演示数据已恢复初始状态');}
  function changeTab(tab){if(!['bookings','mine','favorites','activity'].includes(tab))return;activeTab=tab;renderWorkspace();}
  function handleAction(action,id){switch(action){case 'detail':detail(id);break;case 'favorite':toggleFavorite(id);break;case 'reserve':reserve(id);break;case 'checkBooking':showBooking(id);break;case 'finish':finish(id);break;case 'cancel':cancel(id);break;case 'edit':{const item=byId(id);if(item?.mine)itemForm(item);break;}case 'toggleListing':toggleListing(id);break;case 'close':closeModal();break;}}
  document.addEventListener('click',event=>{const actionEl=event.target.closest('[data-action]');if(actionEl){handleAction(actionEl.dataset.action,actionEl.dataset.id);return;}const chip=event.target.closest('[data-mode]');if(chip){selectedMode=chip.dataset.mode;$$('[data-mode]').forEach(el=>{const selected=el===chip;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});renderMarket();return;}const tab=event.target.closest('[data-tab]');if(tab){changeTab(tab.dataset.tab);}});
  $$('.topbar button[id^="publish"],#publishHero,#publishSide').forEach(btn=>btn.addEventListener('click',()=>itemForm()));
  ['search','kind','status','sort','favOnly'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',renderMarket));
  $('#clearFilters').addEventListener('click',clearFilters);$('#emptyClear').addEventListener('click',clearFilters);$('#reset').addEventListener('click',reset);$('#exportData').addEventListener('click',exportData);$('#close').addEventListener('click',closeModal);$('#overlay').addEventListener('click',closeModal);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();if(event.key==='Tab'&&!$('#modal').hidden){const focusables=$$('#modal button:not([disabled]),#modal input:not([disabled]),#modal select:not([disabled]),#modal textarea:not([disabled])');if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
  render();
})();
