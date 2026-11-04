/* Original procedural cloud paintings. Each bank has a depth relief, two lighting
   studies, and a different wind field. All the artwork is made by this program. */
(() => {
  'use strict';
  const left = -420, top = -500, spanX = 2760, spanY = 1530;
  const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
  const mix = (a,b,t) => a+(b-a)*t;

  // Independent of the DOM so the expensive painting pass can run in a worker.
  function paintBank(kind, scale) {
    const lx=-420, ty=-500, w=Math.ceil(2760*scale), h=Math.ceil(1530*scale);
    const seed=1283+kind*4147;
    let s=seed;
    function rand(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}
    const tables=new Float32Array(256*256);
    for(let i=0;i<tables.length;i++) tables[i]=rand();
    const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
    const lerp=(a,b,f)=>a+(b-a)*f;
    function noise(x,y){
      let ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
      fx*=fx*(3-2*fx); fy*=fy*(3-2*fy);
      ix&=255;iy&=255;
      const i2=(ix+1)&255,j2=((iy+1)&255)<<8,j1=iy<<8;
      return lerp(lerp(tables[j1+ix],tables[j1+i2],fx),lerp(tables[j2+ix],tables[j2+i2],fx),fy);
    }
    // Each tuple sets the silhouette and gesture of a painted mass in design space.
    const forms=[
      // Distant shoals: a high pile and a few torn, level scraps of vapour.
      [[-210,511,511,90],[120,514,301,72],[329,512,191,115],[489,540,133,55],[620,552,130,26],
       [728,562,93,13],[1290,512,165,71],[1474,443,143,132],[1595,483,181,118],[1838,485,390,138],[2210,524,377,90],
       [-40,624,221,19],[408,599,136,10],[1040,565,83,9],[1450,613,206,18],[1780,610,195,13]],
      // The left system tapers from a tall cumuliform tower into a wind-torn shelf.
      [[-280,198,450,252],[-54,193,302,253],[158,218,212,173],[257,266,163,114],
       [391,330,177,97],[483,348,109,83],[581,373,147,70],[685,409,143,47],
       [813,426,135,36],[951,428,120,20],[1091,436,96,11],
       [-60,391,340,128],[168,430,251,88],[373,457,177,67],[522,484,157,39],[659,496,125,21],
       [731,522,122,37],[833,560,161,47],[919,574,101,27],[1007,581,76,13]],
      // Facing the sun is the lit edge of an enormous updraft. Its base lies downwind.
      [[2220,115,479,361],[1945,121,333,336],[1748,185,263,232],[1623,279,207,170],
       [1450,342,192,151],[1336,339,99,111],[1238,401,155,100],[1131,431,119,66],
       [1044,461,96,46],[958,469,84,31],[870,478,65,17],
       [1715,488,418,108],[1431,503,234,92],[1233,528,179,63],[1119,555,148,62],[1015,577,114,43],[924,590,116,36]],
      // Overhead plate is a sweeping shelf, with small clear intervals between its seams.
      [[-216,-145,590,229],[171,-146,477,218],[480,-179,428,196],[855,-201,482,173],[1170,-177,410,146],
       [1468,-144,395,149],[1743,-82,363,175],[2050,-16,405,201],[2252,41,364,182],
       [-31,53,297,67],[211,75,205,39],[401,82,175,17],[1662,49,177,42],[1983,113,285,76]]
    ][kind];
    const blobs=[];
    function puff(x,y,rx,ry,z,rz){blobs.push([x,y,rx,ry,z,rz]);}
    for(const [x,y,rx,ry] of forms){
      const deep=kind===0?0.72:1;
      puff(x,y,rx,ry,0,ry*deep*.89);
      const n=kind===0?10:12;
      for(let j=0;j<n;j++){
        const a=(j+rand()*.7)*Math.PI*2/n;
        const r=.64+rand()*.26;
        const k=.16+rand()*.29;
        const x1=x+Math.cos(a)*rx*r, y1=y+Math.sin(a)*ry*r;
        const ax=rx*k*(.77+rand()*.35), ay=ry*k*(.94+rand()*.48);
        const z=ry*(.04+rand()*.24);
        puff(x1,y1,ax,ay,z,ay*.98);
        for(let l=0;l<5;l++){
          const a1=rand()*6.283, q=.21+rand()*.41;
          puff(x1+Math.cos(a1)*ax*.72,y1+Math.sin(a1)*ay*.73,ax*q,ay*q,z+ay*.08,ay*q*.92);
        }
      }
      for(let j=0;j<9;j++){
        const a=rand()*6.283,r=Math.sqrt(rand())*.83;
        const ax=rx*(.1+rand()*.25),ay=ry*(.13+rand()*.32);
        puff(x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r,ax,ay,ry*(.18+.53*Math.sqrt(1-r*r)),ay*.71);
      }
    }
    // Tile the unwarped relief first, then disturb its painted contours at several scales.
    const depth=new Float32Array(w*h);depth.fill(-1000);
    for(const [x,y,rx,ry,z,rz] of blobs){
      const cx=(x-lx)*scale,cy=(y-ty)*scale,ax=rx*scale,ay=ry*scale;
      for(let j=Math.max(0,Math.floor(cy-ay));j<=Math.min(h-1,Math.ceil(cy+ay));j++){
        const py=(j-cy)/ay, extent=Math.sqrt(Math.max(0,1-py*py))*ax, row=j*w;
        for(let i=Math.max(0,Math.ceil(cx-extent));i<=Math.min(w-1,Math.floor(cx+extent));i++){
          const px=(i-cx)/ax, v=z+rz*Math.sqrt(Math.max(0,1-px*px-py*py));
          const old=depth[row+i],blend=Math.max(0,9-Math.abs(v-old));
          depth[row+i]=Math.max(old,v)+blend*blend/36;
        }
      }
    }
    const data=new Float32Array(w*h), fiber=new Float32Array(w*h);
    const warpStrength=kind===0?.63:1;
    for(let j=0;j<h;j++){
      const y=j/scale+ty+1700;
      for(let i=0;i<w;i++){
        const x=i/scale+650;
        const broad=noise(x*.0082+21,y*.0101), mid=noise(x*.024+9,y*.026),fine=noise(x*.069,y*.072+7);
        const dx=((broad-.5)*31+(mid-.5)*10+(fine-.5)*3)*warpStrength;
        const dy=((noise(x*.009+72,y*.012+23)-.5)*26+(noise(x*.032+8,y*.034)-.5)*9+(noise(x*.075+23,y*.093)-.5)*2.3)*warpStrength;
        const ix=clamp(Math.round(i+dx*scale),0,w-1), iy=clamp(Math.round(j+dy*scale),0,h-1);
        const v=depth[iy*w+ix],p=j*w+i;
        data[p]=v===-1000?v:v+(broad-.5)*11+(mid-.5)*3+(fine-.5)*.45;
        fiber[p]=(broad*.45+mid*.40+fine*.15)-.5;
      }
    }
    const cold=new Uint8ClampedArray(w*h*4),warm=new Uint8ClampedArray(w*h*4);
    const coolPal=[
      [[108,132,158],[151,174,192],[191,209,209],[228,231,211]],
      [[56,79,112],[94,121,149],[157,181,193],[225,232,216]],
      [[47,66,98],[81,108,143],[146,171,189],[219,227,214]],
      [[45,58,86],[68,88,117],[111,135,157],[175,194,197]]
    ][kind];
    const warmPal=[
      [[160,143,174],[208,165,166],[249,192,146],[255,235,176]],
      [[79,98,145],[154,139,174],[241,165,144],[255,235,173]],
      [[71,91,142],[132,130,168],[231,154,147],[255,228,155]],
      [[58,79,131],[109,116,157],[205,140,155],[255,208,150]]
    ][kind];
    const d=Math.max(1,Math.round(7*scale));
    function read(ix,iy){return data[clamp(iy,0,h-1)*w+clamp(ix,0,w-1)]}
    function band(v){
      // Washes gather in broad value groups. A dry edge separates the lit
      // billow from its reflected blue instead of shading it as a smooth sphere.
      const u=clamp(v)*4.5,i=Math.floor(u),f=u-i;
      const edge=clamp((f-.40)/.23);
      return (i+lerp(f,edge*edge*(3-2*edge),.41))/4.5;
    }
    function color(buf,p,pal,v,tooth){
      const u=clamp(v,0,.9999)*3,i=Math.floor(u),f=u-i;
      for(let c=0;c<3;c++) buf[p+c]=lerp(pal[i][c],pal[i+1][c],f)+tooth;
      buf[p+3]=255;
    }
    for(let j=0;j<h;j++){
      const worldY=j/scale+ty;
      for(let i=0;i<w;i++){
        const n=j*w+i,z=data[n];if(z < -500)continue;
        const worldX=i/scale+lx,p=n*4;
        const a=read(i-d,j), b=read(i+d,j), c=read(i,j-d), e=read(i,j+d);
        const nx=(Math.max(-8,a)-Math.max(-8,b))*scale/(2*d),ny=(Math.max(-8,c)-Math.max(-8,e))*scale/(2*d);
        const len=1/Math.sqrt(nx*nx+ny*ny+1);
        let shadow=0,backShadow=0;
        const sunDx=842-worldX,sunDy=624-worldY,inv=1/Math.sqrt(sunDx*sunDx+sunDy*sunDy+160*160);
        const sunX=sunDx*inv,sunY=sunDy*inv;
        for(const dist of [9,29,68,121]){
          const step=dist*scale;
          const zFront=read(Math.round(i-step*.53),Math.round(j-step*.85));
          const zBack=read(Math.round(i+step*sunX),Math.round(j+step*sunY));
          shadow=Math.max(shadow,clamp((zFront-z-dist*.52)/(14+dist*.42)));
          backShadow=Math.max(backShadow,clamp((zBack-z-dist*.16)/(12+dist*.56)));
        }
        const topLight=(-.49*nx-.79*ny+.42)*len;
        const sunLight=(sunX*nx+sunY*ny+.12)*len;
        const tex=fiber[n],tooth=(rand()-.5)*2.85;
        const bulk=noise(worldX*.0025+19,worldY*.0053);
        const thin=clamp(1-z/90);
        let v=clamp(.46+topLight*.40-shadow*.18+tex*.15+.13*(bulk-.45));
        let v2=clamp(.43+sunLight*.49-backShadow*.19+tex*.13+.09*(bulk-.45));
        const sideEdge=(a < -500 || b < -500 || c < -500 || e < -500);
        if(sideEdge && sunLight>.18) v2=Math.max(v2,.83+.13*sunLight);
        // Thin vapour carries extra light along the horizon-facing edges.
        const gild=thin*clamp((worldY-130)/420)*(.4+.6*clamp(sunLight));
        v2+=.10*gild;
        if(kind===0){v=.17+v*.83;v2=.22+v2*.78}
        const smallCurl=noise(worldX*.048+bulk*3.3,worldY*.060+tex*1.8);
        const eddy=(smallCurl-.5)*(.024+.034*thin)+tex*.022;
        v+=eddy;v2+=eddy;
        color(cold,p,coolPal,band(v),tooth);color(warm,p,warmPal,band(v2),tooth);
        if(sideEdge){
          const open=(a < -500)+(b < -500)+(c < -500)+(e < -500);
          const fringe=clamp(.93-.12*open+(smallCurl-.5)*.39,.39,1);
          cold[p+3]=warm[p+3]=Math.round(fringe*255);
        }
      }
    }
    // Pick up pigment on one side of a contour and lay it back along its curve.
    // The cloud keeps broad washes; their edges carry the direction of the brush.
    const dabCount=Math.round(w*h*.027);
    for(let mark=0;mark<dabCount;mark++){
      const x=Math.floor(rand()*w),y=Math.floor(rand()*h),n=y*w+x;
      if(data[n]<-500)continue;
      const gx=read(x+d,y)-read(x-d,y),gy=read(x,y+d)-read(x,y-d);
      const length=Math.max(1,Math.hypot(gx,gy));
      let ax=-gy/length,ay=gx/length;
      if(ax<0){ax=-ax;ay=-ay}
      ax=.44+.56*ax;ay=.57*ay+(rand()-.5)*.19;
      const reach=(1.6+rand()**2*16)*scale, radius=(.6+rand()**2*2.7)*scale;
      const shift=Math.round((rand()-.5)*11*scale);
      const sample=(clamp(y+shift,0,h-1)*w+clamp(x+Math.round(shift*.48),0,w-1))*4;
      if(!cold[sample+3])continue;
      const tooth=(rand()-.44)*21, opacity=.12+rand()*.30;
      const c1=[cold[sample]+tooth,cold[sample+1]+tooth,cold[sample+2]+tooth];
      const c2=[warm[sample]+tooth,warm[sample+1]+tooth*.81,warm[sample+2]+tooth*.44];
      for(let k=-Math.ceil(reach);k<=reach;k++){
        const f=k/reach, thickness=radius*(1-f*f),bend=(1-f*f)*reach*.077;
        const cx=x+k*ax,cy=y+k*ay-bend;
        for(let u=-Math.ceil(thickness);u<=thickness;u++){
          const ix=Math.round(cx-ay*u),iy=Math.round(cy+ax*u);
          if(ix<0||ix>=w||iy<0||iy>=h)continue;
          const q=(iy*w+ix)*4;if(!cold[q+3])continue;
          const alpha=opacity*clamp((thickness+.5-Math.abs(u))/.85);
          for(let ch=0;ch<3;ch++){
            cold[q+ch]=lerp(cold[q+ch],c1[ch],alpha);
            warm[q+ch]=lerp(warm[q+ch],c2[ch],alpha);
          }
        }
      }
    }
    if(kind===0){
      // Higher cirrus is pulled out of the paint in long, separated strokes.
      // Each group follows its own curved baseline. Its broken ends thin into air.
      function filament(x,y,length,rise,arch,thickness,alpha,shadow=0){
        const x0=Math.max(0,Math.floor((x-lx)*scale)),x1=Math.min(w,Math.ceil((x+length-lx)*scale));
        const icy=[[195,213,218],[153,182,200],[218,222,213]][shadow];
        const honey=[[255,219,170],[206,164,172],[255,232,185]][shadow];
        for(let i=x0;i<x1;i++){
          const u=(i/scale+lx-x)/length,f=Math.max(0,Math.sin(Math.PI*u));
          const ridge=noise(u*8.5+x*.036,y*.073);
          const line=y+rise*u+arch*Math.sin(Math.PI*u)+ridge*thickness*.35;
          const r=thickness*f*(.58+.56*noise(u*16+.072*x,y*.053));
          const j0=Math.max(0,Math.floor((line-r-ty)*scale)),j1=Math.min(h,Math.ceil((line+r-ty)*scale));
          for(let j=j0;j<j1;j++){
            const p=(j*w+i)*4;
            if(data[j*w+i]>-500)continue;
            const across=Math.abs((j/scale+ty-line)/Math.max(.5,r));
            const edge=clamp((1-across)*3.1);
            const a=alpha*f**.62*edge*(.72+.28*noise(i*.08,j*.2)),old=cold[p+3]/255;
            const combined=a+old*(1-a);
            if(combined<=0)continue;
            for(let ch=0;ch<3;ch++){
              cold[p+ch]=(icy[ch]*a+cold[p+ch]*old*(1-a))/combined;
              warm[p+ch]=(honey[ch]*a+warm[p+ch]*old*(1-a))/combined;
            }
            cold[p+3]=warm[p+3]=Math.round(combined*255);
          }
        }
      }
      // A mare's-tail crosses the blue high above the sun. Low rows diminish towards the horizon.
      const drifts=[
        [165,273,650,-156,-24,4.2,.62,12],[453,291,475,-101,-12,2.6,.37,7],
        [956,193,376,-54,-8,2.1,.49,6],[1370,145,420,-41,-14,2.5,.35,6],
        [625,436,319,-24,-5,3.4,.63,9],[923,411,181,-12,-2,2.3,.59,5],
        [658,504,218,-6,-2,2.2,.72,7],[1004,496,147,-9,-2,1.7,.71,6],
        [695,602,317,-7,1,3.0,.78,8],[1084,592,289,-6,1,2.2,.72,6],
        [278,651,291,2,-1,2.1,.82,5],[894,655,231,-3,1,2.1,.72,5],
        [549,686,270,-3,1,1.6,.72,5],[1190,660,230,-4,1,1.7,.70,4]
      ];
      for(const [x,y,l,rise,arch,thick,alpha,count] of drifts){
        filament(x,y,l,rise,arch,thick,alpha*.70,1);
        for(let k=0;k<count;k++){
          const u=rand()*.65,len=(.14+rand()*.59)*l;
          const sx=x+u*l,dy=y+u*rise+arch*Math.sin(Math.PI*u)+(rand()-.42)*(thick*5);
          filament(sx,dy,len,rise*len/l*(.74+.5*rand()),arch*len/l,thick*(.22+.91*rand()),alpha*(.39+.58*rand()),k%4===0?2:0);
        }
      }
    }
    return {w,h,cold:cold.buffer,warm:warm.buffer,kind};
  }

  const vertex=`attribute vec2 position;varying vec2 uv;
    void main(){uv=vec2(position.x*.5+.5,.5-position.y*.5);gl_Position=vec4(position,0.,1.);}`;
  const fragment=`precision highp float;
    varying vec2 uv;
    uniform sampler2D ink,lit;
    uniform vec2 plateSize,eye,screen;
    uniform float zoom,clock,layer,light,gap,wind;
    const vec2 world=vec2(1920.,1080.);
    float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
    float fbm(vec2 p){return .56*noise(p)+.27*noise(p*2.1+19.)+.12*noise(p*4.3+23.)+.05*noise(p*8.9);}
    vec3 rgb(float r,float g,float b){return vec3(r,g,b)/255.;}
    void main(){
      vec2 p=(uv-.5)*world/zoom+eye;
      if(layer<-.5){
        float y=clamp(p.y/800.,0.,1.);
        vec3 storm=mix(rgb(60.,96.,125.),rgb(182.,201.,204.),smoothstep(-.2,1.,y));
        vec3 day=mix(rgb(64.,139.,184.),rgb(142.,210.,218.),smoothstep(-.04,.49,y));
        day=mix(day,rgb(252.,183.,159.),smoothstep(.29,.70,y));
        day=mix(day,rgb(255.,214.,143.),smoothstep(.63,.91,y));
        vec2 sunpos=vec2(842.,624.);
        float dst=length((p-sunpos)*vec2(1.,1.04));
        float warm=clamp(light*.94+gap*.06,0.,1.);
        vec3 col=mix(storm,day,warm);
        vec2 streak=p*vec2(.0024,.034)+vec2(-clock*.014,0.);
        float haze=fbm(streak+fbm(streak*.45));
        float veil=smoothstep(.52,.76,haze)*(.12+.14*y);
        col=mix(col,mix(rgb(200.,209.,209.),rgb(255.,222.,179.),warm),veil);
        float glow=(.37*exp(-dst/229.)+.40*exp(-dst/70.))*warm;
        col=mix(col,rgb(255.,239.,177.),clamp(glow,0.,.86));
        float core=1.-smoothstep(19.,23.,dst);
        col=mix(col,rgb(255.,249.,209.),warm*core);
        float tooth=(hash(floor(p*.9))-.5)*.010;
        gl_FragColor=vec4(col+tooth,1.);return;
      }
      if(layer>3.5){
        vec2 delta=p-vec2(842.,624.);
        float a=atan(delta.y,delta.x);
        float beam=smoothstep(.18,.88,noise(vec2(a*8.2,clock*.008))+noise(vec2(a*19.7,4.))*.29-.16);
        float radius=length(delta);
        float opacity=beam*light*.13*smoothstep(18.,150.,radius)*(1.-smoothstep(400.,1230.,radius));
        gl_FragColor=vec4(rgb(255.,230.,161.),opacity);return;
      }
      float par=.60+.095*layer;
      p=mix(p,(uv-.5)*world/mix(1.,zoom,par)+mix(vec2(960.,540.),eye,par),.64);
      vec2 q=p;
      float phase=clock*(.48+.09*layer);
      float sail=smoothstep(0.,1.,gap);
      float bow=sin(clamp((p.y+80.)/780.,0.,1.)*3.14159);
      if(layer<.5) {q.x-=clock*.78; q.y+=sail*(33.+41.*exp(-abs(p.x-840.)/330.));}
      else if(layer<1.5) {q.x+=sail*(348.+bow*128.)+clock*1.0; q.y+=sail*(38.+bow*19.);}
      else if(layer<2.5) {q.x-=sail*(375.+bow*110.)+clock*.35;q.y+=sail*(62.+bow*14.);}
      else {q.x-=clock*1.95+sail*88.;q.y+=sail*102.;}
      float swirl=1.1+layer*.53+wind*2.6+sail*3.3;
      vec2 flow=vec2(sin(q.y*.019+sin(q.x*.005)-phase*.49)+sin(q.x*.008+q.y*.006+phase*.27),
        sin(q.x*.014+sin(q.y*.013)+phase*.39)+.6*sin(q.y*.017+phase*.47));
      q+=flow*swirl;
      vec2 tc=(q-vec2(-420.,-500.))/vec2(2760.,1530.);
      if(any(lessThan(tc,vec2(0.)))||any(greaterThan(tc,vec2(1.))))discard;
      vec4 c=texture2D(ink,tc), s=texture2D(lit,tc);
      if(c.a<.001)discard;
      float d=length((p-vec2(842.,624.))*vec2(.85,.95));
      float arriving=smoothstep(0.,1.,light*1.27+(.47-d/1340.)*sin(light*3.14159)*.44);
      vec3 col=mix(c.rgb,s.rgb,arriving)/max(c.a,.001);
      float haze=(.066+.28*arriving)*exp(-d/570.)*(.60+.40*(3.-layer)/3.);
      col=mix(col,mix(rgb(177.,192.,206.),rgb(255.,201.,130.),arriving),haze);
      gl_FragColor=vec4(col,c.a);
    }`;
  let gl,program,gpuCanvas,loc={},plates=[],gpuPlates=[],worker;
  function setupGL(){
    gpuCanvas=document.getElementById('sky-layer')||document.createElement('canvas');
    gl=gpuCanvas.getContext('webgl',{alpha:false,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    if(!gl)return;
    function shader(type,src){
      const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
      if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;
    }
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(program,'position');gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pos);
    for(const k of ['eye','zoom','clock','layer','gap','light','wind','ink','lit'])loc[k]=gl.getUniformLocation(program,k);
    gl.uniform1i(loc.ink,0);gl.uniform1i(loc.lit,1);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gpuCanvas.addEventListener('webglcontextlost',e=>{e.preventDefault();gl=null;});
  }
  function addPlate({w,h,cold,warm,kind}){
    plates[kind]=[cold,warm].map(arr=>{
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(arr),w,h),0,0);
      return canvas;
    });
    if(gl)gpuPlates[kind]=plates[kind].map(canvas=>{
      const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
      for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
      for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);return tex;
    });
  }
  async function load(){
    try{setupGL()}catch(err){console.warn('Using canvas sky:',err.message);gl=null}
    const small=window.innerWidth<800,scale=small?.53:.75;
    const jobs=[0,1,2,3];
    try{
      const code='const paint='+paintBank.toString()+';onmessage=e=>{for(const kind of e.data.jobs){const p=paint(kind,e.data.scale);postMessage(p,[p.cold,p.warm]);}}';
      const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
      try{await new Promise((resolve,reject)=>{
        worker=new Worker(url);let n=0;
        worker.onmessage=e=>{try{addPlate(e.data);if(++n===4)resolve();}catch(er){reject(er)}};
        worker.onerror=reject;worker.postMessage({jobs,scale});
      })}finally{if(worker)worker.terminate();URL.revokeObjectURL(url)}
    }catch{
      for(const kind of jobs)if(!plates[kind]){addPlate(paintBank(kind,scale));await new Promise(resolve=>setTimeout(resolve,0))}
    }
  }
  function drawFallback(ctx,params){
    const {eyeX,eyeY,zoom,t,light,gap}=params;
    const rgb=(a,b)=>'rgb('+a.map((x,i)=>Math.round(mix(x,b[i],light))).join(',')+')';
    ctx.save();ctx.translate(960,540);ctx.scale(zoom,zoom);ctx.translate(-eyeX,-eyeY);
    let g=ctx.createLinearGradient(0,-70,0,840);g.addColorStop(0,rgb([59,91,120],[75,152,196]));g.addColorStop(.64,rgb([143,173,185],[255,197,148]));g.addColorStop(1,rgb([189,202,201],[255,220,165]));
    ctx.fillStyle=g;ctx.fillRect(-2000,-2000,6000,6000);
    if(light){ctx.globalAlpha=light;g=ctx.createRadialGradient(842,624,12,842,624,240);g.addColorStop(0,'#fff2bd');g.addColorStop(.13,'rgba(255,222,154,.62)');g.addColorStop(1,'rgba(255,205,119,0)');ctx.fillStyle=g;ctx.fillRect(602,384,480,480);ctx.globalAlpha=1}
    plates.forEach((pair,i)=>{
      const dx=[t*.78,-gap*450-t,gap*485+t*.35,t*1.95+gap*88][i],dy=[-24,-56,-77,-102][i]*gap;
      for(let j=0;j<12;j++){
        const strip=pair[0].height/12, y=j*spanY/12;
        const x=left+dx+Math.sin(t*.34+j*.61+i)*1.75;
        const dest=[x,top+y+dy,spanX,spanY/12+.7];
        ctx.drawImage(pair[0],0,j*strip,pair[0].width,strip,...dest);
        if(light>.001){ctx.globalAlpha=light;ctx.drawImage(pair[1],0,j*strip,pair[1].width,strip,...dest);ctx.globalAlpha=1}
      }
    });
    ctx.restore();
  }
  let lastKey='';
  function draw(ctx,params){
    if(!gl){drawFallback(ctx,params);return}
    const blur=params.focusBlur?Math.round(params.focusBlur*ctx.canvas.clientWidth/600*4)/4:0;
    const css=blur?'blur('+blur+'px)':'';
    if(gpuCanvas.style.filter!==css)gpuCanvas.style.filter=css;
    const {eyeX,eyeY,zoom,t,light,gap,wind}=params;
    const width=Math.min(1600,ctx.canvas.width),height=Math.round(width*9/16);
    if(gpuCanvas.width!==width||gpuCanvas.height!==height){gpuCanvas.width=width;gpuCanvas.height=height;gl.viewport(0,0,width,height)}
    // Cloud pigment is animated on twos. Cloth, camera and grass are sampled on every frame.
    const key=[Math.floor(t*24),width,eyeX.toFixed(0),eyeY.toFixed(0)].join('/');
    if(key!==lastKey){
      lastKey=key;
      gl.uniform2f(loc.eye,eyeX,eyeY);gl.uniform1f(loc.zoom,zoom);gl.uniform1f(loc.clock,t);gl.uniform1f(loc.light,light);gl.uniform1f(loc.gap,gap);gl.uniform1f(loc.wind,wind);
      // Textures must be complete even for the branch which draws the clear sky.
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,gpuPlates[0][0]);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,gpuPlates[0][1]);
      gl.uniform1f(loc.layer,-1);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      gpuPlates.forEach(([a,b],i)=>{
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,a);
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,b);
        gl.uniform1f(loc.layer,i);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      });
      if(light>.003){gl.uniform1f(loc.layer,4);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
    }
    if(!gpuCanvas.isConnected)ctx.drawImage(gpuCanvas,0,0,1920,1080);
  }
  window.Sky={load,draw,get separateLayer(){return Boolean(gl&&gpuCanvas.isConnected)}};
})();
