(() => {
  'use strict';
  const $=id=>document.getElementById(id),screen=$('screen'),theater=$('theater');
  const play=$('play'),sound=$('sound'),seek=$('seek'),loading=$('loading'),notice=$('notice');
  const duration=Film.duration;
  let time=0,started=0,playing=false,ready=false,muted=true,audioReady=false,unmuting=false;
  let raf=0,idleTimer=0,noticeTimer=0,dragging=false,restorePlay=false,visibleResume=false;
  let lastDraw=-1,lastStatusSecond=-1;
  const now=()=>performance.now()/1000;
  const current=()=>playing?Math.min(duration,time+now()-started):time;
  const stamp=t=>Math.floor(t/60)+':'+String(Math.floor(t)%60).padStart(2,'0');
  function message(text){notice.textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.textContent='',2200)}
  function showControls(){
    screen.classList.remove('away');
    clearTimeout(idleTimer);
    if(playing&&!dragging)idleTimer=setTimeout(()=>{
      if(playing&&!dragging&&!$('controls').matches(':hover')&&!$('controls').matches(':focus-within:has(:focus-visible)'))screen.classList.add('away');
    },2700);
  }
  function buttons(){
    const restart=!playing&&time>=duration;
    $('play-glyph').setAttribute('d',playing?'M7 5h3v14H7zm7 0h3v14h-3z':'M7 4.6 19 12 7 19.4z');
    play.setAttribute('aria-label',playing?'Pause film':restart?'Replay film':'Play film');play.title=(playing?'Pause':restart?'Replay':'Play')+' (Space)';
    $('sound-glyph').setAttribute('d',muted?'m16 9 5 6m0-6-5 6':'M16 8.1a5.3 5.3 0 0 1 0 7.8M18.7 5.2a9.1 9.1 0 0 1 0 13.6');
    $('sound-label').textContent=unmuting?'Tuning…':muted?'Sound off':'Sound on';
    sound.setAttribute('aria-pressed',String(!muted));sound.setAttribute('aria-label',muted?'Unmute soundtrack':'Mute soundtrack');
    sound.title=(muted?'Unmute':'Mute')+' soundtrack (M)';
  }
  function timeline(t){
    if(!dragging)seek.value=t;
    $('played').style.width=(100*t/duration)+'%';
    const sec=Math.floor(t);
    if(lastStatusSecond!==sec){$('elapsed').textContent=stamp(t);seek.setAttribute('aria-valuetext',stamp(t)+' of 1:00');lastStatusSecond=sec}
  }
  function render(t){
    if(lastDraw!==t){Film.draw(t);lastDraw=t}
    timeline(t);
  }
  function tick(){
    if(!playing)return;
    const t=current();render(t);
    if(t>=duration){time=duration;playing=false;Score.stop();buttons();showControls();return}
    raf=requestAnimationFrame(tick);
  }
  function start(){
    if(!ready||playing)return;
    if(time>=duration)time=0;
    started=now();playing=true;
    if(!muted&&audioReady)Score.play(time);
    buttons();showControls();tick();
  }
  function pause(){
    if(playing){time=current();playing=false;cancelAnimationFrame(raf);Score.stop();render(time)}
    buttons();showControls();
  }
  function seekTo(t){
    if(!ready)return;
    time=Math.max(0,Math.min(duration,t));started=now();
    if(time>=duration&&playing){playing=false;cancelAnimationFrame(raf)}
    if(playing&&!muted&&audioReady)Score.play(time);else Score.stop();
    render(time);buttons();showControls();
  }
  function toggle(){if(playing)pause();else start()}
  function replay(){seekTo(0);start()}
  async function toggleSound(){
    if(!ready||unmuting)return;
    if(muted){
      unmuting=true;buttons();
      try{await Score.load();audioReady=true;muted=false;if(playing)Score.play(current())}
      catch{muted=true;message('Sound could not start. Try the sound control again.')}
      finally{unmuting=false}
    }else{muted=true;Score.stop()}
    buttons();showControls();
  }
  const isFull=()=>Boolean(document.fullscreenElement||document.webkitFullscreenElement||theater.classList.contains('immersive'));
  function fullIcon(){
    const f=isFull();$('full').setAttribute('aria-label',f?'Exit fullscreen':'Enter fullscreen');
    $('full-glyph').setAttribute('d',f?'M4 8h4V4m12 4h-4V4M8 20v-4H4m12 4v-4h4':'M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4');showControls();
  }
  async function fullscreen(){
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else if(document.webkitFullscreenElement)document.webkitExitFullscreen();
      else if(theater.requestFullscreen)await theater.requestFullscreen();
      else if(theater.webkitRequestFullscreen)theater.webkitRequestFullscreen();
      else {message('This browser is already using its full viewing area.')}
    }catch{message('Fullscreen is unavailable in this window.')}
    fullIcon();
  }
  play.onclick=toggle;$('replay').onclick=replay;sound.onclick=toggleSound;$('full').onclick=fullscreen;
  function beginDrag(){if(dragging||!ready)return;restorePlay=playing;dragging=true;pause()}
  function endDrag(){
    if(!dragging)return;dragging=false;seekTo(Number(seek.value));
    if(restorePlay&&time<duration)start();restorePlay=false;showControls();
  }
  seek.addEventListener('pointerdown',beginDrag);
  seek.addEventListener('input',()=>seekTo(Number(seek.value)));
  window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);
  seek.addEventListener('change',endDrag);seek.addEventListener('blur',endDrag);
  screen.addEventListener('pointermove',showControls);screen.addEventListener('focusin',showControls);
  screen.addEventListener('pointerleave',()=>{if(playing)showControls()});
  screen.addEventListener('click',e=>{
    if(e.target.closest('#controls')||!ready)return;
    if(screen.classList.contains('away')&&matchMedia('(pointer:coarse)').matches){showControls();return}
    toggle();
  });
  document.addEventListener('fullscreenchange',fullIcon);document.addEventListener('webkitfullscreenchange',fullIcon);
  document.addEventListener('keydown',e=>{
    if(!ready||e.ctrlKey||e.metaKey||e.altKey)return;
    const key=e.key.toLowerCase(),input=e.target===seek;
    if(input&&['arrowleft','arrowright','home','end'].includes(key))return;
    if((key===' '||key==='enter')&&e.target.closest('button'))return;
    const action={' ':toggle,'k':toggle,'m':toggleSound,'r':replay,'f':fullscreen,'arrowleft':()=>seekTo(current()-5),'arrowright':()=>seekTo(current()+5),'home':()=>seekTo(0),'end':()=>seekTo(duration)}[key];
    if(action){e.preventDefault();action();showControls()}
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){visibleResume=playing;if(playing)pause()}
    else if(visibleResume){visibleResume=false;start()}
  });
  for(const t of Film.shots.slice(1,-1)){const mark=document.createElement('i');mark.style.left=(t*100/duration)+'%';$('ticks').append(mark)}
  // A deterministic seek hook also allows an HTML composition renderer to sample the film.
  window.addEventListener('hf-seek',e=>{if(ready){pause();seekTo(Number(e.detail.time)||0)}});
  Film.load().then(()=>{
    ready=true;screen.dataset.ready='true';loading.hidden=true;
    [play,$('replay'),sound,seek].forEach(el=>el.disabled=false);
    render(0);buttons();
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.hidden)start();
    if('requestIdleCallback' in window)requestIdleCallback(()=>Score.prepare().catch(()=>{}),{timeout:2000});
    else setTimeout(()=>Score.prepare().catch(()=>{}),500);
  }).catch(error=>{console.error(error);loading.querySelector('span').textContent='The film could not open. Reload to try again.'});
})();
