/* Split bamboo, dyed paper and cotton, painted on one bowed surface. */
(() => {
  'use strict';
  const {sin,cos,exp,abs,PI,hypot}=Math;
  const clamp=x=>Math.min(1,Math.max(0,x));
  const ends=[[0,-88],[76,-12],[1,111],[-78,-13]];
  const lineInFront=new WeakMap();
  let pulp;
  function paperStock(){
    if(pulp)return pulp;
    const sheet=document.createElement('canvas');sheet.width=392;sheet.height=472;
    const g=sheet.getContext('2d');
    let state=74131;
    const random=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296);
    // Water spreads pigment into the long kozo fibres. Clouds of colour and
    // unbleached flecks are fixed to the paper, even when the camera moves.
    for(let i=0;i<150;i++){
      const x=random()*sheet.width,y=random()*sheet.height,r=6+random()*31;
      const shade=g.createRadialGradient(x,y,0,x,y,r);
      shade.addColorStop(0,i%3?'rgba(86,26,37,.14)':'rgba(255,221,158,.24)');
      shade.addColorStop(1,i%3?'rgba(86,26,37,0)':'rgba(255,221,158,0)');
      g.fillStyle=shade;g.fillRect(x-r,y-r,2*r,2*r);
    }
    for(let i=0;i<6200;i++){
      const x=random()*392,y=random()*472,dx=(random()-.53)*7,dy=1+random()**2*8.6;
      g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+dx*.35-.6,y+dy*.59,x+dx,y+dy);
      g.lineWidth=.25+random()*.85;
      g.strokeStyle=i%4?'rgba(255,229,174,.25)':'rgba(79,39,42,.20)';g.stroke();
    }
    pulp=sheet;return sheet;
  }
  function pose({x,y,size,t,wind,light,bank=0}){
    const angle=bank+.088*sin(t*1.75)+.034*wind*sin(t*4.92);
    const spill=(size>150?.59:.18)*exp(-((t-16.55)**2)/.30);
    const yaw=.44*sin(t*.83+.8)+.15*sin(t*1.98)+spill;
    const pitch=.15+.10*sin(t*1.89-.8),s=size/200;
    const cy=cos(yaw),sy=sin(yaw),cp=cos(pitch),sp=sin(pitch),c=cos(angle),sn=sin(angle);
    const billow=9+5*wind+2.8*wind*sin(t*3.94-.5),arc=8.1+3.25*sin(t*2.52)*wind;
    function project(u,v,offset=0){
      const axis=clamp(abs(u)/78),end=clamp(v< -12?(-12-v)/76:(v+12)/123);
      const across=clamp(axis/Math.max(.05,1-end));
      const belly=4*across*(1-across)*sin(PI*end);
      const joint=(1-axis**1.5)*exp(-(((v+12)/44)**2));
      const flutter=axis**2*wind*(1-end)*sin(t*4.8+(u<0?.64:-.5));
      const z=2+10*joint-13*axis+billow*belly+1.6*flutter+offset;
      const px=u*cy+z*sy,py=(v-arc*joint+flutter*3.0)*cp+(u*sy-z*cy)*sp;
      return {x:x+(px*c-py*sn)*s,y:y+(px*sn+py*c)*s};
    }
    return {x,y,size,t,wind,light,bank,s,project,bridle:project(-3,12,36),turn:sy};
  }

  function tail(ctx,props,bottom){
    const {t,s,wind,light,size}=props,steps=size>100?61:24;
    const crest=(u)=> {
      const w=t*(2.15+.19*wind)-u*9.4;
      // Two waves move out from the tied end; only the loose edge whips.
      return {x:bottom.x+s*(u*(44+25*wind)+u*u*(57+42*wind)+u**1.15*(35*sin(w)+9*sin(1.72*w+.4))),
        y:bottom.y+s*(u*(167+16*wind)+u*13*sin(w+.4)+u*u*5*cos(w*1.72))};
    };
    const side=(a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,m=hypot(dx,dy)||1;return {x:-dy/m,y:dx/m};};
    const points=[],edges=[];
    for(let i=0;i<=steps;i++)points.push(crest(i/steps));
    for(let i=0;i<=steps;i++){
      const p=points[i],u=i/steps,tangent=side(points[Math.max(0,i-1)],points[Math.min(steps,i+1)]);
      const tw=cos(t*2.21-u*12.5-.3),w=(1.8+2.2*(1-u))*(.13+.87*abs(tw))*s;
      edges.push([[p.x+tangent.x*w,p.y+tangent.y*w],[p.x-tangent.x*w,p.y-tangent.y*w],tw]);
    }
    for(let i=1;i<=steps;i++){
      const a=edges[i-1],b=edges[i],fold=clamp(.5+.5*b[2]),u=i/steps;
      const col=Math.round(130+83*fold+12*light);
      ctx.fillStyle='rgb('+col+','+Math.round(48+32*fold+light*11)+','+Math.round(48+15*fold)+')';
      ctx.beginPath();ctx.moveTo(...a[0]);ctx.lineTo(...b[0]);ctx.lineTo(...b[1]);ctx.lineTo(...a[1]);ctx.closePath();ctx.fill();
      if(size>100&&u<.9&&fold>.48){
        ctx.beginPath();ctx.moveTo(...a[0]);ctx.lineTo(...b[0]);ctx.strokeStyle='rgba(255,190,132,.46)';ctx.lineWidth=s*.56;ctx.stroke();
      }
    }
    for(const u of [.24,.52,.82]){
      const j=Math.round(u*steps),p=points[j],normal=side(points[j-1],points[j+1]);
      const roll=sin(t*3.1-u*14);
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(normal.y,normal.x)+.26*roll);ctx.scale(s,s);
      ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-5,-1,-11,-4+1.5*roll);
      ctx.lineTo(-10,1+roll);ctx.quadraticCurveTo(-6,3.8,0,.6);ctx.quadraticCurveTo(5,4.5,9,4+roll);
      ctx.lineTo(10,.5+roll);ctx.quadraticCurveTo(5,.9,0,-.9);ctx.closePath();
      ctx.fillStyle=u===.52?'#e6c38b':'#b95b42';ctx.fill();
      ctx.fillStyle='#8f543e';ctx.fillRect(-1.3,-1.25,2.2,2.5);ctx.restore();
    }
    if(size>100){
      const end=points[steps],prev=points[steps-1];
      for(let i=0;i<4;i++){
        ctx.beginPath();ctx.moveTo(end.x,end.y);
        ctx.quadraticCurveTo(end.x+(end.x-prev.x)*1.4+i*.45*s,end.y+1.2*s,end.x+(end.x-prev.x)*(1.7+.45*i)+s*2.1*sin(t*3.4+i),end.y+s*(4+i));
        ctx.strokeStyle=i%2?'#b36450':'#e59b73';ctx.lineWidth=s*.55;ctx.stroke();
      }
    }
  }

  function draw(ctx,props){
    const {size,t,wind,light,s,project,bridle,turn}=props;
    const detailed=size>105;
    const corners=ends.map(([u,v])=>project(u,v));
    const flutter=wind*sin(t*4.8-.5);
    const hems=[[39,-54.6-flutter],[34.5,47.5+flutter],[-35.3,51-flutter],[-41,-48+flutter]];
    const rim=new Path2D();rim.moveTo(corners[0].x,corners[0].y);
    const handles=hems.map(([u,v])=>project(u,v));
    handles.forEach((h,i)=>{const b=corners[(i+1)%4];rim.quadraticCurveTo(h.x,h.y,b.x,b.y);});rim.closePath();
    const stroke=(points,col,w)=>{
      ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.strokeStyle=col;ctx.lineWidth=w;ctx.stroke();
    };
    const curve=(points,col,w)=>{
      const [a,b,c,d]=points.map(p=>project(...p));
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(b.x,b.y,c.x,c.y,d.x,d.y);
      ctx.strokeStyle=col;ctx.lineWidth=w*s;ctx.stroke();
    };
    function brush(points,col){
      ctx.beginPath();const p=project(...points[0]);ctx.moveTo(p.x,p.y);
      for(let i=1;i<points.length;i+=3){
        const a=project(...points[i]),b=project(...points[i+1]),d=project(...points[i+2]);
        ctx.bezierCurveTo(a.x,a.y,b.x,b.y,d.x,d.y);
      }
      ctx.closePath();ctx.fillStyle=col;ctx.fill();
    }
    function haze(u,v,r,col){
      const p=project(u,v),radius=r*s;
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);g.addColorStop(0,col);g.addColorStop(1,'rgba(255,143,88,0)');
      ctx.fillStyle=g;ctx.fillRect(p.x-radius,p.y-radius,2*radius,2*radius);
    }
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
    tail(ctx,props,corners[2]);
    const belly=project(0,-12);
    ctx.fillStyle='#cd493a';ctx.fill(rim);ctx.save();ctx.clip(rim);
    // The beam travels through the two sheets in the upper shoulder. The lee
    // panel falls away from it as the kite banks, with a cool red in the fold.
    const dyes=[
      ['#f88a59','#f16945','#ca453a'],['#d85f49','#c54739','#9d3a38'],
      ['#e96247','#cb493a','#a43e3a'],['#ff9363','#ed6c48','#c24c3b']
    ];
    for(let i=0;i<4;i++){
      const a=corners[i],b=corners[(i+1)%4],h=handles[i];
      const g=ctx.createLinearGradient(a.x,a.y,belly.x+.01,belly.y+.01);
      g.addColorStop(0,dyes[i][0]);g.addColorStop(.39+.10*turn,dyes[i][1]);g.addColorStop(1,dyes[i][2]);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(h.x,h.y,b.x,b.y);
      ctx.lineTo(belly.x,belly.y);ctx.closePath();ctx.fillStyle=g;ctx.fill();
    }
    if(detailed){
      haze(-25,-36,53,'rgba(255,185,102,'+(.37+.09*cos(t*1.7))+')');
      haze(20,38,48,'rgba(246,126,78,.31)');
      // A thin doublure follows the perimeter; it is darker where two red
      // edges overlap, and the buff paste catches light just inside the bend.
      ctx.strokeStyle='rgba(122,55,40,.48)';ctx.lineWidth=7.3*s;ctx.stroke(rim);
      ctx.strokeStyle='rgba(255,176,106,.52)';ctx.lineWidth=3.8*s;ctx.stroke(rim);
      for(const [coords,shadow] of [
        [[[-76,-12],[-54,-19],[-37,-22],[-24,-28]],true],
        [[[-70,-11],[-49,-12],[-22,-6],[-9,4]],false],
        [[[73,-11],[51,-11],[33,4],[27,16]],true],
        [[[72,-10],[48,5],[37,16],[30,24]],false],
        [[[1,107],[-1,80],[-13,67],[-15,49]],true],
        [[[2,106],[8,86],[15,72],[23,57]],false],
        [[[0,-85],[5,-61],[17,-48],[23,-44]],true],
        [[[0,-85],[-4,-69],[-16,-55],[-21,-49]],false]
      ])curve(coords,shadow?'rgba(115,56,49,.32)':'rgba(255,204,133,.50)',shadow?1.2:.87);
    }
    // The swallow is brushed onto the curved paper. The shoulder and tail
    // have tiny skips in the dry ink, as on the patches of undyed edge.
    brush([[-60,-28],[-39,-27],[-19,-17],[-2,-6],[9,-13],[28,-29],[55,-38],
      [38,-22],[18,-8],[7,3],[13,2],[18,1],[23,3],[13,5],[7,8],[3,9],
      [-4,19],[-9,27],[-15,35],[-12,24],[-10,16],[-9,12],[-16,18],[-21,22],[-28,26],
      [-22,17],[-15,6],[-12,2],[-26,-12],[-43,-19],[-60,-28]],'#ffe3ac');
    brush([[-49,-19],[-35,-15],[-28,-10],[-22,-4],[-32,-11],[-42,-15],[-49,-19]],'#f7cb95');
    brush([[17,-11],[30,-21],[40,-26],[48,-28],[34,-19],[27,-15],[17,-11]],'#fff0cb');
    if(detailed){
      const p=project(0,0),a=project(48,0),b=project(0,70);
      ctx.save();ctx.transform((a.x-p.x)/48,(a.y-p.y)/48,(b.x-p.x)/70,(b.y-p.y)/70,p.x,p.y);
      ctx.drawImage(paperStock(),-111,-141,222,282);ctx.restore();
      brush([[13,49],[19,47],[25,42],[28,43],[31,44],[31,49],[33,51],
        [26,55],[21,58],[17,60],[15,57],[14,53],[13,49]],'rgba(255,212,151,.49)');
      curve([[14,50],[18,48],[23,44],[27,43]],'rgba(255,232,185,.81)',.84);
      for(const [u,v] of [[19,53],[25,49]]){
        stroke([project(u-1.2,v-1.5),project(u+1.6,v+1.1)],'#966247',.72*s);
        stroke([project(u+1.1,v-1.4),project(u-.7,v+1.4)],'#ae7c54',.61*s);
      }
    }
    const spine=[ends[0],[1,-46],[-.8,62],ends[2]];
    const cross=[ends[3],[-51,-23],[42,-24],ends[1]];
    if(detailed){
      curve(spine,'rgba(101,40,35,.33)',4.2);curve(cross,'rgba(91,35,35,.34)',4.3);
    }
    curve(spine,'#976047',1.8);curve(cross,'#955a42',1.7);
    curve([[.4,-88],[1.4,-46],[-.4,62],[1.6,109]],'#edbb7c',1.0);
    curve([[-77,-13],[-50,-24],[42,-25],[76,-13]],'rgba(238,183,120,.88)',.84);
    if(detailed){
      // The eye for each bridle leg is whipped around the spine. The aft
      // binding makes a second dark layer under the translucent red paper.
      for(const v of [-69,-31,-29,-27,44,46,48,76]){
        stroke([project(-1.55,v+.3,-.5),project(1.9,v+1.25,1)],'#75503d',s*.85);
        stroke([project(-1.5,v-.15,.4),project(1.4,v+.6,1.1)],'#e9c896',s*.54);
      }
      for(let i=0;i<4;i++)curve([[-3,-16+i*1.2],[-1,-15+i],[2,-13+i],[4,-12+i*.8]],'#edce9e',.75);
    }
    ctx.restore();
    ctx.strokeStyle='#91493c';ctx.lineWidth=Math.max(.53,1.10*s);ctx.stroke(rim);
    // Triangle corner guards pivot with their wing, including its depth.
    for(const [i,b,c] of [[0,[-4.7,-81],[5,-82]],[1,[68,-18],[69,-4]],[2,[-3,102],[5,103]],[3,[-70,-17],[-71,-7]]]){
      const a=corners[i],bb=project(...b),cc=project(...c);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(bb.x,bb.y);ctx.lineTo(cc.x,cc.y);
      ctx.closePath();ctx.fillStyle='#d6aa75';ctx.fill();
      if(detailed)stroke([bb,cc],'#f1d19a',.68*s);
    }
    const p0=project(.4,-29,1.7),p1=project(-.3,46,1.7);
    stroke([p0,bridle,p1],'rgba(88,53,46,.7)',Math.max(.56,1.32*s));
    stroke([p0,bridle],'#ffe1ab',Math.max(.43,.78*s));
    stroke([p1,bridle],'#dcb387',Math.max(.38,.65*s));
    const silk=lineInFront.get(props);
    if(silk&&detailed){
      ctx.save();ctx.clip(rim);
      ctx.strokeStyle=silk.dark;ctx.lineWidth=silk.width;ctx.stroke(silk.path);
      ctx.translate(-silk.offset*.4,-silk.offset*.48);ctx.strokeStyle=silk.pale;
      ctx.lineWidth=silk.width*.50;ctx.stroke(silk.path);ctx.restore();
    }
    if(detailed){
      const {x,y}=bridle;
      const loop=new Path2D();loop.moveTo(x-.85*s,y);
      loop.bezierCurveTo(x-4*s,y-1.7*s,x-2.9*s,y-4.6*s,x-.8*s,y-3.8*s);
      loop.bezierCurveTo(x+1.1*s,y-3.2*s,x+.3*s,y-.9*s,x+.7*s,y+.7*s);
      ctx.strokeStyle='#875f4a';ctx.lineWidth=1.08*s;ctx.stroke(loop);
      ctx.strokeStyle='#efcda1';ctx.lineWidth=.65*s;ctx.stroke(loop);
      ctx.beginPath();ctx.ellipse(x,y,1.6*s,1.1*s,.62,0,PI*2);ctx.fillStyle='#ae8765';ctx.fill();
      stroke([{x:x-.6*s,y:y-1.0*s},{x:x+1.0*s,y:y+.7*s}],'#fff1c8',.77*s);
    }
    ctx.restore();
  }
  function string(ctx,hand,kite,{t,tension,light,close=false,lineScale=1}){
    const a=hand,b=kite.bridle,dx=b.x-a.x,dy=b.y-a.y,len=hypot(dx,dy);
    const sag=(1-tension)*Math.min(len*.21,125)+3;
    const silk=new Path2D();silk.moveTo(a.x,a.y);
    silk.bezierCurveTo(a.x+dx*.28+7*sin(t*.77)*(1-tension),a.y+dy*.28+sag,a.x+dx*.68,a.y+dy*.68+sag*.83,b.x,b.y);
    const dark=light>.5?'rgba(120,95,68,.50)':'rgba(57,66,76,.65)';
    const pale=light>.5?'rgba(255,236,187,.86)':'rgba(239,228,202,.79)';
    const width=(close?1.92:1.69)*lineScale;
    if(kite.size>105)lineInFront.set(kite,{path:silk,width,offset:lineScale,dark,pale});
    ctx.save();ctx.strokeStyle=dark;ctx.lineWidth=width;ctx.stroke(silk);
    ctx.translate(-.4*lineScale,-.48*lineScale);ctx.lineWidth=width*.5;
    ctx.strokeStyle=pale;ctx.stroke(silk);ctx.restore();
  }
  window.Kite={pose,draw,string};
})();
