/* Seven story beats share one wind field. The sunrise ends on a reaction insert. */
(() => {
  'use strict';
  const W=1920,H=1080, TAU=2*Math.PI;
  const canvas=document.getElementById('picture'),ctx=canvas.getContext('2d',{alpha:true});
  const title=document.getElementById('film-title');
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const cubic=x=>x*x*(3-2*x);
  const step=(a,b,v)=>cubic(clamp((v-a)/(b-a)));
  const lerp=(a,b,u)=>a+(b-a)*u;
  const pullCut=24.88,reactionIn=43.85,reactionOut=47.55;
  let seed=54791;
  function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const leaves=Array.from({length:38},()=>({x:rand()*2350,y:rand(),phase:rand()*TAU,depth:rand(),s:.45+rand()*.95}));
  const specks=Array.from({length:66},()=>[rand()*2200,rand()*410,rand()*TAU,rand()]);
  function conditions(t){
    const strong=step(5.8,10.5,t)*.40+step(14,19,t)*.23+step(21,25,t)*.21;
    const gust=Math.pow(Math.max(0,Math.sin(t*.93+.51*Math.sin(t*.44))),3)*.12;
    const wind=.23+(strong+gust)*(1-step(38,52,t)*.84);
    const gap=.125*step(23,31.6,t)+.875*step(30.4,44.8,t);
    const light=.095*step(29.4,34,t)+.69*step(33.7,41.9,t)+.215*step(39.4,46.1,t);
    return {t,wind:clamp(wind,0,1.1),light,gap,tension:clamp(.19+.74*step(7.6,12.4,t)+.065*step(21,24,t)-.11*step(44,55,t))};
  }
  function camera(t){
    if(t<7){
      const p=step(-1,8,t);return {eyeX:lerp(967,997,p),eyeY:lerp(543,545,p),zoom:lerp(1.025,1.124,p)};
    }
    if(t<22 && t>=13){
      const p=step(13,22,t);return {eyeX:lerp(905,803,p),eyeY:lerp(318,110,p),zoom:lerp(1.63,1.32,p)};
    }
    if(t>=22&&t<pullCut){
      // Stay with the child's weight shift for a beat before revealing what
      // has begun to move at the other end of the line.
      const p=step(22,pullCut,t);
      return {eyeX:lerp(1313,1303,p),eyeY:lerp(777,773,p),zoom:lerp(4.60,4.45,p)};
    }
    if(t>=reactionIn&&t<reactionOut){
      const p=step(reactionIn,reactionOut,t);
      return {eyeX:lerp(1080,1093,p),eyeY:lerp(450,445,p),zoom:lerp(1.21,1.245,p)};
    }
    if(t>=reactionOut&&t<53){
      const p=step(reactionOut-.3,53.5,t);return {eyeX:lerp(1332,1192,p),eyeY:lerp(802,791,p),zoom:lerp(2.22,2.06,p)};
    }
    if(t>=53){
      const p=step(52.9,57.8,t);return {eyeX:lerp(1114,960,p),eyeY:lerp(587,540,p),zoom:lerp(1.32,1,p)};
    }
    const p=step(21.8,32,t), q=step(33,44.8,t);
    return {eyeX:lerp(1025,998,p)-q*26,eyeY:lerp(552,537,p)-q*3,zoom:1.12+p*.07-q*.145};
  }
  function applyEye(cam){
    ctx.translate(960,540);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.eyeX,-cam.eyeY);
  }
  function kiteAt(state){
    const {t,wind,light,gap}=state;
    const lift=step(7.6,19,t),catchWind=step(22.5,26.2,t),release=step(28.5,44.3,t),quiet=step(45,57,t);
    const float=.9-.52*catchWind+.24*quiet;
    const pulse=step(22.15,22.9,t)*(1-step(23,24.2,t));
    return Kite.pose({
      x:lerp(1161,991,lift)-catchWind*82-release*388-quiet*57+Math.sin(t*.91+1.3)*22*float+Math.sin(t*1.97)*9*wind+pulse*26,
      y:lerp(448,387,lift)-catchWind*31-release*108-quiet*33+Math.sin(t*1.26)*14*float+Math.sin(t*2.8)*6*wind+pulse*15,
      size:80-17*lift-6*release,bank:-.22-.13*catchWind-.15*release+.10*Math.sin(t*.7),wind,light,t
    });
  }
  function air(state,near=false){
    const {t,light,wind}=state;
    ctx.save();
    for(let i=0;i<leaves.length;i++){
      const l=leaves[i];if((l.depth>.7)!==near)continue;
      const speed=(31+l.depth*55)*(1+.38*step(6,18,t));
      const x=2200-((l.x+t*speed)%2540);
      const baseY=near?815+l.y*245:660+l.y*190;
      const y=baseY+Math.sin(t*.73+l.phase)*19*l.s+Math.sin(x*.006+l.phase)*23;
      let vis=clamp((wind-.18)*1.07,.06,.78);if(near)vis*=.92;
      const size=(near?6:2.9)*l.s;
      ctx.save();ctx.translate(x,y);ctx.rotate(-.26+Math.sin(t*1.36+l.phase)*.59);ctx.scale(1,.46+.54*Math.abs(Math.cos(t*2.1+l.phase)));
      ctx.beginPath();ctx.moveTo(-size,0);ctx.quadraticCurveTo(-size*.1,-size*.45,size*1.16,0);ctx.quadraticCurveTo(0,size*.36,-size,0);
      ctx.fillStyle=light>.45?'rgba(167,146,68,'+vis+')':'rgba(86,105,89,'+vis+')';ctx.fill();ctx.restore();
    }
    if(near&&light>.05){
      ctx.fillStyle='#ffe6a1';
      for(const [a,b,p,s] of specks){
        const x=(a+2200-t*(8+s*9))%2200-140,y=690+b+Math.sin(t*.59+p)*13;
        ctx.globalAlpha=light*(.14+.4*s)*(.5+.5*Math.sin(t*1.11+p));ctx.beginPath();ctx.arc(x,y,.9+1.1*s,0,TAU);ctx.fill();
      }
    }
    ctx.restore();
  }
  function spill(state){
    const {light,t}=state;if(light<.001)return;
    ctx.save();
    const glow=ctx.createRadialGradient(840,645,10,840,645,430);
    glow.addColorStop(0,'rgba(255,225,161,'+(.13*light)+')');glow.addColorStop(1,'rgba(255,222,154,0)');
    ctx.fillStyle=glow;ctx.fillRect(410,215,860,860);
    // Successive shafts sweep the valley as the cloud lip rolls out of their path.
    ctx.globalCompositeOperation='screen';
    for(let i=0;i<4;i++){
      const start=838+i*2, dx=[-551,-223,312,608][i]+42*Math.sin(t*.075+i*2.37);
      const opacity=light*(i%2?.039:.061);
      const g=ctx.createLinearGradient(start,605,start+dx,1110);
      g.addColorStop(0,'rgba(255,225,161,0)');g.addColorStop(.23,'rgba(255,224,151,'+opacity+')');g.addColorStop(1,'rgba(255,220,138,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(start,606);ctx.lineTo(start+dx-31-i*9,1160);ctx.quadraticCurveTo(start+dx+7,1179,start+dx+68,1140);ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
  // A pair of swifts banks low over the fields as the storm lets up. Their
  // long primaries sweep back during a glide, then fold on alternate upstrokes.
  function swifts(g,t){
    if(t<35.9||t>43.85)return;
    for(const [delay,offset,height,span] of [[0,0,0,12.8],[.48,45,28,8.8],[.87,2,-25,6.7]]){
      const flight=(t-36-delay)/7.5;
      if(flight<=0||flight>=1)continue;
      const x=1460-flight*821+offset,y=670-93*Math.sin(flight*2.85)-flight*12+height+6*Math.sin(flight*15+delay);
      const wing=Math.sin(t*17+delay*8),glide=step(.09,.23,flight)*(1-step(.57,.71,flight));
      const spread=lerp(wing,.22,glide),bank=-.27+.48*Math.sin(flight*7+delay);
      g.save();g.translate(x,y);g.rotate(bank);g.scale(span/19,span/19);
      g.globalAlpha=.76*Math.min(step(0,.13,flight),1-step(.82,1,flight));
      const shape=new Path2D();shape.moveTo(-6,-1);
      shape.quadraticCurveTo(-3,-2,0,-1.6);
      shape.quadraticCurveTo(2,-6-spread*5,11,-9-spread*11);
      shape.quadraticCurveTo(7,-3-spread*5,3,-.2);
      shape.lineTo(10,2);shape.lineTo(6,2.1);shape.lineTo(9,4.5);shape.lineTo(1,1.5);
      shape.quadraticCurveTo(0,3,2,7+spread*5);shape.quadraticCurveTo(-5,3-spread*2,-2,0);
      shape.closePath();g.fillStyle='#566067';g.fill(shape);g.restore();
    }
  }
  function current(state,kite){
    const {t}=state, amount=step(21.8,24.5,t)*(1-step(36,41,t));
    if(amount<.01)return;
    ctx.save();ctx.lineCap='round';
    for(let i=0;i<3;i++){
      const u=(t*.23+i*.29)%1,length=(53+66*u)*amount;
      const x=kite.x+17+u*104,y=kite.y+10+i*8+Math.sin(t*.86+i)*7;
      const gr=ctx.createLinearGradient(x,y,x+length,y+5);gr.addColorStop(0,'rgba(217,226,220,0)');gr.addColorStop(.52,'rgba(224,228,216,'+(.28*amount*Math.sin(u*Math.PI))+')');gr.addColorStop(1,'rgba(217,226,220,0)');
      ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+length*.38,y-7,x+length*.66,y+13,x+length,y+2);ctx.strokeStyle=gr;ctx.lineWidth=1.5+i*.9;ctx.stroke();
    }
    ctx.restore();
  }
  function ascent(state,cam){
    const {t,wind,light}=state,p=step(13,22,t),snap=step(20.35,21.2,t);
    const k=Kite.pose({x:lerp(815,1010,p)+Math.sin(t*1.38)*47-67*snap,y:lerp(494,274,p)+Math.sin(t*1.75)*26-53*snap,
      size:lerp(376,225,p),bank:-.33-.20*Math.sin(t*1.31)-.15*snap,wind:wind+.11,light,t});
    Kite.string(ctx,{x:1760+Math.sin(t*.91)*60,y:1395},k,{...state,close:true});
    Kite.draw(ctx,k);current(state,k);
    // Wind-borne grass seeds pass close to the lens, a second plane of motion.
    ctx.save();ctx.strokeStyle='rgba(232,221,183,.63)';ctx.lineWidth=2;
    for(let i=0;i<5;i++){
      const x=2040-((t*(110+21*i)+i*487)%2580),y=200+i*153+Math.sin(t*.9+i)*50;
      ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+8,y-7,x+16,y-6);ctx.stroke();
    }
    ctx.restore();
  }
  // Focus follows the butterfly out of the flowers. Keep a sharp and a soft
  // copy of this same moving view so neither the distant figure nor the line
  // jumps when the lens settles on the hill.
  let meadowPlate,softMeadow;
  function meadowView(st) {
    const progress=clamp((st.t-reactionOut)/(53-reactionOut));
    if(!meadowPlate){
      meadowPlate=document.createElement('canvas');
      softMeadow=document.createElement('canvas');softMeadow.width=576;softMeadow.height=324;
    }
    if(meadowPlate.width!==canvas.width||meadowPlate.height!==canvas.height){
      meadowPlate.width=canvas.width;meadowPlate.height=canvas.height;
    }
    const g=meadowPlate.getContext('2d');
    g.setTransform(meadowPlate.width/W,0,0,meadowPlate.height/H,0,0);
    g.clearRect(0,0,W,H);
    if(!Sky.separateLayer)g.drawImage(canvas,0,0,W,H);
    Land.meadow(g,{...st,progress,drawCast:({x,y,height,sx,sy,tx,ty})=>{
      const hand=Cast.draw(g,{x,y,height,...st}),wide=kiteAt(st);
      const k=Kite.pose({...wide,x:wide.x*sx+tx,y:wide.y*sy+ty,size:wide.size*sx});
      Kite.string(g,hand,k,st);Kite.draw(g,k);
    }});
    const focus=step(.54,.92,progress);
    ctx.save();
    if(focus<.999){
      const blur=softMeadow.getContext('2d');
      blur.clearRect(0,0,576,324);blur.filter='blur(.86px)';blur.drawImage(meadowPlate,0,0,576,324);
      ctx.drawImage(softMeadow,2,1.125,572,321.75,0,0,W,H);
    }
    if(focus>0){ctx.globalAlpha=focus;ctx.drawImage(meadowPlate,0,0,W,H);ctx.globalAlpha=1}
    Land.meadowLife(ctx,st,progress);ctx.restore();
  }
  function watchSunrise(st){
    const progress=clamp((st.t-reactionIn)/(reactionOut-reactionIn));
    // The cut reverses the viewing angle. Her eye line meets the small sail
    // across a clear stretch of sky, then the meadow takes us back to the hill.
    const k=Kite.pose({x:492-24*progress+9*Math.sin(st.t*1.14),
      y:205-14*progress+6*Math.sin(st.t*1.5),size:47,bank:-.30,...st});
    Kite.string(ctx,{x:1100,y:1240},k,st);Kite.draw(ctx,k);
    Cast.portrait(ctx,{...st,progress,width:W,height:H});
  }
  let valleyStudy;
  function handsView(st) {
    const progress=clamp((st.t-7)/6);
    const cam={eyeX:752+5*progress,eyeY:800,zoom:2.08};
    Sky.draw(ctx,{...st,...cam});
    if(!valleyStudy){
      // This is the valley the child stands in, seen past the reel. Sample
      // its paint on a smaller plane so only the fingers and cord are in focus.
      const plate=document.createElement('canvas');plate.width=800;plate.height=450;
      const g=plate.getContext('2d');
      const scale=plate.width/W;g.scale(scale,scale);
      g.translate(960,540);g.scale(cam.zoom,cam.zoom);g.translate(-752,-800);
      Land.draw(g,{t:7,wind:.5,light:0,pan:0});
      valleyStudy=document.createElement('canvas');valleyStudy.width=800;valleyStudy.height=450;
      const soft=valleyStudy.getContext('2d');
      soft.filter='blur(1.1px)';soft.drawImage(plate,0,0);soft.filter='none';
    }
    ctx.save();
    ctx.drawImage(valleyStudy,-10-8*progress,-7,1946,1096);
    const air=ctx.createLinearGradient(0,0,0,H);
    air.addColorStop(0,'rgba(195,207,210,.17)');air.addColorStop(1,'rgba(154,177,167,.20)');
    ctx.fillStyle=air;ctx.fillRect(0,0,W,H);ctx.restore();
    Cast.close(ctx,{...st,progress,width:W,height:H,backdrop:true});
  }
  let last=-1;
  function draw(t){
    const st=conditions(t),cam=camera(t);
    last=t;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    ctx.clearRect(0,0,W,H);
    title.style.opacity=t<7?String((1-step(3.8,6.3,t))):'0';
    if(t>=7&&t<13){
      handsView(st);
      return;
    }
    const nearCamera=t>=22&&t<pullCut;
    const skyCamera=nearCamera?{...cam,eyeX:1190,eyeY:635,zoom:1.84}:cam;
    const meadowShot=t>=reactionOut&&t<53;
    const lens=meadowShot?1-step(.54,.92,(t-reactionOut)/(53-reactionOut)):0;
    Sky.draw(ctx,{...st,...skyCamera,focusBlur:lens});
    if(t>=13&&t<22){ascent(st,cam);return}
    if(t>=reactionIn&&t<reactionOut){watchSunrise(st);return}
    if(t>=reactionOut&&t<53){meadowView(st);return}
    ctx.save();applyEye(cam);
    const pan=(cam.eyeX-960)/960;
    Land.draw(ctx,{...st,pan,nearCamera});
    air(st);swifts(ctx,t);
    const hand=Cast.draw(ctx,{x:Land.feet.x,y:Land.feet.y,height:118,...st});
    const k=kiteAt(st);
    Kite.string(ctx,hand,k,{...st,lineScale:nearCamera?.41:1});Kite.draw(ctx,k);current(st,k);
    spill(st);Land.front(ctx,{...st,pan});air(st,true);
    ctx.restore();
  }
  function resize(){
    const width=Math.max(320,Math.min(1920,Math.round(canvas.getBoundingClientRect().width*Math.min(1.55,window.devicePixelRatio||1))));
    if(width!==canvas.width){canvas.width=width;canvas.height=Math.round(width*9/16);if(last>=0)draw(last)}
  }
  async function load(){
    resize();
    await Promise.all([Sky.load(),Land.load(),Cast.load()]);
    resize();draw(0);
    if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize',resize);
  }
  window.Film={draw,load,duration:60,shots:[0,7,13,22,pullCut,32,reactionIn,reactionOut,53,60]};
})();
