// The hill child. All contours, fabric, thread and painted background are drawn here.
(() => {
  'use strict';
  const sin = Math.sin, cos = Math.cos, PI = Math.PI;
  const clamp = x => Math.max(0, Math.min(1, x));
  const lerp = (a,b,f) => a+(b-a)*f;
  const smooth = v => {v=clamp(v);return v*v*(3-2*v);};
  const outlines = new Map();
  function path(d) {
    if (!outlines.has(d)) outlines.set(d, new Path2D(d));
    return outlines.get(d);
  }
  function shape(c, d, color, edge, width=1) {
    const p=typeof d==='string'?path(d):d;
    if(color){ c.fillStyle=color; c.fill(p); }
    if(edge){ c.strokeStyle=edge; c.lineWidth=width; c.stroke(p); }
  }
  function line(c,d,color,width=1){shape(c,d,null,color,width);}
  function dot(c,x,y,r,color) {c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,PI*2);c.fill();}
  function grad(c,x,y,xx,yy,stops) {
    const g=c.createLinearGradient(x,y,xx,yy);
    stops.forEach(([stop,value])=>g.addColorStop(stop,value));return g;
  }
  const palette = {
    ink:['#343b44','#514035'], coat:['#bd7950','#e6a453'], shoulder:['#d59762','#ffd084'],
    fold:['#966346','#b96c40'], deep:['#735046','#975c42'], seam:['#e0a779','#f9d294'],
    hair:['#303641','#423833'], jet:['#252b37','#302e31'], sheen:['#52616c','#726051'],
    skin:['#deb49b','#f2c69c'], blush:['#be8f7d','#de9c77'], peach:['#f2cdb1','#ffe6af'],
    scarf:['#d9c8a5','#ffdf9d'], stripe:['#9c8b71','#c59767'], scarfFold:['#aa9c88','#d7ac78'],
    pants:['#415062','#5f666a'], pantsDark:['#344251','#49505b'], sock:['#bbb8a2','#d7c59d'],
    boot:['#725b4d','#947452'], sole:['#383d41','#51453a']
  };
  function colors(light) {
    const out={};light=smooth(light);
    for(const [key,[a,b]] of Object.entries(palette)){
      const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16);
      out[key]='rgb('+[16,8,0].map(n=>Math.round(lerp((A>>n)&255,(B>>n)&255,light))).join(',')+')';
    }
    return out;
  }
  function scarf(c,x,y,length,width,t,wind,p,phase,down=0) {
    const count=38,top=[],bottom=[],mid=[];
    const gain=.32+.68*wind;
    for(let i=0;i<=count;i++){
      const u=i/count, bend=Math.pow(u,.63);
      const xx=x+length*u;
      const yy=y+down*u-bend*(4+8*sin(u*5.2-.6+phase))
        +bend*gain*(11*sin(t*3.6-u*8+phase)+6*sin(t*6.2-u*13+1.9*phase));
      const slope=gain*bend*(-88*cos(t*3.6-u*8+phase)-78*cos(t*6.2-u*13+1.9*phase))/length;
      const h=width*(1-.28*u)*(.65+.35*Math.abs(cos(u*5.2-t*1.7+phase)));
      const dx=-slope*h*.45/Math.sqrt(1+slope*slope),dy=h/2/Math.sqrt(1+slope*slope);
      top.push([xx-dx,yy-dy]); bottom.push([xx+dx,yy+dy]);mid.push([xx,yy]);
    }
    const ribbon=new Path2D();
    top.forEach(([xx,yy],i)=>i?ribbon.lineTo(xx,yy):ribbon.moveTo(xx,yy));
    for(let i=count;i>=0;i--) ribbon.lineTo(...bottom[i]);
    ribbon.closePath();shape(c,ribbon,p.scarfFold,p.ink,1.35);
    for(let i=0;i<count;i++){
      const light=.4+.6*cos(i/count*5.2-t*1.7+phase);
      c.globalAlpha=clamp(.35+.52*light);
      c.fillStyle=p.scarf; c.beginPath(); c.moveTo(...top[i]);c.lineTo(...top[i+1]);
      c.lineTo(...bottom[i+1]);c.lineTo(...bottom[i]);c.closePath();c.fill();
    }
    c.globalAlpha=1;
    for(const i of [count-4,count-3]){c.beginPath();c.moveTo(...top[i]);c.lineTo(...bottom[i]);c.strokeStyle=p.stripe;c.lineWidth=1.15;c.stroke();}
    for(let j=0;j<6;j++){
      const f=j/5,xx=lerp(top[count][0],bottom[count][0],f),yy=lerp(top[count][1],bottom[count][1],f);
      c.beginPath();c.moveTo(xx,yy);c.quadraticCurveTo(xx+3,yy+sin(t*4+f*2),xx+6+sin(f*7),yy+3*sin(t*4+f*2));c.lineWidth=.85;c.strokeStyle=p.stripe;c.stroke();
    }
  }
  function legs(c,t,wind,p) {

    shape(c,'M3 -91 Q16 -94 29 -89 L30 -71 Q26 -57 23 -47 L27 -29 L13 -24 Q9 -41 10 -52 L8 -66Z',p.blush,p.ink,1.4);
    shape(c,'M12 -44 Q18 -45 25 -48 L30 -24 L14 -18Z',p.sock,p.ink,1.2);
    line(c,'M13 -40 Q20 -41 26 -44 M15 -36 Q21 -37 26 -40',p.stripe,1.1);
    shape(c,'M13 -27 Q21 -24 28 -29 L32 -13 L33 -3 Q25 0 13 -1 L0 0 Q-5 0 -4 -4 Q-4 -7 3 -10 L12 -16Z',p.boot,p.ink,1.6);
    shape(c,'M-4 -4 Q7 -2 16 -4 L31 -7 L33 -3 Q32 -1 19 0 L-3 1Z',p.sole,p.ink,.8);
    line(c,'M18 -19 Q22 -16 27 -18 M20 -15 Q25 -12 29 -14',p.seam,1);
    shape(c,'M-18 -99 Q-8 -101 5 -94 L-2 -73 Q-5 -62 -15 -56 L-32 -31 L-44 -35 L-30 -65 Q-28 -72 -28 -80Z',p.skin,p.ink,1.5);
    shape(c,'M-29 -70 Q-24 -68 -17 -69 Q-14 -66 -14 -62 L-20 -54 L-32 -40 L-35 -43Z',p.blush);
    shape(c,'M-39 -43 Q-32 -44 -25 -37 L-34 -19 L-47 -23Z',p.sock,p.ink,1.2);
    line(c,'M-39 -39 Q-34 -39 -27 -34 M-41 -35 Q-36 -35 -30 -30',p.stripe,1);
    shape(c,'M-45 -26 Q-39 -22 -32 -23 L-36 -11 L-34 -3 L-43 -2 Q-50 1 -65 1 Q-71 0 -69 -5 Q-67 -8 -58 -10 Q-53 -12 -50 -19Z',p.boot,p.ink,1.6);
    shape(c,'M-69 -4 Q-59 -1 -48 -4 L-35 -6 L-34 -3 L-43 -1 Q-57 3 -69 0Z',p.sole,p.ink,.8);
    line(c,'M-48 -17 Q-45 -13 -39 -13 M-50 -13 Q-47 -10 -42 -9',p.seam,1);
    // The lace crosses the tongue before turning through the upper eyelet.
    for(const [xx,yy,rot] of [[-47,-16,.43],[21,-19,-.03]]){
      c.save();c.translate(xx,yy);c.rotate(rot);
      for(let y=0;y<7;y+=3.5){
        dot(c,-2.6,y,.70,p.deep);dot(c,3.1,y-.3,.65,p.deep);
        line(c,'M-2.6 '+y+' l5.6 2.2 m-5.2 .5 l4.7 -3',p.seam,.58);
      }
      c.restore();
    }
    shape(c,'M-24 -113 Q-3 -117 22 -109 Q29 -106 28 -98 L31 -77 L10 -73 L2 -80 L-3 -70 Q-15 -70 -32 -81 L-28 -91Z',p.pants,p.ink,1.7);
    shape(c,'M-6 -109 Q-11 -96 -7 -91 L-1 -85 L-4 -76 L-1 -75 L3 -83 L10 -75 L22 -77 Q11 -89 9 -100 L13 -105Z',p.pantsDark);
    line(c,'M-32 -84 Q-18 -74 -5 -74 M11 -77 L28 -82 M-8 -107 Q-10 -96 -15 -91',p.sheen,1);
  }
  // A brush line is a thin filled shape. Pointed starts and dry ends keep seams,
  // brows and flyaway hairs from looking like constant-width mechanical strokes.
  function brush(c,color,width,curve) {
    const [x0,y0,x1,y1,x2,y2,x3,y3]=curve,steps=17,left=[],right=[];
    for(let i=0;i<=steps;i++) {
      const u=i/steps,v=1-u;
      const x=v*v*v*x0+3*v*v*u*x1+3*v*u*u*x2+u*u*u*x3;
      const y=v*v*v*y0+3*v*v*u*y1+3*v*u*u*y2+u*u*u*y3;
      const dx=v*v*(x1-x0)+2*v*u*(x2-x1)+u*u*(x3-x2);
      const dy=v*v*(y1-y0)+2*v*u*(y2-y1)+u*u*(y3-y2);
      const radius=width*.57*Math.pow(Math.max(0,sin(u*PI)),.64)*(1.16-.4*u)/(Math.hypot(dx,dy)||1);
      left.push([x-dy*radius,y+dx*radius]);right.push([x+dy*radius,y-dx*radius]);
    }
    c.beginPath();c.moveTo(...left[0]);
    for(let i=1;i<=steps;i++)c.lineTo(...left[i]);
    for(let i=steps;i>=0;i--)c.lineTo(...right[i]);
    c.closePath();c.fillStyle=color;c.fill();
  }
  function wash(c,x,y,rx,ry,color,fade) {
    c.save();c.translate(x,y);c.scale(rx,ry);
    const g=c.createRadialGradient(0,0,0,0,0,1);
    g.addColorStop(0,color);g.addColorStop(1,fade);
    c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
  }
  function outline(c, cx, cy, rx, ry, tilt, fill) {
    c.beginPath();c.ellipse(cx,cy,rx,ry,tilt,0,PI*2);c.fillStyle=fill;c.fill();
  }
  // A profile drawn from the eye socket outwards. Separate paint cels let the
  // eye focus and the loose hair move without swimming the pigment on the face.
  const faceEdge='M52 77 C46 90 40 105 39 118 C38.6 123.3 36.9 127.8 37.5 130.7 C38 133 41 134.8 40.3 138.1 C39.8 142.8 35.7 151.8 30.1 158.3 C27.5 161.5 23.8 164 24.2 166.4 C24.6 169.6 28.4 171.2 33.8 171.7 C36.7 172.1 37.9 174.3 37.6 176.6 C37.6 178.8 35.4 180.4 34.7 182.6 Q34.1 184.3 37.1 185.3 C39.1 186.1 39 187.2 37.4 188.4 C35.7 189.8 37.2 192.5 40.2 193.7 Q43.2 195.1 43.5 198.2 C43.8 201.2 42.4 204.5 44.3 208.5 C47.8 216.5 59.8 220.9 73.8 221.4 C92.5 221.8 111.6 216.4 128.4 209.5 Q151 200.5 165.8 184.3 C176.2 175.5 189 163.6 193.1 146.3 C201.4 113.5 185.2 80.6 151.1 68.5 C109.7 53.7 69.5 58.2 52 77Z';
  const hairBack='M38 118 C29 109 29 89 37 71 Q42 56 55 43 C70 28 86 18 107 15 Q115 11 130 12.4 C144 8 158 11 169 16 C198 20 217 39 227 62 C234 79 233 98 232 115 C232 130 238 141 244 144 Q237 147 230 141 C232 153 236 163 241 168 Q232 169 223.5 161 Q225 180 216 190 Q215.6 185 213 181 C209 195 199 203 193 207 Q196 200 196 195 C186 205 176 212 167 214 Q171 204 170 200 C156 209 147 210.6 141 210 C153 196 147 179 132 171 L81 126Z';
  const hairTop='M33 105 C28 94 33 74 43 59 C56 40 71 27 94 20 C110 13 129 13 147 16 C167 14 187 20 202 35 C222 53 231 78 229 103 C228 124 230 139 223 152 Q224 137 220 132 Q218 156 210 163 Q214 145 207 137 C201 147 197 148 189 154 Q194 137 186 132 C178 128 168 132 163 142 C158 154 159 165 146 179 Q150 167 149 158 C144 165 138 171 133 174 Q139 165 139 157 Q132 164 125 166 C137 151 134 140 138 128 C128 138 119 140 114 141 Q123 128 126 116 C116 125 108 128 96 130 Q106 119 113 105 C103 114 94 119 82 119 Q94 111 98 101 Q88 110 76 113 Q84 104 87 96 C74 108 65 110 57 112 Q65 106 68 99 C58 104 48 110 42 121 Q39 115 42 106 Q35 111 30 123 Q29 116 33 105Z';
  const bakedHeads=new Map();
  function tint(a,b,v){
    const m=parseInt(a.slice(1),16),n=parseInt(b.slice(1),16);
    return 'rgb('+[16,8,0].map(s=>Math.round(lerp((m>>s)&255,(n>>s)&255,v))).join(',')+')';
  }
  function mist(c,x,y,rx,ry,rgb,alpha,tilt=0){
    c.save();c.translate(x,y);c.rotate(tilt);
    wash(c,0,0,rx,ry,'rgba('+rgb+','+alpha+')','rgba('+rgb+',0)');c.restore();
  }
  function socket(c,k){
    // The shelf of the brow throws a warm reflected shadow across the orbit.
    shape(c,'M39 125 Q47 123 53 118 C65 111 79 112 89 117 Q79 117 70 123 Q57 131 44 136 L40 140 Q43 133 39 131Z',
      grad(c,55,117,64,139,[[0,'rgba(120,73,64,.30)'],[.65,'rgba(153,91,76,.31)'],[1,'rgba(173,111,89,.05)']]));
    mist(c,63,135,25,11,'143,81,76',.27,-.15);
    mist(c,68,148.5,22,6,'163,102,92',.27,-.23);
    mist(c,74,152,29,9,'255,224,174',.53,-.17);
    shape(c,'M40 130 C44 126.3 47 123.6 52 121.5 Q61 116.6 73 116.2 Q82 116.5 87 120.2 Q78 118.3 70 120.2 Q57 123 49 128.2 Q45 130.1 42 131Z',tint('#554545','#654b3f',k));
    for(let i=0;i<25;i++){
      const u=i/25,x=41+43*u,y=130.2-13*sin(u*2.24);
      brush(c,i%3?'rgba(70,51,46,.60)':'rgba(189,146,115,.62)',.38+(1-u)*.24,[x,y+1.6,x+.4,y-.2,x+1.9,y-2.2,x+3+u*3,y-2.9+2*u]);
    }
    brush(c,'rgba(255,225,178,.82)',1.7,[38.8,123.9,39.6,118.7,42,116.8,45.4,115.6]);
  }
  function paintFace(c,k,detail){
    const skin=grad(c,34,144,171,174,[[0,tint('#dfc5b0','#ffdfb6',k)],[.28,tint('#d0b1a3','#edbc99',k)],[.59,tint('#c39f91','#dba386',k)],[.87,tint('#ae8d86','#b98979',k)],[1,tint('#a7827f','#ad7c72',k)]]);
    shape(c,'M104 204 C112 220 115 230 108 244 C126 254 151 258 176 245 C169 227 164 217 169 191 L162 175Z',
      grad(c,111,219,167,244,[[0,tint('#937e7c','#aa786a',k)],[.35,tint('#b2988c','#d4a387',k)],[.79,tint('#c5a994','#edbe96',k)],[1,tint('#ab8b7d','#c99174',k)]]),'#8e7061',.65);
    shape(c,'M110 222 C133 215 150 205 168 190 Q165 201 166 209 C151 226 135 233 114 233Z','rgba(97,65,65,.27)');
    mist(c,136,236,17,10,'251,187,138',.29,-.25);
    shape(c,hairBack,grad(c,82,26,178,205,[[0,'#6c5146'],[.34,'#493c3d'],[.76,'#322f35'],[1,'#40393b']]));
    c.save();c.clip(path(hairBack));
    for(const lock of [
      [204,94,222,123,218,158,226,164],[211,119,229,151,221,160,221,173],
      [213,136,225,161,211,179,212,184],[194,148,211,171,201,195,193,199],
      [198,158,197,184,183,201,170,210],[181,174,178,196,161,202,150,204]
    ]){
      brush(c,'rgba(108,84,77,.34)',5.2,lock);
      const short=lock.slice();short[0]+=1.1;short[2]+=1.3;short[4]+=1.8;
      brush(c,'rgba(143,106,87,.30)',.92,short);
    }
    c.restore();
    shape(c,faceEdge,skin,'#9c7766',.68);
    c.save();c.clip(path(faceEdge));
    mist(c,40,167,18,44,'255,229,173',.62,-.05);
    mist(c,71,200,37,24,'255,223,175',.53);
    mist(c,87,166,39,21,'210,101,81',.33,-.20);
    mist(c,92,160,42,15,'249,179,130',.31,-.22);
    mist(c,122,179,36,41,'144,86,86',.29,-.38);
    mist(c,119,186,45,26,'131,91,102',.16,-.66);
    mist(c,76,177,37,13,'251,189,145',.39,-.16);
    mist(c,47,200,17,14,'255,229,193',.68);
    mist(c,66,214,31,7,'211,138,108',.35,-.02);
    mist(c,140,162,23,32,'153,95,93',.37,.15);
    mist(c,54,113,29,22,'255,235,185',.43);
    // Warm/cool turning planes remain softer across the cheek than at the nose.
    shape(c,'M36 210 C48 220 68 225 90 220 C110 215 130 208 149 197 Q159 191 173 175 Q164 196 146 211 L94 230 L32 224Z',
      grad(c,82,210,84,225,[[0,'rgba(164,104,94,0)'],[.62,'rgba(157,97,90,.48)'],[1,'rgba(182,126,101,.38)']]));
    // Cast shadow of the fringe falls down and to the right of its edge.
    c.save();c.translate(3.9,5.2);shape(c,hairTop,'rgba(114,76,78,.24)');c.restore();
    socket(c,k);
    // The nose turns away at the nostril, then catches a narrow light along its tip.
    shape(c,'M39 139 Q41 142 40 146 Q38.4 153 31.8 160.7 Q29.2 164.2 33.5 166.4 Q40.5 169 47 165.6 Q51 164 53.8 166.6 C51.3 172 45 174.9 39 174.6 Q34.6 173 31.4 171.6 L23 171 L21 165Z',
      grad(c,33,155,42,175,[[0,'rgba(214,155,124,.12)'],[.44,'rgba(203,137,117,.25)'],[.82,'rgba(164,103,94,.61)'],[1,'rgba(199,135,113,.18)']]));
    mist(c,33.9,164,10,5,'255,227,170',.51,-.23);
    mist(c,49,166,7.7,5,'183,111,93',.41,-.2);
    shape(c,'M34.7 169.8 C37.3 168.1 40.4 168.4 42 169.7 Q40 170.55 38.7 170.7 Q35.7 170.9 34.7 169.8Z','#9a6b5d');
    brush(c,'#b2826e',.85,[47,163.3,51.3,164.1,50.6,168.4,47.1,169.9]);
    brush(c,'#ffe6ba',1.03,[25.6,165.3,25.7,163.8,28.5,161.9,31.6,158.8]);
    mist(c,40.8,177.4,6,3.7,'164,106,96',.24);
    // The small freckle constellation crosses the cheek's lit plane and low bridge.
    if(detail){
      const r=seeded(7380);
      for(let i=0;i<37;i++){
        const u=r(),v=r(),x=52+u*49,y=158+v*10+2.3*sin(u*PI)-u*5;
        outline(c,x,y,.2+r()*.58,.19+r()*.47,r()-.5,'rgba(135,81,63,'+(.11+r()*.26)+')');
      }
      for(let i=0;i<410;i++){
        const x=24+r()*157,y=96+r()*127;
        c.fillStyle=i%3?'rgba(249,213,171,.068)':'rgba(127,89,96,.08)';
        c.fillRect(x,y,.4+r()*.6,.23+r()*.44);
      }
      brush(c,'rgba(173,107,93,.43)',.62,[84,147.8,80,150,76,151.6,70,151.7]);
    }
    c.restore();
    // Broken rim light is strongest where a curved plane faces the low sun.
    brush(c,k>.55?'#fff3cc':'#e8d7bf',1.42,[38.7,119.4,38.2,110.1,41.2,103.2,43.4,97.8]);
    brush(c,k>.55?'#ffe9bc':'#dfcdba',1.52,[39.9,140.1,38.8,147.2,32.9,157.4,26.4,162.6]);
    brush(c,k>.55?'#ffefc6':'#e7d2bb',1.18,[44,206.1,44.6,214.4,54.4,218.6,64.7,220]);
    const ear='M150 148 C155 136 169 130.8 180 134.9 C189.4 138.3 189.2 149.2 185.2 159.5 C181.9 168.4 172.8 177.1 165.5 181.4 C160.6 184.3 154.9 183.1 153.9 178.6 Q153 172.9 156.4 166.8 Q152.6 164.7 151.3 161.2Z';
    shape(c,ear,grad(c,150,149,183,164,[[0,tint('#c59d92','#d89b82',k)],[.45,tint('#d4ae9a','#edb292',k)],[1,tint('#b58982','#c68e7b',k)]]),'#956e67',.7);
    shape(c,'M154.7 152.1 C158.8 140.7 170.8 135.5 178.6 138.4 C185.2 141 183.6 149.2 180 155 Q182.8 143.8 176.6 142 C169.5 139.6 160.4 146.1 158.2 152.8Z','rgba(157,91,86,.56)');
    shape(c,'M158.7 160.8 Q159.5 151.1 167 148.8 Q173 146.1 176.9 147.1 C169.1 149.2 169.7 153.1 171.9 155.8 C174.9 160 172 163.3 168.3 165.7 Q167.1 170.3 160.4 173 Q164.2 167.8 162.1 165.2 Q157.2 164.5 158.7 160.8Z','#b17a6e');
    brush(c,'#edb89a',1.9,[160.3,157.2,163.9,154.5,168.4,152.9,170,150.6]);
    brush(c,'#f2c6a1',1.56,[155.5,148.1,159.8,137.4,171.5,133,178.5,136.6]);
    brush(c,'#d6aa90',1.38,[160,178.9,166.3,180.4,175.4,171.7,178.7,165.2]);
  }
  function expression(c,progress){
    // The lips part on the inhale. After the blink, only the corner rises.
    // Pivot at the near lip so its silhouette stays joined to the profile.
    const smile=progress<0?.10:smooth((progress-.55)/.37);
    const inhale=progress<0?0:smooth(progress/.20)*(1-smooth((progress-.34)/.34));
    c.save();c.translate(36,186);c.transform(1,-.12*smile,0,1+.13*inhale-.09*smile,0,0);c.translate(-36,-186);
    // Slightly open mouth, a visible vermilion roll, soft corners.
    const upper='M33.6 184.9 Q35.9 181.3 38.2 181.7 Q39.8 182.1 42 182 C45.5 182.1 47.3 184.1 50.2 184.3 Q53.1 184.4 56.2 183.8 Q53 185.4 49.8 185.8 Q42.6 185.6 37.3 186.7Z';
    shape(c,upper,grad(c,39,181,41,187,[[0,'#e5ab94'],[.48,'#bd8072'],[1,'#aa7469']]));
    shape(c,'M36.8 187.1 Q42.4 185.3 47.3 185.7 Q51.7 185.8 54 184.9 Q49.2 191.6 43.5 192.4 Q39.8 193.1 36.9 191.4Z',grad(c,40,185,43,193,[[0,'#cb8a7c'],[.54,'#e6af97'],[1,'#e8bda0']]));
    brush(c,'#855c56',.94,[36.4,186.5,41.6,185.7,47,186.9,55.6,184.1]);
    brush(c,'#fce0bd',1.12,[38.2,190.8,39.8,191.6,42.8,191.3,45.4,190.4]);
    mist(c,46.4,195.6,8.3,3.4,'163,112,96',.33,-.1);
    c.restore();
    if(smile>.01){
      c.save();c.globalAlpha=.5*smile;
      brush(c,'#b87f70',.75,[54,182.3,56,181.8,56.8,180.7,57,179.7]);c.restore();
    }
  }
  function profileEye(c,t,progress,k){
    // The cornea is seen side-on; the iris is an ellipse disappearing behind
    // the upper lid. The tear duct stays fixed while the lids meet off-centre.
    const focus=progress<0?.32:.78*smooth((progress-.11)/.052)+.22*smooth((progress-.17)/.21);
    const blink=progress<0?0:Math.exp(-((progress-.566)**2)/.00047);
    const inner=[46.1,140.4],outer=[78.5,135.6];
    const arc=new Path2D();
    function lid(p){
      p.moveTo(...inner);
      p.bezierCurveTo(48.3,lerp(137.6,142,blink),52.1,lerp(131.2,145.1,blink),58.7,lerp(130.45,143.3,blink));
      p.bezierCurveTo(65.4,lerp(129.9,142.5,blink),73,lerp(132.1,139.6,blink),...outer);
    }
    lid(arc);arc.bezierCurveTo(73,139.6,65.4,142.5,58.7,143.3);
    arc.bezierCurveTo(52.1,145.1,48.3,142,...inner);arc.closePath();
    shape(c,arc,grad(c,58,130,61,144,[[0,'#bba69a'],[.39,'#e9d8bb'],[1,'#f8e5c8']]));
    c.save();c.clip(arc);
    const x=55.8-2.3*focus+.23*sin(t*1.07),y=135.0-1.2*focus;
    // Split change in fixation: rapid eye movement, then a slower settle.
    outline(c,x,y,6.45,8.61,.17,'#594b40');
    outline(c,x+.18,y+.23,5.63,7.9,.17,grad(c,x,y-8,x+2,y+7,[[0,'#393b3c'],[.47,'#62574a'],[.79,'#937f57'],[1,'#c49a5d']]));
    outline(c,x-.49,y-.62,3.1,5.45,.15,'#282d32');
    for(let i=0;i<8;i++){
      const a=(.16+i*.112)*PI;
      const dx=cos(a),dy=sin(a);
      brush(c,i%2?'#af915d':'#6a604c',.41,[x+dx*3.6,y+dy*5.1,x+dx*4.4,y+dy*5.5,x+dx*4.8,y+dy*6.3,x+dx*5.1,y+dy*7]);
    }
    shape(c,'M43 126 H80 L79 135 Q72 131.2 61 132.7 Q50 134.2 44 141Z','rgba(68,56,57,.22)');
    outline(c,x-1.72,y-1.35,1.25,1.12,-.36,k>.65?'#fff5ce':'#eee3c8');
    outline(c,x+1.9,y+4.4,.51,.4,.1,'#dac497');
    c.restore();
    const upper=new Path2D();lid(upper);
    upper.bezierCurveTo(71.9,lerp(131,138.7,blink),65.3,lerp(128.3,141.4,blink),58.4,lerp(128.85,142.2,blink));
    upper.bezierCurveTo(52.2,lerp(129.8,144.3,blink),48,lerp(136.5,141.3,blink),...inner);upper.closePath();
    shape(c,upper,'#473c39');
    c.save();c.globalAlpha*=1-blink;
    brush(c,'#9b7466',.68,[77.5,136.3,73.8,140.4,68.5,141.9,64.5,142.6]);
    brush(c,'#ecc7a4',1.14,[51.7,144.3,56.3,145.4,63,143.7,66.2,142.6]);
    brush(c,'#d2957f',1.26,[46.2,140.4,48,139,48.7,139.3,49.1,140.2]);
    c.restore();
    brush(c,'rgba(133,89,78,.71)',.85,[44.6,135.9,51,126.9+blink*3,65.8,121.7+blink*3,77.1,131]);
    brush(c,'rgba(255,213,167,.72)',1.5,[49,131.7,53.7,127.1+blink*3,63.4,125+blink*2,68.1,125.8+blink*2]);
    brush(c,'#51433e',.79,[72.9,132.5+blink*6,76.3,134.1+blink*3,78.1,135.3,81.5,134.5]);
  }
  function hairPaint(c,k,detail){
    const base=grad(c,34,54,201,157,[[0,tint('#625752','#88674e',k)],[.18,tint('#524a4a','#694e41',k)],[.43,tint('#443e41','#503d38',k)],[.62,tint('#39383e','#423536',k)],[.87,tint('#302f37','#353037',k)],[1,tint('#39363d','#45393b',k)]]);
    shape(c,hairTop,base);
    c.save();c.clip(path(hairTop));
    mist(c,76,51,70,24,'225,166,102',.20*k+.06,-.56);
    mist(c,171,61,59,24,'169,119,88',.14,.57);
    mist(c,129,120,76,22,'27,35,43',.25,-.58);
    // Every bundle sweeps out of a part just behind the forehead. The
    // highlight breaks across the curve, leaving dark spaces between locks.
    const bundles=[
      [[116,20,72,12,38,65,32,104],[103,28,66,39,40,76,36,113]],
      [[139,22,104,16,53,53,44,105],[128,29,99,37,61,85,50,109]],
      [[154,28,128,14,68,55,55,105],[139,34,118,38,86,91,65,108]],
      [[160,31,132,24,112,66,74,109],[159,35,135,35,116,83,82,110]],
      [[170,36,142,24,127,75,88,112],[168,41,145,44,124,91,96,114]],
      [[181,43,152,37,142,83,101,119],[179,47,160,52,142,100,107,120]],
      [[190,53,168,40,149,103,118,128],[189,58,169,64,149,115,123,134]],
      [[195,67,171,61,150,101,138,135],[196,72,178,79,154,126,141,143]],
      [[198,78,183,71,154,124,147,156],[200,84,189,86,161,140,147,165]],
      [[146,19,175,11,201,37,215,61],[149,25,179,20,209,56,219,85]],
      [[174,36,198,37,218,66,222,99],[188,46,209,57,226,93,223,126]],
      [[193,73,213,69,230,108,222,134],[206,85,218,89,231,130,220,151]]
    ];
    // Crop a stroke to the part that bends toward the sun. This keeps
    // neighboring hairs from reading as equally reflective parallel wires.
    function fraction(points,lo,hi){
      const p=(u,j)=>{
        const v=1-u;
        return v*v*v*points[j]+3*v*v*u*points[j+2]+3*v*u*u*points[j+4]+u*u*u*points[j+6];
      };
      const d=(u,j)=>{
        const v=1-u;
        return v*v*(points[j+2]-points[j])+2*v*u*(points[j+4]-points[j+2])+u*u*(points[j+6]-points[j+4]);
      };
      const span=hi-lo;
      return [p(lo,0),p(lo,1),p(lo,0)+d(lo,0)*span,p(lo,1)+d(lo,1)*span,
        p(hi,0)-d(hi,0)*span,p(hi,1)-d(hi,1)*span,p(hi,0),p(hi,1)];
    }
    const r=seeded(92756);
    for(let n=0;n<bundles.length;n++){
      const [a,b]=bundles[n],count=detail?19:8;
      const mid=a.map((v,j)=>lerp(v,b[j],.47));
      const key=n<4?.38:n===9?.29:n<8?.17:.13;
      brush(c,'rgba(27,27,35,.21)',7+r()*6,mid);
      const sheen=grad(c,mid[0],mid[1],mid[6],mid[7],[
        [0,'rgba(184,139,103,0)'],[.25,'rgba(165,119,88,.08)'],[.47,'rgba(224,168,105,'+(key*.56)+')'],
        [.63,'rgba(149,104,79,.14)'],[1,'rgba(84,65,64,0)']]);
      brush(c,sheen,4+r()*5.7,fraction(mid,.09,.90));
      for(let i=0;i<count;i++){
        const u=(i+r()*.72)/count;
        const points=a.map((v,j)=>lerp(v,b[j],u)+(r()-.5)*(j<2?5.3:2.9));
        const gleam=i%6===1,full=i%5===0;
        const shade=gleam?'rgba(232,180,123,'+(key*(.4+r()*.57))+')':
          i%3===1?'rgba(28,30,36,.25)':'rgba(171,132,106,'+(.045+r()*.07)+')';
        const start=gleam?.19+r()*.21:r()*.26;
        const end=gleam?start+.16+r()*.26:.62+r()*.36;
        brush(c,shade,gleam?.36+r()*1.08:.3+r()*.71,full?points:fraction(points,start,end));
      }
    }
    mist(c,57,89,31,13,'244,182,106',.18*k,-.7);
    c.restore();
    if(detail){
      const rim=tint('#9d8e78','#fac58b',k);
      brush(c,rim,1.73,[34,91,34,65,62,37,80,29]);
      brush(c,'rgba(255,214,150,.86)',.78,[46,58,58,41,72,32,87,26]);
      brush(c,'rgba(221,171,119,.79)',1.05,[53,51,74,23,99,20,116,18]);
      brush(c,'#a48265',.95,[77,25,92,19,106,17,116,17]);
      brush(c,'rgba(221,180,146,.61)',1.15,[32,109,31,95,34,87,39,77]);
    }
  }
  function hairOutlines(c,t,wind,k,detail){
    // The trailing clumps overlap like roof tiles. Roots stay still in their
    // shadow, so only the thin ends describe the small eddies in the wind.
    const stream=[
      [206,55,228,70,244,60,11,.35],[215,72,239,88,254,76,12,1.1],
      [219,95,237,113,253,104,15,1.6],[219,120,240,142,256,135,13,2.4],
      [211,145,227,168,244,164,12,2.9],[199,164,211,192,227,190,9,3.4]
    ];
    for(let i=0;i<stream.length;i++){
      const [x,y,mx,my,ex,ey,h,ph]=stream[i],dx=wind*2.8*sin(t*2.63-ph),dy=(2+wind*9)*sin(t*2.60-ph);
      const p=new Path2D();p.moveTo(x-7,y-3);
      p.bezierCurveTo(mx-9,my-h*.32,mx+3,my+dy*.31,ex+dx,ey+dy);
      p.bezierCurveTo(ex-4+dx,ey+8+dy,mx-8,my+h,x-5,y+h);p.closePath();
      shape(c,p,i%2?'#403637':'#4b3c39');
      brush(c,'rgba(143,108,91,.49)',.76,[x+2,y+1,mx-3,my+.3,mx+5,my+dy*.62,ex+dx-2,ey+dy+1]);
    }
  }
  function strayHair(c,t,wind,k){
    const d=wind*(2.1*sin(t*2.0)+.9*sin(t*3));
    const rows=[
      [96,22,76,14,52,23,43,41],[112,18,98,10,77,12,64,24],
      [136,15,139,4,152,4,160,9],[159,19,177,13,198,18,211,30],
      [83,52,60,65,49,90,32,101],[80,68,62,84,52,110,34,116],
      [113,78,98,100,82,116,62,119],[123,88,106,115,92,126,78,126],
      [141,97,131,116,122,138,103,144],[155,110,144,129,142,160,128,173],
      [159,149,154,168,144,178,136,181],[192,53,225,61,229,85,242,92],
      [212,88,234,112,249,114,262,100],[218,143,231,169,245,167,254,160],
      [202,176,201,196,185,207,176,212]
    ];
    rows.forEach((points,i)=>{
      const curve=points.slice();curve[5]+=d*.35;curve[7]+=d*(i<4?.55:1);
      brush(c,i===5||i===6?'rgba(101,71,55,.78)':i<4?'rgba(139,107,82,.87)':'rgba(64,53,52,.83)',i%3===0?.62:.84,curve);
      if(i===1||i===5||i===9) {
        curve[5]-=1.2;curve[7]-=1.2;
        brush(c,'rgba(251,191,124,'+(.27+.3*k)+')',.48,curve);
      }
    });
  }
  function paintedHead(c,t,wind,lit,progress,detail) {
    // The portrait gets a high-resolution paper cel. Small full-body heads use
    // seven shared lighting levels as the sun moves out from behind the clouds.
    const level=detail?Math.round(clamp(lit)*16):Math.round(clamp(lit)*6);
    const k=level/(detail?16:6),id=(detail?'near':'wide')+level;
    if(!bakedHeads.has(id)){
      const canvas=document.createElement('canvas'),scale=detail?3.25:1;
      canvas.width=Math.ceil(274*scale);canvas.height=Math.ceil(265*scale);
      const g=canvas.getContext('2d');g.scale(scale,scale);g.lineJoin='round';g.lineCap='round';
      paintFace(g,k,detail);hairPaint(g,k,detail);
      bakedHeads.set(id,canvas);
    }
    c.save();c.lineJoin='round';c.lineCap='round';
    hairOutlines(c,t,wind,k,detail);
    c.drawImage(bakedHeads.get(id),0,0,274,265);
    expression(c,progress);profileEye(c,t,progress,k);
    if(detail)strayHair(c,t,wind,k);c.restore();
  }

  function head(c,t,wind,light) {
    const glance=smooth((t-18)/9)-.28*smooth((t-50)/5);
    c.save();c.translate(-5,-181);c.rotate(.08+.10*glance+.009*sin(t*1.13));
    c.scale(.277,.277);c.translate(-132,-237);
    paintedHead(c,t,wind,light,-1,false);c.restore();
  }
  // Linen and wool hold pigment differently. Paint the broken threads once and
  // curve the seams around the shoulder and collar when the child breathes.
  let twillPattern;
  function linen(c) {
    if(twillPattern)return twillPattern;
    const tile=document.createElement('canvas');tile.width=96;tile.height=96;
    const g=tile.getContext('2d'),random=seeded(3814);
    for(let i=0;i<2450;i++){
      const x=random()*96,y=random()*96,w=.25+random()*.55;
      g.beginPath();g.moveTo(x,y);g.lineTo(x+w+(i%4?1.8:-1.4),y+w*(i%4?-.5:1.7));
      g.lineWidth=w;g.strokeStyle=i%3?'rgba(255,230,182,.21)':'rgba(68,46,52,.21)';g.stroke();
    }
    twillPattern=c.createPattern(tile,'repeat');return twillPattern;
  }

  function portrait(c,{t=45,progress=0,wind=.6,light=1,width,height}) {
    const p=colors(light),rise=smooth(progress),w=clamp(wind),field=Math.max(width/960,height/540);
    c.save();c.translate(width/2,height/2);c.scale(field,field);c.translate(-480,-270);
    c.translate(545+3*rise,40+.65*sin(t*1.26));c.scale(1.52,1.52);
    c.lineJoin='round';c.lineCap='round';
    c.translate(0,.75*cos(t*1.36)+.82*smooth((progress-.59)/.34));
    scarf(c,168,241,151,16,t,w,p,.32,-28);scarf(c,170,240,149,11,t,w,p,.92,-12);
    const jacket='M99 240 C88 245 84 248 72 251 Q48 258 36 274 C27 288 23 308 15 322 L8 355 H291 L281 324 Q270 306 266 291 C260 278 248 267 234 263 Q216 257 206 248 Q194 240 181 237Z';
    shape(c,jacket,grad(c,31,260,246,326,[[0,'#f4c281'],[.24,'#dba367'],[.57,'#cb8a56'],[.85,'#a0644e'],[1,'#81564f']]),'#775441',.88);
    c.save();c.clip(path(jacket));
    wash(c,133,263,67,26,'rgba(72,43,45,.49)','rgba(101,65,44,0)');
    wash(c,61,294,23,41,'rgba(255,218,150,.55)','rgba(244,184,107,0)');
    shape(c,'M-4 333 C30 309 37 274 57 266 C47 275 42 285 39 300 Q48 287 61 278 C49 290 45 301 36 309 Q26 317 20 337Z','#eab279');
    shape(c,'M205 253 C218 265 233 268 242 280 Q235 275 228 274 Q239 281 249 300 Q242 288 224 282 Q237 291 244 313 Q254 333 270 343 L287 342 L278 281Z','#a16c56');
    shape(c,'M144 279 C159 268 174 269 184 274 Q202 285 206 309 C199 292 193 283 181 279 Q163 273 144 279Z','rgba(109,67,49,.35)');
    // Two edges on the raglan seam, broken topstitching and a few hand repairs.
    const seam='M158 268 C176 270 187 276 197 290 C205 303 213 322 217 350';
    line(c,seam,'rgba(113,68,54,.77)',1.9);
    stitching(c,'M158 267 C177 268 190 277 199 290 Q213 312 219 347','#eac294',.70);
    shape(c,'M82 255 Q88 256 95 261 C89 280 77 297 72 318 L66 348 L56 349 C60 317 70 283 82 255Z',grad(c,64,302,77,304,[[0,'#b47c56'],[.5,'#d29a68'],[1,'#b27a56']]));
    brush(c,'#885e4b',1.15,[94,261,78,291,68,321,65,348]);
    stitching(c,'M84 260 C71 291 64 317 60 343','#f6c891',.64);
    // The upper button is polished only on its sky-facing edge.
    c.save();c.translate(78,288);c.rotate(.34);
    outline(c,.7,1.1,3.25,3.65,0,'#885f4b');
    outline(c,0,0,2.95,3.2,0,grad(c,-1.5,-2.1,2,2,[[0,'#f5d293'],[.31,'#ad875e'],[.72,'#866449'],[1,'#ba9569']]));
    dot(c,-.8,-.45,.48,'#614b40');dot(c,1,.65,.47,'#634d41');
    line(c,'M-.72 -.42 Q.1 -.07 .93 .58','#e1b87f',.49);c.restore();
    shape(c,'M219 282 Q224 279 231 284 L241 293 Q241 295 239 297 L231 306 Q228 306 225 303 L216 293 Q214 290 216 287Z','#966e5a');
    stitching(c,'M218 289 Q220 285 223 284 L227 284 M230 286 L238 293 Q239 295 235 299 L231 303 M227 301 L219 293','#dbac7d',.65);
    for(let j=0;j<4;j++)line(c,'M'+(219+j*2.65)+' '+(289+j*1.8)+' l2.2 2.5','rgba(222,174,136,.65)',.73);
    c.globalAlpha=.57;c.fillStyle=linen(c);c.fillRect(7,238,285,119);c.restore();
    c.save();c.translate(136,227);c.rotate(.108+.082*smooth((progress-.13)/.55)+.0035*sin(t*1.7));c.translate(-136,-227);
    paintedHead(c,t,w,light,progress,true);c.restore();
    const collar='M103 229 Q115 229 129 235 Q148 243 166 234 C174 230 178 224 179 218 C185 218 191 222 194 227 Q201 231 201 242 Q208 252 200 259 Q192 263 182 262 C165 274 149 277 130 272 Q112 271 102 263 Q94 262 91 257 Q88 251 92 244 Q93 234 98 232Z';
    shape(c,collar,grad(c,109,227,169,273,[[0,'#f9dcac'],[.25,'#e8cba2'],[.56,'#efd5a9'],[.83,'#c2a283'],[1,'#d3ba93']]),'#927661',.82);
    c.save();c.clip(path(collar));
    shape(c,'M92 250 Q102 236 113 238 Q108 241 105 244 C123 240 141 251 156 247 Q178 242 185 226 C184 241 173 251 158 253 C136 255 116 245 105 249 Q98 249 92 256Z','#bea58b');
    shape(c,'M97 256 C110 250 129 264 148 263 Q176 263 194 241 C191 254 173 264 158 267 Q170 266 181 261 Q160 276 139 273 Q111 273 97 256Z','#c3a98c');
    wash(c,186,234,16,27,'rgba(104,86,81,.24)','rgba(119,92,80,0)');
    const rib='M87 249 C100 229 107 233 123 237 C148 246 165 246 180 227';
    c.save();c.translate(-.4,-.15);
    line(c,rib,'#aaa297',2.15);c.translate(0,1.70);line(c,rib,'#f4d4a6',.72);
    c.translate(0,1.25);line(c,rib,'rgba(131,115,103,.75)',.71);c.restore();
    brush(c,'#fff1c7',1.7,[95,244,98,236,105,230,113,232]);
    brush(c,'#a88870',.95,[104,253,116,246,122,254,135,254]);
    brush(c,'#fae0b9',1.3,[137,265,157,267,177,257,185,248]);
    const r=seeded(3339);c.beginPath();
    for(let i=0;i<490;i++){
      const x=91+r()*111,y=224+r()*51,slope=.18*cos((x-104)*.049)-.48*smooth((x-154)/40);
      c.moveTo(x,y);c.quadraticCurveTo(x+.65,y-.21,x+1.60,y+slope);
    }
    c.lineWidth=.31;c.strokeStyle='rgba(128,107,91,.30)';c.stroke();
    c.globalAlpha=.62;c.fillStyle=linen(c);c.fillRect(89,217,117,62);c.restore();
    c.restore();
  }

  function upper(c,t,wind,light,p) {
    const gust=smooth((t-7.4)/3.5)*(1-smooth((t-38)/9));
    const pull=gust+Math.exp(-((t-23.1)**2)/.46)*.35;
    // The child gives a little line, then brings the reel back against the ribs.
    const reach=3.1*sin(t*.89+.4)*wind;
    const reelX=-56+5*pull+reach,reelY=-153-9*pull+1.4*cos(t*1.1);
    const roll=-.18+.035*sin(t*1.61)-.065*pull;
    const cr=cos(roll),sr=sin(roll);
    const onReel=(x,y)=>({x:reelX+x*cr-y*sr,y:reelY+x*sr+y*cr});
    const far=onReel(-18,3),near=onReel(16,4);
    function sleeve(shoulder,wrist,farSide){
      const dx=wrist.x-shoulder.x,dy=wrist.y-shoulder.y,length=Math.hypot(dx,dy);
      const upperLength=farSide?35:32,lowerLength=farSide?35:29;
      const along=(upperLength*upperLength-lowerLength*lowerLength+length*length)/(2*length);
      const drop=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
      const elbow={x:shoulder.x+(dx*along+dy*drop)/length,y:shoulder.y+(dy*along-dx*drop)/length};
      const normal=(a,b)=>{const l=Math.hypot(b.x-a.x,b.y-a.y);return {x:(a.y-b.y)/l,y:(b.x-a.x)/l}};
      const n1=normal(shoulder,elbow),n2=normal(elbow,wrist);
      const ne={x:(n1.x+n2.x)*.66,y:(n1.y+n2.y)*.66};
      const at=(a,n,r)=>({x:a.x+n.x*r,y:a.y+n.y*r});
      const between=(a,b,u)=>({x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u)});
      const width=farSide?7.6:10.6;
      const a=at(shoulder,n1,width*.92),b=at(elbow,ne,width*.85),d=at(wrist,n2,width*.68),
        f=at(wrist,n2,-width*.70),g=at(elbow,ne,-width*1.3),j=at(shoulder,n1,-width);
      const entry=at(between(elbow,wrist,.22),n2,-width*.91);
      const exit=at(between(elbow,shoulder,.24),n1,-width*1.04);
      const q=(v)=>v.x+' '+v.y;
      const contour='M'+q(a)+' Q'+q(at(between(shoulder,elbow,.35),n1,width*1.27))+' '+q(b)+
        ' Q'+q(at(between(elbow,wrist,.59),n2,width*.88))+' '+q(d)+' L'+q(f)+
        ' Q'+q(at(between(elbow,wrist,.48),n2,-width*1.05))+' '+q(entry)+
        ' Q'+q(at(g,ne,-2.7))+' '+q(exit)+' Q'+q(at(between(shoulder,elbow,.42),n1,-width*1.17))+' '+q(j)+
        ' Q'+q(at(shoulder,{x:.17,y:-1},width*1.29))+' '+q(a)+'Z';
      shape(c,new Path2D(contour),farSide?p.fold:p.coat,p.ink,farSide?1.03:1.28);
      c.save();c.clip(new Path2D(contour));
      c.beginPath();c.moveTo(f.x,f.y);
      const mid=between(wrist,elbow,.47),fold=at(elbow,ne,-width*.32);
      c.quadraticCurveTo(mid.x,mid.y+width*.35,fold.x,fold.y);
      const pleat=at(between(elbow,shoulder,.30),n1,-width*.45);
      c.lineTo(pleat.x,pleat.y);c.lineTo(elbow.x,elbow.y);
      c.lineTo(g.x,g.y+width*.95);c.lineTo(f.x+10,f.y+10);
      c.closePath();c.fillStyle=farSide?p.deep:p.fold;c.fill();
      const crease=at(between(elbow,shoulder,.17),n1,width*.20);
      brush(c,p.deep,.92,[crease.x,crease.y,elbow.x,elbow.y+1,elbow.x-3,elbow.y-1,mid.x,mid.y]);
      const cuff=between(wrist,elbow,.205),v=at(cuff,n2,width*.8),u=at(cuff,n2,-width*.83);
      shape(c,new Path2D('M'+q(d)+' L'+q(f)+' L'+q(u)+' Q'+q(cuff)+' '+q(v)+'Z'),farSide?p.deep:p.fold);
      brush(c,p.seam,.8,[v.x,v.y,(v.x+cuff.x)/2,(v.y+cuff.y)/2,cuff.x,cuff.y,u.x,u.y]);
      if(!farSide){
        const atPatch=between(shoulder,elbow,.43);
        c.save();c.translate(atPatch.x,atPatch.y);c.rotate(Math.atan2(elbow.y-shoulder.y,elbow.x-shoulder.x)-1.57);
        shape(c,'M-4 -2 Q0 -3 4 -2 L4 3 Q1 5 -3 4Z',p.fold);
        stitching(c,'M-3 -1.5 Q0 -2 3 -1.5 L3.2 2.7 Q0 3.8 -2.7 3Z',p.seam,.50);c.restore();
      }
      c.restore();
    }
    scarf(c,9,-184,69,11,t,wind,p,1.15,5);
    scarf(c,9,-187,91,13,t,wind,p,.14,-5);
    sleeve({x:-15,y:-169},far,true);
    const hem=2.6*wind*sin(4.4*t-.7)+pull*1.7;
    const coat='M-17 -181 C-10 -186 1 -188 11 -182 Q22 -177 23 -164 C22 -151 24 -140 29 -130 '+
      'Q31 -124 29 -122 Q36 -115 '+(35+hem)+' -106 Q24 -104 20 -101 C5 -97 -11 -98 -26 -102 '+
      'L-28 -106 Q-24 -115 -26 -123 C-30 -138 -24 -149 -26 -161 Q-27 -173 -17 -181Z';
    shape(c,new Path2D(coat),grad(c,-26,-172,32,-110,[[0,p.shoulder],[.41,p.coat],[1,p.fold]]),p.ink,1.38);
    shape(c,'M-14 -175 Q-5 -181 5 -177 Q3 -173 -3 -172 L-11 -165 Q-10 -171 -14 -175Z',p.shoulder);
    shape(c,'M13 -167 Q25 -157 17 -146 Q17 -138 24 -129 L18 -132 Q18 -124 28 -116 Q17 -119 11 -126 L14 -117 Q8 -120 7 -127 Q5 -139 10 -147Z',p.fold);
    // The patch pocket and rail of stitching give the little coat a readable scale.
    shape(c,'M-20 -124 Q-13 -122 -6 -125 L-6 -113 Q-10 -108 -18 -109 L-21 -113Z',p.fold,p.deep,.77);
    line(c,'M-21 -124 Q-14 -121 -5 -125 M-24 -105 Q-4 -99 14 -104 M19 -106 L28 -108',p.seam,.74);
    line(c,'M-18 -156 Q-20 -148 -18 -140 M-21 -138 L-20 -132',p.deep,.77);
    // The same brass button and mended shoulder are visible in the close-up.
    line(c,'M-14 -172 C-13 -161 -16 -145 -17 -131 L-19 -105',p.deep,.77);
    stitching(c,'M-12.8 -172 C-12 -159 -14 -145 -15 -132 L-17 -106',p.seam,.52);
    for(const [bx,by] of [[-14,-151],[-16,-135],[-17.4,-119]]){
      outline(c,bx,by,1.17,1.40,.31,'#80634e');
      brush(c,'#e3bd83',.55,[bx-1,by,bx-1,by-1,bx-.4,by-1.2,bx+.2,by-1.2]);
    }
    head(c,t,wind,light,p);
    shape(c,'M-17 -190 Q-9 -184 -1 -185 Q8 -185 14 -191 L17 -185 Q14 -179 7 -177 Q1 -174 -6 -174 L-15 -178 L-18 -183Z',p.scarf,p.deep,1.03);
    shape(c,'M-16 -183 Q-6 -177 2 -181 Q9 -182 14 -187 Q12 -181 6 -179 Q-3 -174 -11 -178Z',p.scarfFold);
    line(c,'M-11 -185 Q-4 -181 5 -184 M0 -176 Q9 -179 12 -183',p.stripe,.7);

    sleeve({x:3,y:-171},near,false);
    c.save();c.translate(reelX,reelY);c.rotate(roll);
    // Both palms sit behind the axle. Only the pads which curl around it cross its front.
    shape(c,'M-24 3 Q-25 -1 -23 -4 Q-21 -7 -18 -6 L-13 -4 Q-10 -1 -12 3 L-16 8 Q-22 10 -24 6Z',p.blush,p.deep,.9);
    shape(c,'M10 5 Q11 1 14 -2 Q18 -5 20 -3 Q22 0 22 4 L21 8 Q15 11 10 8Z',p.skin,p.deep,.9);
    shape(c,'M-26 -1.5 L25 -.7 Q26 0 25 1.9 L-26 1Z','#a67e51',p.deep,.62);
    shape(c,'M-13 -6.7 L13 -6 Q16 -5 16 0 Q16 6 13 7 L-13 6.4Z','#c4b89b','#775f4b',.65);
    for(let x=-10;x<14;x+=3.5)line(c,'M'+x+' -6 Q'+(x+2)+' 0 '+x+' 6','#f2dfb5',.8);
    outline(c,-13,0,2.9,10.3,-.02,'#8d643d');
    outline(c,13.5,.1,3.8,10.2,-.02,'#8a5d38');
    outline(c,14,0,2.85,8.7,-.02,'#c69459');
    dot(c,14.2,0,.85,'#7b5d46');
    shape(c,'M-23 -2 Q-24 -4 -22 -5 Q-20 -6 -18 -4 L-16 -1 Q-14 0 -15 2 Q-16 4 -19 2 L-21 1 Q-22 2 -23 1Z',p.skin,p.deep,.67);
    shape(c,'M21 5 Q18 8 15 6 L13 4 Q12 3 14 2 L17 3 Q15 1 16 -1 Q17 -3 19 -2 L22 1 L23 4Z',p.skin,p.deep,.72);
    brush(c,p.peach,.87,[16,-1,18,-2,19,-1.6,20,-.5]);
    c.restore();
    return onReel(-4,-6.6);
  }
  function draw(c,{x,y,height,t=0,wind=.5,light=0}) {
    const p=colors(light),s=height/242,w=clamp(wind);
    const tug=smooth((t-7.45)/2.8)-smooth((t-37)/8);
    const lean=.012*sin(t*1.7)*w + .071*tug + .058*Math.exp(-((t-23.4)**2)/.59);
    const breath=1+.005*sin(t*2.08)+.002*sin(t*3.1);
    c.save();c.translate(x,y);c.scale(s,s);
    c.lineJoin='round';c.lineCap='round';
    // Two small contact shadows stay under the planted soles. Their longer cast
    // shadow stretches down the slope, away from the break in the western sky.
    c.save();c.transform(1,-.09,0,1,0,0);
    c.save();c.globalAlpha=.15+.11*light;c.fillStyle=light>.5?'#344c37':'#273e41';
    c.beginPath();c.ellipse(1+light*38,.8,55+light*31,3.1+.65*light,-.065,0,PI*2);c.fill();
    c.globalAlpha=.31;outline(c,-51,.4,18,2.0,-.025,'#354235');
    outline(c,15,-.1,17,1.8,-.05,'#354235');c.restore();
    legs(c,t,w,p);
    // Stubble in front of the sole locates the boots in the same grass as
    // the hill. The taller blade bends sooner than the short pressed stems.
    c.lineWidth=.63;c.strokeStyle=light>.5?'#8d975c':'#657b66';
    for(const [gx,gy,h] of [[-73,.9,5.5],[-65,1.2,3.8],[-55,1.5,4.7],[-39,1.1,2.5],[5,.5,4],[27,.8,3.1],[35,1,6.2]]){
      const bend=h*(.35+.22*w*sin(t*2.4+gx*.19));
      c.beginPath();c.moveTo(gx,gy);c.quadraticCurveTo(gx-bend*.25,gy-h*.65,gx-bend,gy-h);c.stroke();
    }
    c.restore();
    c.translate(0,-102);c.rotate(lean);c.scale(1,breath);c.translate(0,102);
    const hand=upper(c,t,w,light,p);
    c.restore();
    const hx=hand.x,hy=(hand.y+102)*breath;
    return {x:x+s*(hx*cos(lean)-hy*sin(lean)),y:y+s*(-102+hx*sin(lean)+hy*cos(lean))};
  }
  function seeded(n) {
    let value=n>>>0;
    return ()=>((value=(Math.imul(value,1664525)+1013904223)>>>0)/4294967296);
  }
  let valley;
  function background(){
    if(valley)return valley;
    valley=document.createElement('canvas');valley.width=1440;valley.height=810;
    const c=valley.getContext('2d');c.scale(1.5,1.5);
    c.fillStyle=grad(c,0,0,0,540,[[0,'#576e86'],[.34,'#a3afb3'],[.55,'#bbc5ba'],[1,'#697f78']]);c.fillRect(0,0,960,540);
    const random=seeded(3901);
    // Broad brush marks follow the cloud strata. Distant ridges lose contrast in the mist.
    for(let j=0;j<300;j++){
      const x=random()*1020-40,y=random()*195-35,w=18+random()*123,h=2+random()*10;
      c.fillStyle=random()<.43?'rgba(58,79,101,.045)':'rgba(224,218,193,.06)';
      c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+w*.22,y-h,x+w*.6,y-h,x+w,y-h*.42);
      c.quadraticCurveTo(x+w*.4,y+h*.28,x,y);c.fill();
    }
    const ridge=(x,k)=>162+k*52+24*sin(x*.0063+k*1.45)+32*sin(x*.0029+k*1.4)+10*sin(x*.017+k*1.1)+4.5*sin(x*.038+2*k);
    const ridges=['#9aaab0','#879ca2','#788d94','#697e82','#627976','#526c68','#4d645b'];
    for(let k=0;k<ridges.length;k++){
      const p=new Path2D();p.moveTo(-4,550);
      for(let x=-4;x<970;x+=2.4)p.lineTo(x,ridge(x,k)-random()*(1+k*.4));
      p.lineTo(970,550);p.closePath();shape(c,p,ridges[k]);
      c.save();c.clip(p);
      const hill=grad(c,0,150+k*49,0,244+k*50,[[0,'rgba(60,85,86,.08)'],[1,'rgba(166,178,152,.25)']]);
      c.fillStyle=hill;c.fillRect(-4,125,970,420);
      for(let i=0;i<300;i++){
        const x=random()*980,y=ridge(x,k)+random()*59,w=(3+random()*30)*(1+k*.1),h=1+random()*4;
        c.fillStyle=random()<.5?'rgba(215,211,170,.085)':'rgba(36,64,68,.08)';
        c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+w*.45,y-h*1.6,x+w,y-h);
        c.quadraticCurveTo(x+w*.45,y+h,x,y);c.fill();
      }
      c.restore();
    }
    const fog=grad(c,0,100,0,540,[[0,'rgba(204,210,200,.10)'],[.65,'rgba(190,203,188,.10)'],[1,'rgba(97,113,107,.02)']]);c.fillStyle=fog;c.fillRect(0,0,960,540);
    return valley;
  }
  let weave;
  function paper(c) {
    if(weave)return weave;
    const sheet=document.createElement('canvas');sheet.width=140;sheet.height=120;
    const ink=sheet.getContext('2d'),r=seeded(8262);
    for(let i=0;i<2650;i++){
      const x=r()*140,y=r()*120;
      ink.lineWidth=r()*.7+.18;
      ink.strokeStyle=r()<.46?'rgba(255,241,213,.14)':'rgba(63,48,52,.12)';
      ink.beginPath();ink.moveTo(x,y);ink.lineTo(x+.8+r()*2.6,y-.25-r()*.7);ink.stroke();
    }
    weave=c.createPattern(sheet,'repeat');return weave;
  }
  function stitching(c,d,col,width=1) {
    c.save();c.setLineDash([2.3,3.1]);line(c,d,col,width);c.restore();
  }
  // The reel is the registration point of the cut. Knuckles, shafts and the
  // outgoing tangent are all drawn in this coordinate system as the gust lifts it.
  // The forearms enter in perspective. Work in sleeve coordinates so the
  // warp, seam, small repairs and cast shadow all follow the turn of the cloth.
  function flightSleeve(c,x,y,angle,scale,lipOnly=false,patched=false) {
    c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);
    const cuff='M-34 2 Q-33 -6 -21 -7 Q0 -10 17 -7 Q29 -6 33 -2 Q38 8 36 19 Q21 24 2 24 Q-16 25 -33 20 Q-38 13 -34 2Z';
    if(!lipOnly){
      const jacket='M-33 16 Q-44 28 -44 51 Q-50 86 -61 116 Q-65 133 -68 146 Q-83 175 -84 203 L-104 345 L110 361 Q98 272 85 221 Q81 187 67 161 Q60 125 51 103 Q49 74 44 56 Q42 30 33 15Z';
      shape(c,jacket,grad(c,-62,114,75,135,[[0,'#80574a'],[.14,'#a76b45'],[.36,'#cc8e5c'],[.55,'#d39c6d'],[.77,'#aa7151'],[1,'#715653']]),'#6f5550',1.1);
      c.save();c.clip(path(jacket));
      const creases=[
        ['M-33 23 Q-22 36 -25 60 L-29 78 Q-26 59 -30 47 Q-35 36 -39 36Z','#a67152'],
        ['M31 20 Q18 34 16 60 Q18 50 25 42 C22 53 21 69 24 85 Q24 57 32 45 Q39 35 40 27Z','#936449'],
        ['M-54 96 Q-47 115 -24 127 Q-2 137 19 164 Q-5 147 -31 138 Q-47 131 -61 119Z','#b68058'],
        ['M47 94 C34 100 24 106 13 122 Q25 114 38 112 Q17 128 10 141 Q32 121 56 118Z','#9a6b50'],
        ['M-66 151 Q-57 147 -43 150 Q-19 155 -1 174 Q-23 157 -41 159 Q-56 159 -66 166Z','#dfaa77'],
        ['M-76 180 Q-47 172 -27 182 L-10 195 Q-45 182 -70 200Z','#95694e'],
        ['M66 166 Q48 169 31 183 Q41 172 58 164 Q70 157 72 150Z','#c38e67']
      ];c.save();c.globalAlpha=.51;for(const [d,col] of creases)shape(c,d,col);c.restore();
      const seam='M-29 21 C-31 62 -37 96 -46 129 S-68 227 -77 302';
      line(c,seam,'#896348',1.65);c.save();c.translate(1.8,0);stitching(c,seam,'#e7b283',.7);c.restore();
      if(patched){
        c.save();c.translate(16,100);c.rotate(-.27);
        shape(c,'M-16 -16 Q0 -19 15 -15 L17 8 Q15 12 11 13 L-11 15 Q-14 14 -15 10Z','#b17a58','#92664b',.7);
        stitching(c,'M-13 -13 Q0 -16 12 -13 L14 8 Q8 10 -10 12Z','#eac295',.77);
        for(let i=0;i<4;i++)line(c,`M${-9+i*4} -3 l3 4 m-3 0 l3 -4`,'#6a5e56',.9);c.restore();
      }
      c.globalAlpha=.78;c.fillStyle=paper(c);c.fillRect(-105,10,220,365);c.restore();
      outline(c,0,1,34,9,0,'#594c48');
    }else{
      shape(c,cuff,grad(c,-38,4,38,14,[[0,'#684e47'],[.24,'#84634c'],[.52,'#9e7757'],[.76,'#846349'],[1,'#614c46']]),'#644e44',.85);
      c.save();c.clip(path(cuff));
      for(let i=-36;i<37;i+=2.8){
        const k=cos(i*.09),dx=.66*sin(i*1.6);
        const rib=new Path2D(`M${i} ${-9+3*(1-k)} q${dx+1} 7 ${dx+.4} 16 q.3 4 -.4 15`);
        shape(c,rib,null,'rgba(55,44,46,.41)',1.25);c.translate(.8,0);shape(c,rib,null,'rgba(234,188,141,.32)',.81);c.translate(-.8,0);
      }
      const hem='M-37 17 Q-1 26 36 17';line(c,hem,'#564840',1.25);c.translate(0,1.4);stitching(c,hem,'#c39b73',.58);c.restore();
      brush(c,'#c89a72',1.6,[-31,-2,-17,-10,17,-10,31,-2]);
    }
    c.restore();
  }

  // Sweep the soft cross-section along the joints. The retained front depth
  // gives overlapping joints a continuous surface and one consistent skylight.
  const fingerStudies=new Map();
  function fingerForm(c,knots,options={}) {
    const key=JSON.stringify([knots,Boolean(options.cool)]);
    if(!fingerStudies.has(key)){
      const radius=Math.max(...knots.map(p=>p[2]))+2,scale=2;
      const x0=Math.floor(Math.min(...knots.map(p=>p[0]))-radius),y0=Math.floor(Math.min(...knots.map(p=>p[1]))-radius);
      const xmax=Math.ceil(Math.max(...knots.map(p=>p[0]))+radius),ymax=Math.ceil(Math.max(...knots.map(p=>p[1]))+radius);
      const plate=document.createElement('canvas');plate.width=(xmax-x0)*scale;plate.height=(ymax-y0)*scale;
      const g=plate.getContext('2d'),pixels=g.createImageData(plate.width,plate.height),depth=new Float32Array(plate.width*plate.height);
      depth.fill(-1);
      const n=knots.length-1;
      for(let j=0;j<n;j++){
        const a=knots[Math.max(0,j-1)],b=knots[j],d=knots[j+1],e=knots[Math.min(n,j+2)];
        const steps=Math.ceil(Math.hypot(d[0]-b[0],d[1]-b[1])*1.6)+2;
        for(let i=0;i<steps;i++){
          const u=i/steps,v=u*u,z=v*u;
          const [x,y,r]=b.map((val,k)=>(2*val+(-a[k]+d[k])*u+(2*a[k]-5*val+4*d[k]-e[k])*v+(-a[k]+3*val-3*d[k]+e[k])*z)*.5);
          if(r<.13)continue;
          const cx=(x-x0)*scale,cy=(y-y0)*scale,rr=r*scale;
          const xa=Math.max(0,Math.floor(cx-rr)),xb=Math.min(plate.width-1,Math.ceil(cx+rr));
          for(let py=Math.max(0,Math.floor(cy-rr));py<=Math.min(plate.height-1,Math.ceil(cy+rr));py++){
            const ny=(py+.5-cy)/rr;
            for(let px=xa;px<=xb;px++){
              const nx=(px+.5-cx)/rr,dd=1-nx*nx-ny*ny;
              if(dd<=0)continue;
              const nz=Math.sqrt(dd),h=nz*r,at=py*plate.width+px;
              if(h<=depth[at])continue;
              depth[at]=h;
              const lambert=clamp((-.43*nx-.61*ny+.58*nz+.22)/1.12);
              const soft=lambert*(.74+.26*lambert),cool=options.cool?.73:1;
              const variation=1.5*sin(px*.74+py*.67)*sin(px*2.3-py*.37)+.9*sin(x*.11+y*.15);
              const rose=5*Math.max(0,1-Math.hypot(x-knots[Math.min(3,n)][0],y-knots[Math.min(3,n)][1])/15);
              const nearRoot=(Math.hypot(x-knots[0][0],y-knots[0][1])+r*nz*.15)/24;
              const fade=smooth((nearRoot-.10)/.85),edge=clamp((1-Math.sqrt(nx*nx+ny*ny))*rr*1.55);
              const ix=at*4;
              pixels.data[ix]=170+62*soft*cool+variation+rose;
              pixels.data[ix+1]=133+61*soft*cool+variation-rose*.33;
              pixels.data[ix+2]=120+49*soft*cool+variation-rose*.39;
              pixels.data[ix+3]=255*edge*fade;
            }
          }
        }
      }
      g.putImageData(pixels,0,0);fingerStudies.set(key,{plate,x0,y0,scale});
    }
    const m=fingerStudies.get(key);c.drawImage(m.plate,m.x0,m.y0,m.plate.width/m.scale,m.plate.height/m.scale);
  }
  // The thumb changes from an independent silhouette to part of the palm
  // as it approaches the wrist. Feather only this interior meeting of forms.
  const thumbStudies=new Map();
  function softThumb(c,side,amount,paint){
    const a=Math.round(amount*26)/26,key=side+':'+a;
    if(!thumbStudies.has(key)){
      const left=side==='guide',x=left?-205:74,y=left?-58:-15,w=left?116:93,h=left?123:89;
      const plate=document.createElement('canvas');plate.width=w*2;plate.height=h*2;
      const g=plate.getContext('2d');g.scale(2,2);g.translate(-x,-y);g.lineCap='round';g.lineJoin='round';paint(g,a);
      const alpha=left?g.createLinearGradient(-158,20,-184,47):g.createLinearGradient(114,19,146,55);
      alpha.addColorStop(0,'#000');alpha.addColorStop(.30,'rgba(0,0,0,.88)');alpha.addColorStop(1,'rgba(0,0,0,0)');
      g.globalCompositeOperation='destination-in';g.fillStyle=alpha;g.fillRect(x,y,w,h);thumbStudies.set(key,{plate,x,y,w,h});
    }
    const m=thumbStudies.get(key);c.drawImage(m.plate,m.x,m.y,m.w,m.h);
  }

  function nailBed(c,x,y,angle,s,h,darker=false){
    c.save();c.translate(x,y);c.rotate(angle);c.scale(s,h);
    const bed='M-.93 -.53 Q-.65 -.91 .01 -.94 Q.66 -.94 .9 -.64 Q1 -.15 .86 .44 Q.73 .81 .27 .88 Q-.29 1 -.71 .79 Q-.98 .54 -.96 .05Z';
    shape(c,bed,grad(c,0,-1,.2,1,[[0,darker?'#bd8e83':'#c99b8b'],[.34,darker?'#d3a499':'#e1b4a3'],[.77,darker?'#dfb6a5':'#edc8b2'],[1,'#e7d1b9']]),'#b58e82',.075);
    brush(c,'#f5d8be',.11,[-.77,.65,-.4,.95,.31,.91,.64,.68]);
    brush(c,'rgba(250,221,198,.67)',.14,[-.50,-.46,-.63,-.15,-.58,.16,-.62,.34]);c.restore();
  }

  const guidingPalm='M-250 75 Q-237 59 -230 39 Q-225 27 -224 14 Q-223 2 -217 -5 Q-213 -14 -204 -17 Q-200 -27 -191 -31 Q-188 -36 -181 -36 Q-170 -37 -163 -29 Q-158 -23 -157 -12 Q-155 -2 -151 2 Q-146 5 -140 -1 Q-140 16 -149 29 Q-159 44 -174 51 Q-187 57 -192 70 L-201 94 Q-222 99 -250 75Z';
  const supportPalm='M159 100 Q154 87 141 77 Q122 68 105 54 Q91 42 85 28 Q80 16 83 7 Q84 -3 91 -10 Q95 -22 103 -26 Q109 -28 115 -20 Q123 -27 129 -18 Q136 -23 145 -12 Q152 -15 161 -5 Q167 4 168 15 Q170 27 178 35 Q192 45 214 55 L222 74 Q201 97 177 108Z';
  function skinGrain(c,d){
    c.save();c.clip(path(d));c.globalAlpha=.52;c.fillStyle=paper(c);c.fillRect(-270,-70,550,190);c.restore();
  }
  function guidingBase(c){
    shape(c,guidingPalm,grad(c,-230,-15,-157,66,[[0,'#ae887e'],[.25,'#c59a85'],[.51,'#deb299'],[.75,'#e7c5aa'],[1,'#b79a8a']]),'#805f55',.8);
    c.save();c.clip(path(guidingPalm));
    wash(c,-203,28,34,47,'rgba(164,103,89,.44)','rgba(180,113,92,0)');
    wash(c,-159,17,22,34,'rgba(248,209,173,.72)','rgba(239,196,162,0)');
    wash(c,-224,64,18,30,'rgba(133,143,144,.49)','rgba(143,143,149,0)');
    shape(c,'M-244 69 C-225 56 -217 38 -216 21 Q-209 28 -213 41 Q-218 55 -227 63 Q-209 53 -200 50 Q-217 60 -230 78Z','rgba(132,111,101,.095)');
    shape(c,'M-190 -24 Q-174 -20 -169 -7 Q-166 16 -176 27 Q-170 13 -176 2 Q-186 -11 -200 -12Z','rgba(145,101,90,.085)');
    shape(c,'M-205 72 Q-193 55 -177 45 Q-158 31 -153 15 Q-149 36 -165 48 Q-184 61 -192 77Z','rgba(251,211,173,.16)');
    for(const [col,w,pts] of [
      ['#a98270',1.1,[-205,21,-199,25,-195,29,-191,30]],['#b58c77',1.35,[-217,33,-206,37,-201,43,-199,47]],
      ['#c79780',1,[-180,28,-184,34,-193,38,-197,39]],['#b89281',.85,[-235,58,-230,63,-227,68,-226,73]],
      ['#f3c9a7',1.6,[-236,55,-229,47,-227,35,-226,28]],['#d3ad96',1.4,[-213,66,-201,65,-197,70,-195,75]]
    ])brush(c,col,w,pts);
    c.restore();skinGrain(c,guidingPalm);
  }
  function guideFingers(c,catching,open){
    // Successive joints follow the turn of the palm. The curled little and
    // ring fingers trail the open index and disappear into their cast shadows.
    open=Math.round(open*24)/24;
    const drift=Math.round((3.3*open-.55*catching)*4)/4;
    fingerForm(c,[[-217,19,5.8],[-225,6,6.8],[-230,-8,6.5],[-229,-20,6],[-222,-24,5.8],[-215,-21,5.3],[-212,-16,3.7],[-212,-13,0]],{cool:true,rose:[-215,-13,9]});
    fingerForm(c,[[-210,9,6.8],[-216,-6,7.4],[-219,-20,7.35],[-215,-34,6.9],[-207,-40,6.6],[-199,-37,6.4],[-194,-30,5.55],[-194,-25,2.8],[-196,-24,0]],{cool:true,rose:[-202,-28,12]});
    fingerForm(c,[[-202,3,7],[-201,-12,8.1],[-199,-33-drift,8.1],[-191,-48-drift,7.4],[-182,-54-drift,7.1],[-174,-50-drift,6.2],[-167,-41-drift,5.1],[-166,-35-drift,2.8],[-167,-33-drift,0]],{rose:[-188,-43-drift,12]});
    brush(c,'#9c7368',.67,[-232,-14,-230,-11,-227,-11,-225,-10]);
    brush(c,'#9f7769',.73,[-219,-24,-216,-22,-213,-22,-211,-23]);
    brush(c,'#b58b7c',.7,[-194,-42-drift,-191,-40-drift,-188,-38-drift,-186,-38-drift]);
    nailBed(c,-169.2,-39.2-drift,-.52,2.45,4.2,true);
    // Index first bends at its large knuckle, then lengthens into the pad at
    // the cord. The thumb moves independently, so the pinch opens and closes.
    const lift=open*8;
    fingerForm(c,[[-184,-9,9.5],[-184,-27,10.1],[-176,-43-lift*.28,9.6],[-161,-58-lift*.65,8.6],[-153,-63-lift*.90,8.1],[-141,-62-lift,7.1],[-123,-58-lift,6.8],[-116,-55-lift,7.1],[-107,-51-lift,5.8],[-103,-49-lift,2.8],[-103,-48-lift,0]],{rose:[-155,-59-lift,13]});
    // The low cheek of the index at the fold and its slender nail are seen edge-on.
    brush(c,'#aa7d6c',.89,[-158,-54-lift*.7,-157,-56-lift*.7,-155,-58-lift*.7,-154,-61-lift*.7]);
    brush(c,'#b88f7e',.65,[-155,-53-lift*.7,-154,-55-lift*.7,-152,-57-lift*.7,-152,-59-lift*.7]);
    brush(c,'#b08a79',.72,[-124,-52-lift,-122,-54-lift,-121,-56-lift,-121,-58-lift]);
    nailBed(c,-111,-54.5-lift,1.98,2.35,5.2);
  }
  function guideThumb(c,open){
    const drop=2.7*open;
    // The thumb pad grows from the thenar eminence. Its inner contour fades
    // into the base of the palm instead of drawing a seam across the wrist.
    const thumb=new Path2D(`M-201 52 Q-187 36 -180 21 Q-175 9 -164 -1 C-155 -9 -144 -14 -138 -19 Q-131 -25 -128 -33 Q-124 -42 -116 -47 Q-109 ${-52+drop} -104 ${-49+drop} Q-100 ${-47+drop} -102 ${-43+drop} Q-104 -39 -108 -36 C-117 -28 -117 -20 -123 -14 Q-132 -5 -136 6 Q-144 29 -161 40 Q-179 54 -197 61Z`);
    shape(c,thumb,grad(c,-154,-12,-127,19,[[0,'#d3a58e'],[.34,'#e7bea0'],[.54,'#efd0ae'],[.77,'#dcaf96'],[1,'#c79d8c']]));
    c.save();c.clip(thumb);wash(c,-108,-45,11,7,'rgba(227,153,133,.47)','rgba(205,147,131,0)');
    wash(c,-161,27,13,19,'rgba(222,160,137,.33)','rgba(222,160,137,0)');c.restore();
    line(c,'M-162 -2 Q-146 -13 -139 -18 Q-132 -24 -128 -33 Q-124 -42 -117 -46','rgba(119,86,77,.7)',.85);
    brush(c,'#9d7567',1.12,[-122,-14,-132,-3,-135,7,-141,18]);
    brush(c,'#bf907b',1.18,[-197,58,-181,51,-171,44,-163,38]);
    brush(c,'#c59982',.82,[-137,-17,-133,-17,-129,-14,-128,-12]);
    brush(c,'#aa8273',.72,[-127,-31,-124,-30,-122,-29,-121,-27]);
    nailBed(c,-110.5,-40+drop,-2.35,2.95,5.65);
    brush(c,'#f6d5b8',.98,[-153,-7,-149,-11,-142,-13,-138,-17]);
  }
  function holderBase(c){
    shape(c,supportPalm,grad(c,89,-8,187,86,[[0,'#b28477'],[.25,'#c49581'],[.52,'#d4a88e'],[.75,'#e3bfa0'],[1,'#ad9186']]),'#806157',1.0);
    c.save();c.clip(path(supportPalm));
    for(const [fx,fy] of [[107,1],[125,9],[145,15],[165,22]])wash(c,fx+2,fy+2,10,7,'rgba(108,71,63,.42)','rgba(108,71,63,0)');
    wash(c,129,22,38,31,'rgba(144,93,84,.44)','rgba(144,93,84,0)');
    wash(c,99,32,22,24,'rgba(237,186,152,.74)','rgba(237,186,152,0)');
    wash(c,166,51,10,32,'rgba(168,152,139,.35)','rgba(168,152,139,0)');
    wash(c,189,70,21,20,'rgba(232,203,174,.61)','rgba(232,203,174,0)');
    shape(c,'M173 20 Q173 36 188 43 L220 58 L211 65 Q194 54 184 51 Q171 45 166 38Z','rgba(149,113,103,.35)');
    for(const [col,w,d] of [
      ['#a07968',1.1,[114,34,125,34,136,38,145,46]],['#b68c76',.85,[119,38,128,39,134,42,139,47]],['#b4917f',1.1,[160,61,156,56,150,51,147,50]],
      ['#b38f7c',1.12,[174,79,177,73,182,68,187,66]],['#a88a79',.78,[181,82,185,74,189,71,195,69]],['#e5c3a4',1.8,[156,60,166,63,170,65,174,68]]
    ])brush(c,col,w,d);
    c.restore();skinGrain(c,supportPalm);
  }
  function holdingFingers(c,catching){
    // Finger roots turn behind the handle. The middle phalanges emerge above
    // it and angle towards the heel at different depths; each pad flattens
    // slightly against the wood as the hand seats itself on the spindle.
    const fingers=[
      [157,-1,6.2,16,5.5], [142,-6,7.3,18,2.8],
      [125,-12,8.15,20.5,1.9], [106,-15.5,8.2,18.8,0]
    ];
    for(let i=0;i<fingers.length;i++){
      const [x,y,w,len,delay]=fingers[i],give=1-catching;
      c.save();c.translate(x,y);c.rotate(-.36+i*.17+delay*.019*give);
      const end=len+delay*give;
      const finger=new Path2D(`M${-w*.97} 7 Q${-w*1.20} -.5 ${-w*.91} -6.5 Q${-w*.68} -13.2 ${-w*.10} -13.9 Q${w*.54} -14.4 ${w*.90} -9.7 Q${w*1.20} -5.5 ${w*1.18} 1.5 L${w*1.11} ${end-7.2} Q${w*.99} ${end-1.1} ${w*.61} ${end+.3} Q${w*.17} ${end+1.8} ${-w*.29} ${end+.7} Q${-w*.77} ${end-.2} ${-w*.80} ${end-4.1} Q${-w*.78} ${end-10} ${-w*.75} 8.7Z`);
      shape(c,finger,grad(c,-w,-7,w*1.1,6,[[0,'#cfaa91'],[.23,'#e8c3a6'],[.51,'#ddb296'],[.78,'#c19884'],[1,'#a58177']]));
      c.save();c.clip(finger);
      wash(c,-1,-7,w*1.5,10,'rgba(199,131,113,.33)','rgba(199,131,113,0)');
      wash(c,2,end-2,w*1.4,9,'rgba(226,163,141,.45)','rgba(226,163,141,0)');
      wash(c,-w*.38,3,w*.77,12,'rgba(241,210,178,.34)','rgba(241,210,178,0)');c.restore();
      brush(c,'#9c786a',.77,[w*.96,-5,w*1.36,5,w*1.03,end-2,w*.58,end]);
      brush(c,'#b58b77',.74,[-w*.66,-1,-w*.35,.7,w*.05,1.4,w*.49,.4]);
      brush(c,'#efd2b0',.96,[-w*.86,-7,-w*.59,-13,w*.04,-16,w*.45,-12]);
      brush(c,'#ad8979',.5,[-w*.61,2,-w*.28,3,.5,3,w*.39,2.3]);
      nailBed(c,.4,end-5.2,.11+i*.04,w*.47,i===0?3.18:4.05,true);
      c.restore();
    }
  }
  function holderThumb(c,catching){
    const dy=(1-catching)*2.6;
    c.save();c.translate(0,dy);
    const d='M151 67 Q139 53 126 47 C113 41 107 35 103 26 Q100 19 97 15 Q94 11 88 9 Q83 7 80 3 Q77 0 78 -4 Q79 -8 85 -9 Q91 -10 99 -7 Q106 -5 109 1 Q113 8 122 13 Q137 21 144 32 C150 41 155 53 157 61Z';
    shape(c,d,grad(c,100,-5,131,47,[[0,'#ebc4a7'],[.3,'#dfb098'],[.54,'#edc3a2'],[.76,'#d2a48c'],[1,'#c49481']]));
    c.save();c.clip(path(d));wash(c,85,3,12,7,'rgba(198,132,117,.56)','rgba(198,132,117,0)');wash(c,132,34,18,16,'rgba(245,204,167,.63)','rgba(245,204,167,0)');c.restore();
    line(c,'M144 32 Q139 21 123 13 Q114 9 110 1 Q105 -6 99 -7 Q89 -11 83 -8 Q77 -6 78 -2 Q77 2 81 4','rgba(123,88,74,.78)',1.05);
    brush(c,'#a97967',1.2,[80,4,85,10,95,9,101,22]);
    brush(c,'#b2816d',1.05,[104,30,108,39,123,44,134,50]);
    brush(c,'#b98a77',1,[97,-5,96,-1,94,3,94,5]);
    brush(c,'#bf907c',.78,[101,-4,100,0,98,3,98,5]);
    nailBed(c,85,-2,-1.88,3.3,5.8);
    brush(c,'#f0c9aa',1.06,[110,4,117,11,124,14,130,17]);c.restore();
  }

  function spoolEnd(c,x,facing,spin){
    c.save();c.translate(x,0);
    outline(c,-1.8,0,12.5,46,0,'#685249');
    outline(c,.2,-.6,12.1,45.3,0,'#a07550');
    const face=new Path2D();face.ellipse(3,0,11.5,44.8,-.025,0,PI*2);
    shape(c,face,grad(c,-5,-39,9,40,[[0,'#e8c894'],[.22,'#c8a274'],[.55,'#bd9062'],[.82,'#987253'],[1,'#735c50']]));
    c.save();c.clip(face);
    for(let i=0;i<18;i++){
      const xx=-9+i*1.6,drift=3.8*sin(i*.36+spin*.3);
      const mark=new Path2D(`M${xx} -47 C${xx+drift} -20 ${xx+drift-5} 3 ${xx+2.2} 22 Q${xx+4.3} 38 ${xx+1} 48`);
      shape(c,mark,null,i%3?'rgba(108,72,49,.31)':'rgba(238,207,158,.64)',i%4?.45:.8);
    }
    for(let j=0;j<2;j++){
      const a=spin+j*PI+.45,xx=3+6.25*cos(a),yy=24*sin(a);
      outline(c,xx+.15,yy+.7,1.5,3.1,0,'#d2ac7c');outline(c,xx,yy,1.15,2.25,0,'#6c5646');
    }
    c.restore();
    brush(c,'#ebc895',1.5,[-6,-37,-2,-49,5,-49,10,-32]);
    brush(c,'#745447',1.2,[-7,28,-10,11,-11,-14,-8,-27]);
    if(facing){outline(c,4,.4,3.35,8.5,-.05,'#775945');outline(c,5,.3,2.65,7.3,-.05,'#a9835e');}
    c.restore();
  }
  function threadReel(c,spin){
    const spindle='M-116 -5 Q-121 -5 -121 0 Q-121 5 -116 6 L178 8 Q188 7 188 1 Q188 -4 182 -6Z';
    shape(c,spindle,grad(c,0,-7,0,9,[[0,'#e7c597'],[.22,'#d9b07a'],[.52,'#c19361'],[.79,'#9a7252'],[1,'#705746']]),'#775f4d',.9);
    c.save();c.clip(path(spindle));
    for(let i=0;i<13;i++){
      const x=-118+i*23,y=2.5*sin(i*1.772);brush(c,i%3?'#be9666':'#f6d4a3',.62,[x,y-2,x+7,y-2.8,x+16,y+1.4,x+23,y]);
    }
    for(let x=-110;x<-99;x+=1.6)line(c,`M${x} -7 q3 6 1.5 13`,x%2<0?'#844f44':'#aa6653',1.4);
    // Small occlusion where the four distal pads meet the polished handle.
    for(const x of [108,125,144,163])wash(c,x,2.5,9,7,'rgba(79,57,51,.62)','rgba(79,57,51,0)');c.restore();
    spoolEnd(c,-66,false,spin);
    const spool='M-63 -35 Q-35 -37 -14 -35.5 Q3 -37 20 -36 Q53 -35.5 63 -34 Q74 -23 74 -1 Q74 23 63 34 Q33 36 11 34.8 Q-4 36 -22 35 Q-45 36 -66 33.5 Q-76 1 -63 -35Z';
    shape(c,spool,grad(c,0,-36,4,36,[[0,'#c6c5ae'],[.17,'#e4d9b7'],[.37,'#dbd1af'],[.58,'#c3bba1'],[.81,'#a69e88'],[1,'#807d71']]),'#857e6c',.9);
    c.save();c.clip(path(spool));
    for(let i=-39;i<39;i++){
      const x=i*1.96+spin*.45,lean=13+2.6*sin(i*.81),seam=new Path2D();
      seam.moveTo(x,-41);seam.bezierCurveTo(x+lean,-25,x+lean+2.2,16,x+1,39);
      shape(c,seam,null,'rgba(99,94,81,.52)',.97);
      c.translate(-.65,0);shape(c,seam,null,i%3?'rgba(244,233,200,.71)':'rgba(238,224,191,.52)',.72);c.translate(.65,0);
    }
    for(const [offset,slant] of [[-32,43],[1,48],[25,47],[46,-35]]){
      const x=offset+2.7*sin(spin*.6+offset),d=new Path2D();d.moveTo(x-slant*.6,38);d.bezierCurveTo(x+slant*.18,17,x+slant*.47,-13,x+slant*.44,-39);
      shape(c,d,null,'rgba(103,92,79,.47)',2.0);c.translate(-.75,-.72);shape(c,d,null,'#dfd5b7',1.25);c.translate(.75,.72);
    }
    wash(c,60,9,11,44,'rgba(86,70,55,.42)','rgba(86,70,55,0)');c.restore();
    spoolEnd(c,67,true,spin);
    // The right hub sits in the V of the grip. Its top edge is burnished.
    shape(c,'M71 -5 Q78 -7 88 -5 L89 6 Q80 8 72 6Z',grad(c,0,-6,0,8,[[0,'#dcb27c'],[.5,'#b3895e'],[1,'#816349']]),'#785c49',.7);
    brush(c,'#e2bc89',1.1,[73,-4,79,-5,83,-5.2,88,-4.5]);
  }

  function close(c,{t=0,progress=0,wind=.5,width,height,backdrop=false}) {
    const u=clamp(progress),gust=smooth((u-.28)/.21),settle=smooth((u-.63)/.33);
    const open=clamp(.42+.58*smooth(u/.22)-gust+.16*settle);
    const spin=1.38*sin(u*4.7)+3.1*gust+.52*settle;
    const field=Math.max(width/960,height/540);
    c.save();c.translate(width/2,height/2);c.scale(field,field);c.translate(-480,-270);
    if(!backdrop)c.drawImage(background(),-12+3*sin(t*.28),-10,985,565);
    const recoil=17*Math.exp(-((u-.46)**2)/.0037);
    c.translate(480-16*gust+4*settle+1.5*sin(1.52*t),323-19*gust-recoil+8*settle+1.2*cos(1.64*t));
    c.rotate(-.125-.075*gust+.034*settle+.004*wind*sin(t*2));c.scale(1.36,1.36);c.lineCap='round';c.lineJoin='round';
    // The fingertips pivot around the wrist while the cuff stays registered.
    const wristX=-217,wristY=75,turn=-.075+.11*gust+.045*open-.025*settle;
    const translateLeft=()=>{c.translate(wristX,wristY);c.rotate(turn);c.translate(-wristX,-wristY);};
    flightSleeve(c,wristX,wristY,.705,.95,false);
    flightSleeve(c,187,78,-.895,1,false,true);
    c.save();translateLeft();guidingBase(c);c.restore();
    holderBase(c);threadReel(c,spin);holdingFingers(c,gust);softThumb(c,'hold',gust,holderThumb);
    // A single continuous line runs from the upper tangent, through the
    // guide, and out of shot. Its belly collapses before the wrist catches up.
    const cord=new Path2D();
    const px=-104,py=-46+2.7*open,dx=px-wristX,dy=py-wristY;
    const tipX=wristX+dx*cos(turn)-dy*sin(turn),tipY=wristY+dx*sin(turn)+dy*cos(turn);
    const slack=1-gust+.12*settle,root=-9+8*sin(spin*.61);
    cord.moveTo(root,-35.7);cord.quadraticCurveTo((root+tipX)/2,-39+6*slack,tipX,tipY);
    cord.bezierCurveTo(tipX-19,tipY-56+8*slack,-222,-238+46*slack+5*sin(t*1.7)*slack,-319,-425);
    shape(c,cord,null,'rgba(70,65,57,.77)',1.30);c.save();c.translate(-.1,-.49);shape(c,cord,null,'#ded6ba',.75);c.restore();
    c.save();translateLeft();guideFingers(c,gust,open);softThumb(c,'guide',open,guideThumb);c.restore();
    flightSleeve(c,wristX,wristY,.705,.95,true);flightSleeve(c,187,78,-.895,1,true);
    c.restore();
  }

  window.Cast = {load:async()=>{background();},draw,close,portrait};
})();
