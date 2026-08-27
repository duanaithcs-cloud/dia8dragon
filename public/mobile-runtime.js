(function(){
  const viewportIsMobile=()=>matchMedia('(max-width: 767px)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isMobile=()=>document.documentElement.dataset.uiLayout==='MOBILE'||(document.documentElement.dataset.uiLayout!=='DESKTOP'&&viewportIsMobile());
  function mark(){document.documentElement.classList.toggle('dia9-mobile',isMobile());}
  mark(); addEventListener('resize',mark,{passive:true}); addEventListener('orientationchange',()=>setTimeout(mark,100),{passive:true});
  new MutationObserver(mark).observe(document.documentElement,{attributes:true,attributeFilter:['data-ui-layout']});

  const ICONS={
    add:'＋',add_to_drive:'☁',admin_panel_settings:'⚙',analytics:'▥',arrow_forward:'→',assignment:'≡',auto_awesome:'✦',bolt:'⚡',close:'×',cloud_sync:'☁',co_present:'▣',compare_arrows:'⇆',content_copy:'⧉',dashboard:'▦',double_arrow:'⇒',download:'↓',expand_more:'⌄',fact_check:'✓',fit_screen:'⛶',groups:'●',history:'↶',history_edu:'⌛',image:'▧',insert_chart:'▥',ios_share:'⇧',key:'⚿',leaderboard:'≋',lightbulb:'◉',open_in_new:'↗',palette:'◉',play_arrow:'▶',psychology:'◈',quiz:'?',refresh:'↻',remove:'−',save:'✓',school:'⌂',search:'⌕',settings:'⚙',settings_input_component:'⚙',shield:'⛨',shield_person:'⛨',space_dashboard:'▦',star:'★',switch_account:'⇄',sync:'↻',swords:'⚔',timer:'◷',trending_down:'↘',trending_flat:'→',trending_up:'↗',upload:'↑',upload_file:'⇧',verified_user:'✓',visibility:'◉',visibility_off:'◌',workspace_premium:'◆',format_line_spacing:'↕',format_align_justify:'≣',contrast:'◐',speed:'»',skip_previous:'‹‹',pause:'Ⅱ',skip_next:'››',task_alt:'✓',check_circle:'✓',cancel:'×',emergency_home:'!',verified:'✓',favorite:'♥',animation:'≈',air:'≋',blur_on:'◌',light_mode:'☀',aspect_ratio:'↔',text_fields:'A',open_in_full:'⛶'
  };
  function hydrateIcon(node){
    if(!(node instanceof HTMLElement)||!node.classList.contains('material-symbols-outlined'))return;
    const visible=(node.textContent||'').trim();
    const raw=ICONS[visible]?visible:(node.dataset.iconName||visible);
    if(!raw)return;
    const glyph=ICONS[raw]||'◆';
    node.dataset.iconName=raw;
    if(node.textContent!==glyph)node.textContent=glyph;
    node.setAttribute('aria-hidden','true');
  }
  function hydrateIcons(root=document){
    if(root instanceof HTMLElement)hydrateIcon(root);
    root.querySelectorAll?.('.material-symbols-outlined').forEach(hydrateIcon);
  }
  hydrateIcons();
  const iconObserver=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='characterData')hydrateIcon(record.target.parentElement);
      record.addedNodes.forEach(node=>{if(node instanceof HTMLElement)hydrateIcons(node);});
    }
  });
  iconObserver.observe(document.documentElement,{subtree:true,childList:true,characterData:true});

  // Prevent double-tap zoom on controls while preserving pinch zoom in long-form reading areas.
  let last=0; document.addEventListener('touchend',e=>{if(!e.target.closest('button,[role="button"]'))return;const now=Date.now();if(now-last<300)e.preventDefault();last=now;},{passive:false});
  if('serviceWorker'in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
    addEventListener('load',async()=>{
      if(isMobile()){
        navigator.serviceWorker.register('./sw.js?v=3.5.0.6').catch(()=>{});
        return;
      }
      const registrations=await navigator.serviceWorker.getRegistrations().catch(()=>[]);
      await Promise.all(registrations.map(registration=>registration.unregister().catch(()=>false)));
      if('caches'in window){
        const keys=await caches.keys().catch(()=>[]);
        await Promise.all(keys.filter(key=>key.startsWith('dia8-mobile-')).map(key=>caches.delete(key)));
      }
    });
  }
})();
