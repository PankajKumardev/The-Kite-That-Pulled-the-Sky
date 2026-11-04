/* Landscape department. Every mark, leaf, ridge and flower is painted at runtime. */
window.Land = (() => {
  'use strict';
  const W = 1920, H = 1080, PAD = 80, TAU = Math.PI * 2;
  const clip = (v, lo=0, hi=1) => Math.max(lo, Math.min(hi, v));
  const lerp = (a,b,t) => a + (b-a)*t;
  const ground = x => 1014 - 222 * (x / W) + 27 * Math.sin(x/373 - .2) + 9 * Math.sin(x/192 + .7);
  const feet = {x:1410, y:Math.round(ground(1410) + 4)};
  const buffers = {}, tussocks = [], wildflowers = [], nearSprays = [];
  const colorCache = new Map();
  const grassesAtlas = {cool:null,warm:null,blend:null,grade:-1};
  let loaded = false;

  function rng(seed) {
    return () => {
      seed = (Math.imul(1664525,seed) + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    };
  }
  const noise = (() => {
    const r = rng(310827), a = Float32Array.from({length:2048},r);
    return v => {
      const i = Math.floor(v), f = v-i, u = f*f*(3-2*f);
      return lerp(a[i&2047],a[(i+1)&2047],u)*2-1;
    };
  })();
  function rgb(h) {
    if (!colorCache.has(h)) {
      const n = parseInt(h.slice(1),16);
      colorCache.set(h,[n>>16,(n>>8)&255,n&255]);
    }
    return colorCache.get(h);
  }
  function tone(a,b,k) {
    const x=rgb(a), y=rgb(b);
    return 'rgb('+Math.round(lerp(x[0],y[0],k))+','+Math.round(lerp(x[1],y[1],k))+','+Math.round(lerp(x[2],y[2],k))+')';
  }
  function stroke(g,points,colour,width) {
    g.beginPath(); g.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2) g.lineTo(points[i],points[i+1]);
    g.lineWidth=width; g.strokeStyle=colour; g.stroke();
  }
  function polygon(g,vertices,c) {
    g.fillStyle=c;g.beginPath();g.moveTo(vertices[0],vertices[1]);
    for(let n=2;n<vertices.length;n+=2)g.lineTo(vertices[n],vertices[n+1]);
    g.closePath();g.fill();
  }
  function patch(g,x,y,rx,ry,c,rand,tilt=0) {
    g.beginPath();g.fillStyle=c;
    for(let i=0;i<24;i++) {
      const a=i/24*TAU, r=.88+rand()*.20;
      const dx=Math.cos(a)*rx*r, dy=Math.sin(a)*ry*r+dx*tilt;
      if(!i) g.moveTo(x+dx,y+dy); else g.lineTo(x+dx,y+dy);
    }
    g.closePath();g.fill();
  }
  function plate(name,kind,y,paint) {
    const c=document.createElement('canvas'); c.width=W+2*PAD; c.height=H-y+55;
    const g=c.getContext('2d');g.translate(PAD,-y);g.lineJoin='round';g.lineCap='round';
    paint(g,kind);
    (buffers[name] ||= {y, plates:[]}).plates.push(c);
  }
  // Each ridge is a separate pencil line. Broad sinusoidal ranges give way to
  // asymmetrical summits and broken scree contours near the edge of the valley.
  // The high limestone cirque has a chipped double summit. Two much smoother,
  // forested shoulders overlap it from opposite sides of the valley.
  const profiles = [
    [[-81,749],[-13,717],[37,731],[69,712],[130,699],[186,675],[209,652],[239,664],[260,652],[275,659],[309,632],[326,638],[341,619],[354,625],[371,621],[392,646],[412,650],[437,638],[455,609],[469,605],[478,596],[492,607],[501,626],[522,632],[537,654],[559,657],[601,690],[644,699],[691,731],[731,725],[766,734],[837,736],[920,719],[946,719],[970,701],[999,705],[1031,689],[1077,700],[1120,694],[1181,719],[1256,713],[1284,723],[1356,697],[1404,683],[1438,653],[1468,660],[1500,635],[1516,639],[1551,613],[1567,618],[1590,611],[1618,641],[1652,648],[1674,673],[1713,674],[1757,698],[1820,685],[1878,693],[1941,679],[2003,687]],
    [[-81,724],[-23,722],[41,730],[127,755],[196,750],[235,756],[345,786],[428,787],[480,807],[537,804],[646,827],[751,815],[850,795],[914,789],[974,780],[1042,754],[1114,750],[1197,719],[1276,708],[1346,711],[1410,725],[1492,760],[1549,768],[1616,777],[1694,758],[1794,733],[1855,741],[1953,737],[2003,742]],
    [[-81,776],[5,771],[88,779],[184,804],[276,810],[377,842],[484,851],[608,876],[754,887],[847,868],[954,868],[1097,833],[1184,826],[1279,798],[1353,795],[1478,756],[1559,747],[1665,750],[1747,765],[1857,758],[1923,737],[2003,739]]
  ];
  function ridge(k,x) {
    const arr=profiles[k];let i=1;
    while(i<arr.length-1 && x>arr[i][0])i++;
    const a=arr[i-1],b=arr[i],f=clip((x-a[0])/(b[0]-a[0]));
    const u=f*f*(3-2*f),s=k===0?f*.78+u*.22:u*.76+f*.24;
    const rough=k===0?1:k===1?.49:.60;
    return lerp(a[1],b[1],s) + rough*(noise(x*.044+k*27)*2.6+noise(x*.13+k)*1.2+noise(x*.245)*.65);
  }
  function below(g,line,base=H+60,step=3) {
    g.beginPath(); g.moveTo(-PAD,base);
    for(let x=-PAD;x<=W+PAD;x+=step)g.lineTo(x,line(x));
    g.lineTo(W+PAD,base);g.closePath();
  }
  const peaksCool=[
    ['#879ba9','#738494','#b6c1ba','#adbabc'],
    ['#748d91','#596e80','#97a89b','#98b0a9'],
    ['#547577','#405c70','#80998a','#85a096']
  ];
  const peaksWarm=[
    ['#c0a7aa','#9a8fa5','#f5c6a7','#edc8ac'],
    ['#a5a7a1','#7e8398','#d9baa0','#c5b99e'],
    ['#84998b','#5a7681','#b7ba8c','#b2b59b']
  ];
  function rockWash(k,p,baseY) {
    // Reverse-map the slope at each point down a branching ridge. Shading follows
    // local changes in elevation and the gullies dissipate in the valley haze.
    const topY=564,step=2,c=document.createElement('canvas');
    c.width=Math.ceil((W+PAD*2)/step);c.height=Math.ceil((baseY-topY+70)/step);
    const ctx=c.getContext('2d'),pixels=ctx.createImageData(c.width,c.height),data=pixels.data;
    const dark=rgb(p[1]),sun=rgb(p[2]),fog=rgb(p[3]),neutral=rgb(p[0]);
    const margin=430, mapSize=W+margin*2+2,top=new Float32Array(mapSize),slopes=new Float32Array(mapSize);
    for(let i=0;i<mapSize;i++)top[i]=ridge(k,i-margin);
    for(let i=0;i<mapSize;i++)slopes[i]=((top[clip(i+4,0,mapSize-1)]-top[clip(i-4,0,mapSize-1)])/8)*.44 + ((top[clip(i+14,0,mapSize-1)]-top[clip(i-14,0,mapSize-1)])/28)*.56;
    let at=0;
    for(let yy=0;yy<c.height;yy++){
      const y=topY+yy*step;
      for(let xx=0;xx<c.width;xx++){
        const x=-PAD+xx*step, base=top[margin+x], d=Math.max(0,y-base);
        const drift=.32+.41*noise(x*.0057+k*16)+.21*noise(y*.022+x*.009);
        const u=x-d*drift-d*noise(x*.023+k)*.19, ui=clip(Math.round(u+margin),0,mapSize-1);
        const slope=slopes[ui],grain=noise(u*.15+y*.105)*.026;
        const groove=noise(u*.055+k*18+noise(y*.016)*.35)*.18+noise(u*.019-y*.011+k)*.19;
        const rolling = noise(x*.007+y*.017+k*4+noise(x*.014-y*.009)*1.35);
        const folds = noise(x*.023-y*.09+k*11+rolling*.7)*.2;
        const light=k===0 ? clip(.54-slope*.22+groove*.48+grain) :
          clip(.49+rolling*.25+folds-slope*.1+grain);
        const accent=.16+.29*clip(d/72);
        const mist=clip(d/(baseY-base+32),0,1)*.67;
        for(let ch=0;ch<3;ch++){
          const face=lerp(dark[ch],sun[ch],light);
          data[at++]=lerp(lerp(face,neutral[ch],accent),fog[ch],mist);
        }
        data[at++]=255;
      }
    }
    ctx.putImageData(pixels,0,0);
    return c;
  }
  function rockPlanes(g,lit) {
    const r=rng(2198), palettes=lit
      ? ['#aa99a9','#b6949c','#edc1a4','#f6ddba','#d4afb3','#ae9db0']
      : ['#7f91a4','#8292a1','#a8b8bb','#ccd2ca','#9baab7','#8595a3'];
    // Draw the vertical fractures of the limestone on the back wall as
    // individual planes, breaking them with scree, talus and hanging gullies.
    const faces=[
      [0,[187,674,209,650,214,664,234,688,252,696,266,715,230,698,222,685,215,684,204,671]],
      [1,[266,650,279,660,301,674,313,698,341,722,301,703,288,684,271,677]],
      [0,[309,631,326,639,342,620,347,639,355,650,357,668,371,677,389,706,373,692,350,678,340,663,326,661]],
      [1,[359,620,371,619,379,629,390,644,412,650,428,671,419,669,432,684,409,675,404,665,393,665,382,647]],
      [0,[459,610,479,595,490,607,499,626,519,637,528,649,510,640,516,659,510,655,488,627,484,616,477,617,473,631,463,639,465,625]],
      [1,[467,635,476,624,483,645,492,655,491,662,506,679,496,673,510,695,489,679,478,659]],
      [0,[526,636,539,654,561,658,580,675,572,674,593,699,577,689,563,678,552,676,543,662,538,662]],
      [0,[938,719,973,700,984,706,995,721,977,713,975,716,961,715]],
      [0,[1441,653,1468,661,1487,679,1497,703,1478,687,1465,675,1456,673]],
      [0,[1501,635,1519,642,1535,665,1543,668,1573,702,1559,695,1545,682,1533,680,1517,655,1510,648]],
      [1,[1553,612,1568,618,1591,611,1606,630,1617,641,1634,647,1647,660,1634,658,1641,671,1618,655,1596,630,1588,627,1585,637,1571,627]],
      [0,[1622,642,1654,648,1673,670,1706,675,1719,687,1693,680,1672,676,1651,664]]
    ];
    const snow=[
      [207,652,209,652,205,666,196,668,193,673,190,674,195,662],
      [294,643,310,631,318,635,309,637,301,649,294,652,288,662,290,651],
      [322,646,340,619,353,625,362,622,357,631,348,632,339,646,337,642,329,653,315,657],
      [432,644,454,612,465,608,479,597,472,609,464,614,462,622,453,623,444,637,444,632],
      [435,665,455,633,462,625,454,643,449,646,445,657],
      [493,617,500,628,514,632,510,636,504,634,500,634],
      [1399,684,1438,656,1447,656,1436,664,1432,671,1426,672,1424,675,1413,681],
      [1474,664,1499,637,1507,637,1500,644,1493,645,1492,650,1486,652],
      [1521,638,1551,615,1562,616,1552,621,1546,622,1537,631,1532,631,1529,635],
      [1571,621,1589,613,1592,618,1585,618,1582,623]
    ];
    g.globalAlpha=.8;for(const [index,shape] of faces)polygon(g,shape,palettes[index]);
    g.globalAlpha=.88;for(const shape of snow)polygon(g,shape,palettes[3]);
    // Each outcrop has its own contour, light direction and vein width.
    for(const [cx,cy,extent,fall] of [[340,628,83,68],[475,607,102,74],[551,656,62,49],[1442,659,68,59],[1556,621,122,83]]){
      for(let j=0;j<56;j++){
        const u=r(), x=cx+(r()-.52)*extent*.85+u*extent*.54, y=cy+u*fall+r()*8;
        if(y<ridge(0,x)+3)continue;
        const len=1.5+r()*7,dx=len*(r()-.28);
        g.globalAlpha=.18+r()*.34;stroke(g,[x,y,x+dx*.48,y+len*.15,x+dx,y+len*.65],palettes[r()<.60?0:2],.6+r()*1.25);
      }
    }
    g.globalAlpha=1;
  }
  function forestShoulders(g,k,lit,random) {
    const dark=lit?(k===1?'#81879a':'#597a7d'):(k===1?'#657f89':'#3f626c');
    const mids=lit?(k===1?'#a1a19b':'#809b89'):(k===1?'#8aa19d':'#668b81');
    const warm=lit?(k===1?'#e2bba0':'#d2b59a'):(k===1?'#b7c1b0':'#94aa9e');
    // Thickets draw a "V" around the drainage; each stroke shows tree tips
    // on its upper lip and dissolves into mist on the low side of the spur.
    for(let n=0;n<5200;n++){
      const x=-75+random()*2070, top=ridge(k,x),dep=random()**1.3*108, y=top+dep;
      const contours=noise(.010*x+dep*.029+9*k)+.49*noise(.026*x-.057*dep+noise(x*.008)*1.5);
      const value=contours+.22*noise(.09*x+.06*dep);
      if(value<.27)continue;
      const w=(k===1?.8:1.1)*(1.2+random()*5.5),height=(.7+random()*2.6)*(1+value*.4);
      g.globalAlpha=.16+random()*.24;
      g.beginPath();g.moveTo(x-w,y+.5);g.quadraticCurveTo(x-w*.66,y-height*.72,x-w*.37,y-height*.53);
      g.lineTo(x-.12*w,y-height);g.quadraticCurveTo(x+w*.25,y-height*.85,x+w*.38,y-height*.35);
      g.quadraticCurveTo(x+w*.66,y-height*.44,x+w,y+.28);g.closePath();g.fillStyle=dark;g.fill();
      if(n%3===0)stroke(g,[x-w*.62,y-height*.49,x-w*.13,y-height*.72],mids,.65);
    }
    for(let n=0;n<480;n++){
      const x=random()*2070-75,d=random()*69+4,y=ridge(k,x)+d;
      if(noise(x*.009+d*.049)>-.35)continue;
      const w=4+random()**1.7*32,tilt=(ridge(k,x+12)-ridge(k,x-12))*.016;
      g.globalAlpha=.14+random()*.29;patch(g,x,y,w,.7+random()*2.1,warm,random,tilt-.018);
    }
    g.globalAlpha=1;
  }
  function mountains(g,lit) {
    const random=rng(8236);
    for(let k=0;k<3;k++) {
      const p=(lit?peaksWarm:peaksCool)[k], [base,shade,sun,bottom]=p, baseY=866+k*24;
      g.save(); below(g,x=>ridge(k,x));g.clip();
      g.fillStyle=bottom;g.fillRect(-PAD,564,W+2*PAD,591);
      const wash=rockWash(k,p,baseY);
      g.drawImage(wash,-PAD,564,wash.width*2,wash.height*2);
      if(k===0)rockPlanes(g,lit);else forestShoulders(g,k,lit,random);
      // Intermittent rock ledges and tree lines end in softer fragments downslope.
      for(let j=0;j<120;j++){
        const x=random()*(W+2*PAD)-PAD, y=ridge(k,x)+random()*65;
        const length=4+random()**2*35, slope=(ridge(k,x+8)-ridge(k,x-8))*.037;
        const line=[x,y];
        for(let d=3;d<length;d+=3)line.push(x+d,y+slope*d+noise((x+d)*.097+j)*1.15);
        g.globalAlpha=.09+random()*.13;stroke(g,line,random()<.45?shade:sun,.65+random()*1.25);
      }
      // Flecks aligned with contours retain the grain and mixed pigment of a painted wash.
      for(let j=0;j<3100;j++) {
        const x=random()*(W+2*PAD)-PAD, top=ridge(k,x), v=random()**1.5;
        const y=lerp(top,baseY,v), l=2+random()*15, tilt=(ridge(k,x+8)-ridge(k,x-8))*.012;
        g.globalAlpha=.055+random()*.13;
        stroke(g,[x,y,x+l*.45,y+tilt*l*.25-.4,x+l,y+tilt*l],random()>.49?sun:shade,.5+random()*1.6);
      }
      g.restore();
    }
  }
  const valleyC = ['#66847d','#52746e','#819789','#7d9785','#9da997','#9eafb0','#3e625f','#607e72'];
  const valleyW = ['#9aac85','#668478','#c1bd87','#b3bf83','#dbbb92','#edc4a6','#526e71','#82926f'];
  function fields(g,lit) {
    const random=rng(4936), p=lit?valleyW:valleyC;
    const top=x=>827+23*Math.sin((x-270)/311)+14*Math.sin(x/116+.3)+noise(x*.019)*4-(x/W)*19;
    g.save();below(g,top);g.clip();
    const grad=g.createLinearGradient(0,790,0,1050);grad.addColorStop(0,p[2]);grad.addColorStop(.47,p[0]);grad.addColorStop(1,p[1]);
    g.fillStyle=grad;g.fillRect(-PAD,755,W+PAD*2,400);
    // Brushstroke parcels follow the curves of the valley and converge in the distance.
    for(let i=0;i<1320;i++) {
      const v=random(),x=random()*(W+PAD*2)-PAD,y=top(x)+4+v*225;
      const l=7+(12+v*96)*random(),h=.6+v*3+random()*1.6;
      g.globalAlpha=.22+random()*.5;
      patch(g,x,y,l,h,p[Math.floor(random()*5)],random, .055*Math.sin(x/244+v*2.1) -.03 );
    }
    g.globalAlpha=1;
    // Wooded spurs descend along two tributaries. The canopy breaks into
    // individually tipped spruces as it approaches the spectator.
    const woodDark=lit?'#647e68':'#506d67',woodLight=lit?'#98a36e':'#778e79';
    const groves=[[-45,887,138,14,1.6],[94,872,98,9,1.38],[227,889,89,10,1.25],
      [450,887,115,12,1.34],[593,872,55,5,.9],[780,852,72,5,.76],[1016,837,100,5,.73],
      [1160,818,88,7,.7],[1340,842,119,8,.84],[370,948,98,11,1.64],[-30,954,135,17,1.84]];
    for(const [cx,cy,rx,ry,z] of groves){
      const plants=[];
      for(let j=0;j<rx*2.5;j++){
        const v=random()*2-1, m=Math.sqrt(Math.max(0,1-v*v)),x=cx+v*rx;
        const boundary=.7+noise(x*.045+cx)*.3;
        const y=cy+v*rx*.10+Math.sin(v*2.8)*ry*.74+(random()*2-1)*ry*m*boundary;
        const size=z*(2.1+random()*2.8)*clip((1-v*v)*1.65,.4,1);
        plants.push({x,y,size});
      }
      plants.sort((a,b)=>a.y-b.y);
      g.globalAlpha=.84;
      for(const {x,y,size} of plants){
        const w=size*(.49+random()*.27),topY=y-size, lean=random()*.4;
        polygon(g,[x,y+.4,x-w,y-.4,x-w*.51,y-size*.32,x-w*.69,y-size*.29,x+lean,topY,
          x+w*.6,y-size*.40,x+w*.39,y-size*.44,x+w,y-.32],woodDark);
        g.fillStyle=woodLight;g.fillRect(x-w*.47,y-size*(.43+random()*.28),w*.55,.66);
      }
    }
    // Braided water meanders through the glacial valley, with broken glints of reflected sky.
    const rX=y=>854 - (y-805)*3.15 + 80*Math.sin((y-806)/14.7) + (y-805)*.92*Math.sin((y-788)/29);
    const water=[];for(let y=799;y<1080;y+=2)water.push(rX(y),y);
    for(let y=1079;y>=799;y-=2)water.push(rX(y)+1+(y-799)*.108+1.3*Math.sin(y/14),y);
    g.globalAlpha=.91;polygon(g,water,p[5]);
    for(let i=0;i<390;i++) {
      const y=805+random()*225,x=rX(y)+random()*(1+(y-799)*.108);
      g.globalAlpha=random()*.5;stroke(g,[x,y,x+random()*(2+(y-800)*.08),y],lit?'#ffe6bb':'#c4d0c1',.65);
    }
    // Graduated shrub belts and tree clumps settle parcels into the landscape.
    for(let i=0;i<238;i++) {
      const x=random()*(W+2*PAD)-PAD,v=random(),y=top(x)+v*205;
      const wid=4+random()*42*(.4+v), count=5+random()*22;
      if(Math.abs(x-rX(y))<16) continue;
      for(let j=0;j<count;j++) {
        const xx=x+random()*wid,yy=y+Math.sin((xx-x)/wid*3)*2+(random()-.5)*2.6,d=.45+random()*1.65+v*.9;
        g.globalAlpha=.36+random()*.5;patch(g,xx,yy,d*1.45,d,p[6],random);
        g.globalAlpha=.28;patch(g,xx-.5,yy-.6,d*.85,d*.45,p[7],random);
      }
    }
    g.restore();
  }
  const groundCold = ['#597660','#456451','#365548','#78916b','#99a777','#a6af7d','#314f48','#657f60'];
  const groundGold = ['#81994b','#587a43','#3c6543','#adc35f','#c8d171','#f3d879','#345442','#85a156'];
  function tree(g,x,y,scale,lit,seed) {
    const random=rng(seed);
    const p=lit?['#4f5944','#5f6d44','#768747','#94a453','#b1b85d','#cbbe73']:['#3e5351','#445d52','#536c58','#657f62','#7b8a69','#959b77'];
    const clusters=[];
    g.save();g.translate(x,y);g.scale(scale,scale);
    function branch(bx,by,len,angle,thick,level) {
      const ex=bx+Math.cos(angle)*len, ey=by+Math.sin(angle)*len;
      const midX=(bx+ex)/2+(random()-.5)*len*.3, midY=(by+ey)/2;
      polygon(g,[bx-thick*.52,by,midX-thick*.4,midY,ex-thick*.18,ey,ex+thick*.1,ey,midX+thick*.38,midY,bx+thick*.5,by],p[0]);
      stroke(g,[bx-thick*.33,by,midX-thick*.2,midY,ex,ey],p[3],Math.max(.4,thick*.12));
      if(level<4) {
        branch(ex,ey,len*(.61+random()*.16),angle-.23-random()*.37,thick*.56,level+1);
        branch(ex,ey,len*(.61+random()*.17),angle+.25+random()*.44,thick*.62,level+1);
      }
      if(level>=2)clusters.push([ex,ey,level]);
    }
    branch(0,0,37,-1.72,8,0);
    branch(-4,-24,25,-2.32,4,1);
    clusters.sort((a,b)=>a[1]-b[1]);
    for(const [a,b,lev] of clusters){
      const size=(lev===2?14:8)+random()*6;
      patch(g,a,b,size*1.45,size*.63,p[1],random,-.09);
      patch(g,a-3,b-2,size*1.22,size*.48,p[2+Math.floor(random()*2)],random,-.10);
      for(let j=0;j<26;j++){
        const t=random()*TAU, d=Math.sqrt(random()),xx=a+Math.cos(t)*size*1.47*d,yy=b-2+Math.sin(t)*size*.59*d;
        const c=yy<b-2&&random()>.30?3+Math.floor(random()*3):1+Math.floor(random()*3);
        patch(g,xx,yy,1.2+random()*2.1,.5+random()*.95,p[c],random,-.15);
      }
    }
    g.restore();
  }
  function hillside(g,lit){
    const random=rng(692);const p=lit?groundGold:groundCold;
    g.save();below(g,ground);g.clip();
    const grad=g.createLinearGradient(0,776,0,1080);grad.addColorStop(0,p[4]);grad.addColorStop(.34,p[3]);grad.addColorStop(.76,p[0]);grad.addColorStop(1,p[1]);
    g.fillStyle=grad;g.fillRect(-PAD,740,W+2*PAD,410);
    // Long banks of shade cross the slope; irregular torn ends suggest mown and wild grass.
    for(let i=0;i<1900;i++){
      const x=random()*(W+2*PAD)-PAD,v=random(),y=ground(x)+v*(H+40-ground(x));
      const l=6+random()**2*101, h=.8+random()*6;
      const c=(Math.sin(x/200+y/36)*.55 + Math.cos(y/23-x/330)*.45 > .18) ? [1,2,6,7] : [0,3,4,7];
      g.globalAlpha=.21+random()*.43;patch(g,x,y,l,h,p[c[Math.floor(random()*c.length)]],random,-.11+noise(x/190)*.06);
    }
    // Stippled dry-brush streaks, full-body grass fans and broken strokes of rim light.
    for(let i=0;i<10100;i++) {
      const x=random()*(W+2*PAD)-PAD,v=random(),y=ground(x)+v*(H-ground(x)+27);
      const n=2+v*5+random()*5, bladeColour=p[~~(random()*8)];
      g.globalAlpha=.21+random()*.49;
      for(let j=0;j<2+random()*3;j++){
        const xx=x+(random()-.5)*n*.8,yy=y+(random()-.5)*1.6,b=n*(.35+random()*.85),dx=b*(.19+random()*.88);
        stroke(g,[xx,yy,xx-dx*.28,yy-b*.44,xx-dx,yy-b*.84],bladeColour,.55+random()*.8+v*.35);
      }
    }
    g.restore();
    // Deliberately broken skyline with blade tips, roots fixed into the crest.
    g.globalAlpha=.9;
    for(let i=0;i<3200;i++) {
      const x=random()*(W+2*PAD)-PAD,y=ground(x)+random()*2.2,h=.6+random()**2*5.7;
      polygon(g,[x,y,x-1.1-h*.5,y-h,x+1.3,y-.2],p[random()>.52?3:7]);
    }
    // A wind-shaped copse at the far-left shoulder gives the hill a scale cue.
    tree(g,192,ground(192)+1,.72,lit,210);
    tree(g,232,ground(232)+1,.49,lit,79);
    tree(g,-17,ground(-17)+3,.94,lit,895);
  }
  function plantSeeds() {
    const random=rng(8154);
    for(let i=0;i<1530;i++){
      const x=random()*(W+2*PAD)-PAD,v=random(),y=ground(x)+v*(H+38-ground(x)),z=.31+v*.91;
      tussocks.push({x,y,z,i:~~(random()*8),shape:~~(random()*8),phase:random()*TAU});
    }
    for(let c=0;c<55;c++){
      const cx=random()*W,cy=ground(cx)+10+random()*Math.max(12,1080-ground(cx));
      const kind=random()<.60?'daisy':random()<.65?'flax':'buttercup';
      for(let j=0;j<3+random()*9;j++){
        const x=cx+(random()-.5)*55,y=cy+(random()-.5)*18;
        if(y<ground(x))continue;
        let size=clip((y-ground(x))/160,.09,1.1);
        wildflowers.push({x,y,h:(4+random()*11)*(.4+size),r:(.6+random()*.8)*(.6+size),kind,phase:random()*TAU,tilt:random()*.38});
      }
    }
    wildflowers.sort((a,b)=>a.y-b.y);
    const nearGroups=[[-90,83,0], [138,123,1],[363,129,3],[479,99,1],[760,50,2],[1000,64,2],[1270,74,2],[1540,76,0],[1695,112,1],[1910,162,3]];
    for(const [cx,s,k] of nearGroups) {
      const count = k===2?9:17;
      for(let j=0;j<count;j++){
        const depth=random();
        nearSprays.push({x:cx+(random()-.5)*205,y:1008+depth*135,depth,h:(.75+random()*1.04)*s,phase:random()*TAU,tilt:random()*.50-.03,kind:k,j});
      }
    }
    nearSprays.sort((a,b)=>a.y-b.y);
  }
  const breeze=(x,t,phase,wind)=> (.26 + .52*Math.sin(t*2.15-x*.008+phase*.16) + .22*Math.sin(t*4.18-x*.019+phase))*(.25+.75*wind);
  function drawPlate(g,name,x,light){
    const s=buffers[name];if(!s)return;
    g.drawImage(s.plates[light>.999?1:0],x-PAD,s.y);
    if(light>.001 && light<.999){g.save();g.globalAlpha*=light;g.drawImage(s.plates[1],x-PAD,s.y);g.restore();}
  }
  function flowers(g,t,light,wind,step=1) {
    const heads=[new Path2D(),new Path2D(),new Path2D()], tips=[new Path2D(),new Path2D(),new Path2D()],stems=new Path2D();
    for(let i=0;i<wildflowers.length;i+=step){
      const a=wildflowers[i], sway=breeze(a.x,t,a.phase,wind);
      const tipX=a.x-a.h*(.2+a.tilt+.32*sway), tipY=a.y-a.h*(.92-.1*sway);
      stems.moveTo(a.x,a.y);stems.quadraticCurveTo(a.x-.3*a.h,a.y-a.h*.78,tipX,tipY);
      const j=a.kind==='daisy'?0:a.kind==='flax'?1:2,p=heads[j],q=tips[j];
      for(let k=0;k<10;k++){
        const angle=TAU*k/10+a.phase,r=k%2?.67*a.r:1.4*a.r;
        const xx=tipX+Math.cos(angle)*r,yy=tipY+Math.sin(angle)*r*.63;
        if(k===0)p.moveTo(xx,yy);else p.lineTo(xx,yy);
      }
      p.closePath();
      q.moveTo(tipX+a.r*.38,tipY);q.arc(tipX,tipY,a.r*.38,0,TAU);
    }
    g.strokeStyle=tone('#717f60','#8c9c53',light);g.lineWidth=.8;g.stroke(stems);
    const cool=['#ced1ba','#a3acc2','#b2a76f'],warm=['#fff4cf','#b5bdde','#f6d25b'];
    for(let j=0;j<3;j++){g.fillStyle=tone(cool[j],warm[j],light);g.fill(heads[j]);g.fillStyle=tone('#af9961','#e0b53c',light);g.fill(tips[j]);}
  }
  // Stamp the small clumps from an in-memory set of wind poses. This keeps
  // thousands of moving blades from re-tessellating on every frame.
  function makeGrassesAtlas(lit){
    const tileW=40,tileH=23,c=document.createElement('canvas');
    c.width=8*11*tileW;c.height=8*tileH;
    const g=c.getContext('2d'),colors=lit?groundGold:groundCold;
    for(let colour=0;colour<8;colour++){
      g.fillStyle=colors[colour];
      for(let shape=0;shape<8;shape++){
        const r=rng(7901+shape*523), blades=Array.from({length:4+shape%4},()=>{
          const h=4+r()**1.2*12;
          return [(r()-.48)*7,h,(.23+r()*.74)*h,.6+r()*.88];
        });
        for(let state=0;state<11;state++){
          const sway=state/10*2-1, cx=(shape*11+state)*tileW+28,cy=colour*tileH+21;
          g.beginPath();
          for(const [offset,h,lean,width] of blades){
            const x=cx+offset,dy=h*(.92-.062*sway),dx=lean+h*(.12+.45*sway);
            g.moveTo(x-width*.55,cy);g.quadraticCurveTo(x-dx*.35,cy-dy*.7,x-dx,cy-dy);
            g.quadraticCurveTo(x-dx*.22,cy-dy*.59,x+width*.78,cy);g.closePath();
          }
          g.fill();
        }
      }
    }
    return c;
  }
  function grasses(g,t,light,wind) {
    const n=Math.round(light*32);
    let sheet=n===32?grassesAtlas.warm:grassesAtlas.cool;
    if(n>0 && n<32){
      sheet=grassesAtlas.blend;
      if(grassesAtlas.grade!==n){
        const b=sheet.getContext('2d'); b.clearRect(0,0,sheet.width,sheet.height);
        b.globalAlpha=1;b.drawImage(grassesAtlas.cool,0,0);b.globalAlpha=n/32;b.drawImage(grassesAtlas.warm,0,0);b.globalAlpha=1;
        grassesAtlas.grade=n;
      }
    }
    for(const a of tussocks){
      const gust=clip(breeze(a.x,t,a.phase,wind),-1,1), state=Math.round((gust+1)*5);
      g.drawImage(sheet,(a.shape*11+state)*40,a.i*23,40,23,a.x-28*a.z,a.y-21*a.z,40*a.z,23*a.z);
    }
  }
  function floaters(g,t,light,wind){
    const rnd=rng(9344),lo='#aab394',hi='#f8e6a7';
    for(let i=0;i<37;i++) {
      const speed=8+rnd()*20, phase=rnd()*TAU, start=rnd()*(W+160);
      const x=-80+((start-t*speed*(.78+wind*.24)+2*(W+160))%(W+160));
      const y=690+rnd()*433+Math.sin(t*.73+phase)*9+Math.sin(t*1.31+phase)*3;
      const a=.18+.46*Math.sin(t*.61+phase)**2;
      g.globalAlpha=a*(.43+.55*light);g.fillStyle=tone(lo,hi,light);g.beginPath();
      g.ellipse(x,y,.7+rnd()*1.4,.4+rnd()*.6,t*.42+phase,0,TAU);g.fill();
    }
    g.globalAlpha=1;
  }
  let hillEdge;
  function travellingShade(g,t,light){
    const lift=clip((t-25)/19);
    if(!hillEdge){
      hillEdge=new Path2D();hillEdge.moveTo(-PAD,H+40);
      for(let x=-PAD;x<=W+PAD;x+=4)hillEdge.lineTo(x,ground(x)+.55);
      hillEdge.lineTo(W+PAD,H+40);hillEdge.closePath();
    }
    // The cloud shadow crosses only the near slope. Its soft, angled edge
    // reveals local grass colour a little earlier at the top of the hill.
    g.save();g.clip(hillEdge);
    const x=526+37*Math.sin(t*.14)+t*5+lift*1800;
    const shade=g.createLinearGradient(x-740,970,x+400,1180);
    shade.addColorStop(0,'rgba(44,64,79,0)');
    shade.addColorStop(.33,'rgba(47,65,77,'+(.066+light*.067)+')');
    shade.addColorStop(.65,'rgba(55,66,74,'+(.116+light*.125)+')');
    shade.addColorStop(.87,'rgba(53,69,79,'+(.060+light*.041)+')');
    shade.addColorStop(1,'rgba(53,69,79,0)');
    g.fillStyle=shade;g.fillRect(-PAD,725,W+2*PAD,H-725+40);
    g.restore();
  }
  function draw(g,{t=0,light=0,wind=.45,pan=0,nearCamera=false}={}) {
    if(!loaded)return;light=clip(light);wind=clip(wind);
    g.save();
    // In the closer layout, the valley recedes behind the planted feet.
    g.save();
    if(nearCamera){g.translate(1392,807);g.scale(.58,.58);g.translate(-1160,-807)}
    drawPlate(g,'peaks',pan*13,light);drawPlate(g,'fields',pan*7,light);
    g.restore();drawPlate(g,'hill',0,light);
    grasses(g,t,light,wind);flowers(g,t,light,wind);travellingShade(g,t,light);g.restore();
  }
  function front(g,{t=0,light=0,wind=.5}={}) {
    if(!loaded)return;
    g.save();renderHerbs(g,herbs.wide,t,clip(wind),clip(light));floaters(g,t,clip(light),clip(wind));g.restore();
  }
  function leaf(g,x,y,endX,endY,thickness,upper,lower) {
    const dx=endX-x,dy=endY-y;
    g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+dx*.42+thickness,y+dy*.53,endX,endY);
    g.quadraticCurveTo(x+dx*.36-thickness*.68,y+dy*.59,x,y);g.fillStyle=lower;g.fill();
    g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+dx*.42+thickness,y+dy*.53,endX,endY);
    g.quadraticCurveTo(x+dx*.4+thickness*.13,y+dy*.57,x,y);g.fillStyle=upper;g.fill();
  }
  function daisy(g,x,y,scale,angle) {
    g.save();g.translate(x,y);g.rotate(angle);g.scale(scale,scale*.81);
    for(let k=0;k<12;k++){
      const a=k*TAU/12+.06*Math.sin(k*1.7),l=13+2.4*Math.sin(k*2+.3);
      g.save();g.rotate(a);g.fillStyle=k<6?'#f7eab7':'#fff4ca';
      g.beginPath();g.moveTo(1,-1);g.bezierCurveTo(3,-4.25,l-2,-4.3,l,-1.25);
      g.quadraticCurveTo(l+1,0,l-.8,1.4);g.bezierCurveTo(l-3,4.3,4,3.3,1,1.2);g.fill();
      g.beginPath();g.moveTo(4,-.15);g.quadraticCurveTo(8,-.65,l-1.8,-.4);
      g.strokeStyle='#d2c399';g.lineWidth=.47;g.stroke();g.restore();
    }
    g.fillStyle='#b9933d';g.beginPath();g.ellipse(0,.7,5.15,4.3,.08,0,TAU);g.fill();
    g.fillStyle='#f4cc5b';g.beginPath();g.ellipse(-.6,-.35,4.7,3.5,.08,0,TAU);g.fill();
    for(let k=0;k<15;k++){const a=k*2.4,r=3.8*Math.sqrt(k/15);g.fillStyle=k%3===0?'#bea348':'#ffe896';g.fillRect(Math.cos(a)*r,Math.sin(a)*r*.7,.75,.65);}
    g.restore();
  }
  function renderSpray(g,a,t,wind){
    const sway=breeze(a.x,t,a.phase,wind),h=a.h, bend=h*(a.tilt+.17+sway*.26), ex=a.x-bend, ey=a.y-h*(.94-.055*sway);
    const shade=a.depth>.58?'#475f3c':'#72854d', high=a.depth>.58?'#8b994d':'#bac668', gold='#ded27a';
    const root=a.x,y=a.y;
    g.strokeStyle=shade;g.lineWidth=.9+h*.014;g.beginPath();g.moveTo(root,y);
    g.quadraticCurveTo(root-bend*.21,y-h*.50,ex,ey);g.stroke();
    g.lineWidth=.48+h*.004;g.strokeStyle=gold;g.beginPath();g.moveTo(root-1,y);g.quadraticCurveTo(root-bend*.21-1,y-h*.50,ex-.6,ey);g.stroke();
    for(let k=0;k<3;k++){
      const at=.19+k*.15,baseX=root-bend*at*at,baseY=y+(ey-y)*at,side=(k%2?1:-1),len=h*(.23-k*.017);
      leaf(g,baseX,baseY,baseX+side*len*.57-bend*.2,baseY-len,1.2+len*.08,high,shade);
    }
    if(a.kind===3 && a.j%3===0 || a.kind===1 && a.j%5===0) {
      daisy(g,ex,ey,h*.0062,-.18+Math.sin(a.phase+t)*.07);
    } else if((a.j+a.kind)%4===1) {
      // Oat panicles catch a thin fringe of sunrise.
      for(let k=0;k<8;k++){
        const u=k/8,by=ey+u*h*.16,bx=ex+u*bend*.23,side=k%2?1:-1;
        leaf(g,bx,by,bx+side*(2+u*7)-h*.024,by-h*(.03+u*.025),1.0+u, gold,'#a69355');
      }
    } else {
      leaf(g,root,y,ex,ey,h*.032,high,shade);
    }
  }
  const flowerStamps=new Map(), herbs={near:[],wide:[]};
  function flowerStamp(kind,variation,lit){
    // Botanical details are inked once at native size. Living stems carry
    // these corollas through the breeze and rotate separately at the calyx.
    const key=kind+variation+lit;
    if(flowerStamps.has(key))return flowerStamps.get(key);
    const c=document.createElement('canvas');c.width=168;c.height=102;
    const g=c.getContext('2d'),r=rng(1379+variation*1187),cream=lit?'#fff4cf':'#dee0ce',
      half=lit?'#e4d2a0':'#b6c1ae', underside=lit?'#aa9d75':'#889887',
      stem=lit?'#73804c':'#607565',dark=lit?'#555c46':'#495951';
    g.translate(84,86);g.lineCap='round';g.lineJoin='round';
    if(kind==='yarrow'){
      const umbels=[];
      // A flat-topped corymb, with fine branchlets and unequal umbels.
      const branches=8+variation%3;
      for(let b=0;b<branches;b++){
        const u=b/(branches-1),offset=(u-.5)*100+(r()-.5)*11, up=-28-13*Math.sin(u*Math.PI)-r()*8;
        const start=-r()*11, bx=offset*.36,by=up*.62;
        g.strokeStyle=dark;g.lineWidth=1.25;
        g.beginPath();g.moveTo(0,2);g.quadraticCurveTo(bx*.6,start+2,bx,by);
        g.quadraticCurveTo(offset*.76,up*.71,offset,up);g.stroke();
        for(let j=0;j<5;j++){
          const v=(j-2)/2, x=offset+v*(4+r()*5),y=up-3-r()*6;
          stroke(g,[offset*.89,up+8,offset+(x-offset)*.4,up+1,x,y],stem,.72);
          umbels.push({x,y,size:1.8+r()*1.5});
        }
      }
      umbels.sort((a,b)=>a.y-b.y);
      for(const {x,y,size} of umbels){
        g.fillStyle=underside;g.beginPath();g.ellipse(x,y+1.1,size*1.43,size*.83,0,0,TAU);g.fill();
        for(let j=0;j<5;j++){
          const a=j*TAU/5+.17,dx=size*.67*Math.cos(a),dy=size*.42*Math.sin(a);
          g.fillStyle=(x>23&&j%3===0)?half:cream;g.beginPath();g.ellipse(x+dx,y+dy,size*.64,size*.50,a,0,TAU);g.fill();
        }
        g.fillStyle=lit?'#d7b75d':'#a8a271';g.fillRect(x-.6,y-.3,1.2,.9);
      }
    }else if(kind==='cornflower'){
      const tilt=(variation-1.6)*.07;g.rotate(tilt);
      // Overlapping blue-violet funnel florets with their characteristic torn tips.
      g.fillStyle=dark;g.beginPath();g.moveTo(-7,-3);g.bezierCurveTo(-10,-9,-9,-15,-7,-18);
      g.quadraticCurveTo(2,-22,9,-16);g.quadraticCurveTo(11,-6,2,0);g.closePath();g.fill();
      const sc=lit?['#423e64','#535289','#7977bc','#9394d3','#adb4e3']:['#4f5671','#697596','#8394b1','#9caac1','#b4c0d0'];
      for(let j=0;j<12;j++){
        const a=(-166+j*14.0+(r()-.5)*11)*Math.PI/180;
        const len=15+r()*10,bx=Math.cos(a)*6,by=-13+Math.sin(a)*2;
        g.save();g.translate(bx,by);g.rotate(a);
        const f=[0,0,len*.55,-1.2,len-1,-4.1,len*.82,-1.3,len+1,-1.9,len*.91,.35,len,2.7,len*.70,1.5,len*.53,2.2];
        polygon(g,f,sc[1+j%3]);stroke(g,[len*.33,.3,len*.67,-.6,len*.87,-1.1],sc[4],.55);g.restore();
      }
      for(let j=0;j<10;j++){const x=(r()-.5)*16,y=-17-r()*8;stroke(g,[x*.6,-13,x,y,x+.75,y-1],sc[0],1.05);}
      for(let j=0;j<6;j++){const x=-6+j*2.3;stroke(g,[x*.65,-2,x,-9,x-1,-12],stem,.65);}
    }else if(kind==='daisy'){
      g.rotate((variation-1)*.10);g.translate(0,-8);g.scale(1.15,.90);
      // Two layers of individually folded ray petals, with exposed pencil veins.
      for(let pass=0;pass<2;pass++){
        const count=pass?12:9;
        for(let j=0;j<count;j++){
          const a=j*TAU/count+r()*.1+pass*.12,l=15+r()*7,ww=2.3+r()*1.35;
          g.save();g.rotate(a);g.fillStyle=pass?(j%3===0?half:cream):underside;
          g.beginPath();g.moveTo(.4,-.85);g.bezierCurveTo(l*.33,-ww*.75,l*.77,-ww*1.12,l-.7,-ww*.56);
          g.quadraticCurveTo(l+1,-.4,l,.45);g.quadraticCurveTo(l+1.6,1.65,l-1.3,ww*.63);
          g.bezierCurveTo(l*.58,ww*.87,l*.34,ww*.53,.4,1);g.closePath();g.fill();
          if(pass){stroke(g,[3,.05,l*.6,-.65,l*.88,-.55],half,.43);}
          g.restore();
        }
      }
      g.fillStyle=lit?'#b58d3c':'#8e9168';g.beginPath();g.ellipse(0,0,5.8,4.8,-.2,0,TAU);g.fill();
      g.fillStyle=lit?'#eac257':'#b2ad77';g.beginPath();g.ellipse(-.8,-.85,5,3.4,-.2,0,TAU);g.fill();
      for(let j=0;j<24;j++){const a=j*2.40,d=Math.sqrt(j/24)*4.7;g.fillStyle=j%3===0?underside:cream;g.fillRect(Math.cos(a)*d,Math.sin(a)*d*.70,.70,.60);}
    }else{
      const n=9+variation;
      for(let j=0;j<n;j++){
        const u=j/n,side=j%2?-1:1,x=side*(3+9*Math.sin(Math.PI*u)),y=-11-u*36;
        stroke(g,[0,-2,x*.19,y+9,x,y],stem,.86);
        g.save();g.translate(x,y);g.rotate(-.28+side*.32);
        g.fillStyle=lit?'#bc9868':'#849182';g.beginPath();g.ellipse(0,0,1.7,4.5,0,0,TAU);g.fill();
        stroke(g,[0,-4,0,-7],half,.62);g.restore();
      }
    }
    flowerStamps.set(key,c);return c;
  }
  function plantHerbs() {
    const r=rng(79037);
    // A few clear groups surrounded by breathing room read as a real plant community.
    const near=[
      [-15,1148,355,'yarrow',6,125], [211,1139,268,'daisy',7,124],
      [478,1118,155,'cornflower',8,137],[780,1124,154,'oat',4,110],
      [1075,1124,104,'daisy',4,82],[1390,1115,157,'cornflower',5,100],
      [1622,1154,253,'yarrow',5,117],[1877,1133,319,'daisy',6,165]
    ];
    const wide=[
      [-22,1096,88,'yarrow',4,60],[149,1092,64,'daisy',4,43],
      [362,1090,49,'cornflower',5,49],[711,1091,40,'oat',3,38],
      [1060,1090,48,'daisy',4,57],[1583,1096,65,'cornflower',4,46],[1870,1094,97,'yarrow',5,66]
    ];
    for(const [rows,out] of [[near,herbs.near],[wide,herbs.wide]]){
      for(const [cx,cy,h,kind,count,spread] of rows){
        for(let i=0;i<count;i++){
          const u=(i+r()*.65)/count-.5,x=cx+u*spread,y=cy+(r()-.5)*24;
          out.push({x,y,h:h*(.61+r()*.44)*(1.06-.42*Math.abs(u)),kind,phase:r()*TAU,
            tilt:(r()-.45)*.53+u*.39,variation:i%4,branch:kind!=='oat'&&i%3!==1,
            depth:r(),scale:(kind==='yarrow'?.49:kind==='daisy'?.81:.78)*(.83+r()*.28)});
        }
      }
      out.sort((a,b)=>a.y-b.y);
    }
    for(const kind of ['daisy','yarrow','cornflower','oat']){
      for(let n=0;n<4;n++)for(const lit of [0,1])flowerStamp(kind,n,lit);
    }
  }
  function herbLeaves(g,x,y,size,dir,kind,shade,sun){
    if(kind==='yarrow'){
      // The feather leaf is bipinnate, with a slender central rachis.
      const dx=dir*size*.83,dy=-size*.57;
      stroke(g,[x,y,x+dx*.52,y+dy*.64,x+dx,y+dy],shade,Math.max(.48,size*.028));
      g.fillStyle=sun;g.beginPath();
      for(let j=1;j<10;j++){
        const u=j/10,px=x+dx*u,py=y+dy*(.78*u+.22*Math.sin(u*1.57)),l=size*.16*Math.sin(Math.PI*u);
        g.moveTo(px,py);g.quadraticCurveTo(px-dir*l*.16,py-l*.71,px+dir*l*.17,py-l);
        g.quadraticCurveTo(px+dir*l*.04,py-l*.25,px+dir*.65,py+.1);
        g.moveTo(px,py);g.quadraticCurveTo(px+dir*l*.66,py+l*.35,px+dir*l*.93,py+l*.18);
        g.lineTo(px+dir*l*.16,py+.6);
      }
      g.fill();
    }else{
      const dx=dir*size*.57,dy=-size;
      leaf(g,x,y,x+dx,y+dy,Math.max(.8,size*(kind==='daisy'?.12:.073)),sun,shade);
      if(size>13)stroke(g,[x,y,x+dx*.39,y+dy*.44,x+dx*.86,y+dy*.89],shade,Math.max(.45,size*.012));
    }
  }
  function renderHerbs(g,plants,t,wind,light){
    const shade=tone('#354f50','#3f614b',light), stem=tone('#526b59','#688249',light),
      rim=tone('#899a7c','#c4bd77',light),leafSun=tone('#768d71','#a6b164',light);
    for(const a of plants){
      const gust=breeze(a.x,t,a.phase,wind),h=a.h,bend=h*(a.tilt-.11-.20*gust),y=a.y,x=a.x;
      const anchor=u=>[x+bend*u*u,y-h*(.65*u+.35*u*u)];
      const [ex,ey]=anchor(1),sw=Math.max(.72,h*.0105);
      g.lineJoin='round';g.lineCap='round';
      g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x,y-h*.346,ex,ey);g.strokeStyle=shade;g.lineWidth=sw;g.stroke();
      stroke(g,[x-sw*.3,y,x+bend*.25-sw*.3,y-h*.42,ex-sw*.22,ey],rim,sw*.27);
      for(let j=0;j<3;j++){
        const u=.18+j*.17, [lx,ly]=anchor(u),dir=j%2?1:-1, size=h*(.16-j*.019);
        herbLeaves(g,lx,ly,size,dir,a.kind,shade,leafSun);
      }
      const headScale=clip(h/190,.16,1.94)*a.scale,angle=a.tilt*.47+.11*gust+.035*Math.sin(t*1.3+a.phase);
      function crown(xx,yy,scale,stampVariant,rot){
        g.save();g.translate(xx,yy);g.rotate(rot);g.scale(scale,scale);
        const n=light>=.999?1:0;g.drawImage(flowerStamp(a.kind,stampVariant,n),-84,-86);
        if(light>.001&&light<.999){g.globalAlpha=light;g.drawImage(flowerStamp(a.kind,stampVariant,1),-84,-86);g.globalAlpha=1;}
        g.restore();
      }
      if(a.branch){
        const u=.54,[bx,by]=anchor(u),dir=a.variation%2===0?1:-1,bx2=bx+dir*h*.128+bend*.17,by2=by-h*.201;
        g.beginPath();g.moveTo(bx,by);g.quadraticCurveTo(bx+dir*h*.095,by-h*.05,bx2,by2);g.strokeStyle=stem;g.lineWidth=sw*.54;g.stroke();
        crown(bx2,by2,headScale*.57,(a.variation+1)%4,angle+dir*.19);
      }
      crown(ex,ey,headScale,a.variation,angle);
    }
  }
  // A low view from the flowers. All positions, even after takeoff, can be
  // reconstructed from film time so a backwards scrub returns to the same pose.
  const lifePaint={};
  function paintedStudy(name,w,h,paint) {
    if(!lifePaint[name]){
      const sheet=document.createElement('canvas');sheet.width=w*2;sheet.height=h*2;
      const g=sheet.getContext('2d');g.scale(2,2);paint(g);lifePaint[name]=sheet;
    }
    return lifePaint[name];
  }
  function brushCurve(g,points,colour,width) {
    g.beginPath();g.moveTo(points[0],points[1]);
    g.bezierCurveTo(...points.slice(2));g.strokeStyle=colour;g.lineWidth=width;g.stroke();
  }
  function yarrowHead(g,x,y,size,angle) {
    const sheet=paintedStudy('umbel',142,113,c=>{
      c.translate(71,107);
      const r=rng(3644), tips=[];
      // Branching corymbs split at staggered heights. Each floret sits on
      // its own stalk, with a small irregular group at each branch tip.
      for(const [bx,by,bend,count] of [[-49,-64,-14,5],[-28,-75,-7,6],[-7,-87,3,6],[22,-80,12,6],[48,-66,13,5]]){
        const startX=bend*.23,startY=-9-r()*17;
        brushCurve(c,[0,1,startX,-19,bx*.49,by+37,bx,by+12],'#667954',1.73);
        brushCurve(c,[-.6,1,startX-.4,-19,bx*.48,by+36,bx-.5,by+12],'#aeb17a',.59);
        for(let j=0;j<count;j++){
          const a=(j/(count-1)-.5)*22+(r()-.5)*4,xx=bx+a,yy=by+Math.abs(a)*.31-r()*5;
          brushCurve(c,[bx,by+13,bx+a*.33,by+7,xx,yy+1,xx,yy],'#858654',.83);
          for(let k=0;k<4;k++)tips.push([xx+(r()-.5)*5,yy-r()*3.1,1.15+r()*1.24]);
        }
      }
      tips.sort((a,b)=>a[1]-b[1]);
      for(const [px,py,size] of tips){
        c.fillStyle='#95905c';c.beginPath();c.ellipse(px+.4,py+1.9,size*1.05,size*.83,0,0,TAU);c.fill();
        for(let j=0;j<5;j++){
          const a=j*TAU/5+px*.13;
          c.fillStyle=['#ffedbc','#f4dca8','#e9cd9d','#fbe4b1','#fff0c5'][j];
          c.beginPath();c.ellipse(px+Math.cos(a)*size*.76,py+Math.sin(a)*size*.53,size*.71,size*.52,a*.32,0,TAU);c.fill();
        }
        c.fillStyle='#bc9359';c.fillRect(px-.4,py-.35,1.08,.83);
      }
    });
    g.save();g.translate(x,y);g.rotate(angle);g.scale(size,size);g.drawImage(sheet,-71,-107,142,113);g.restore();
  }
  function butterflyWing(fore) {
    return paintedStudy(fore?'forewing':'hindwing',116,108,g=>{
      g.translate(64,99);
      const outline=fore?'M0 -2 C5 -19 12 -52 14 -78 Q14.8 -85 14 -88 Q7 -80 -1 -77 Q-13 -73 -20 -66 Q-31 -56 -34 -43 Q-35 -39 -32 -35 Q-34 -31 -27 -28 Q-27 -23 -21 -22 Q-21 -18 -14 -15 Q-10 -7 0 -2Z':'M1 -4 C-7 -31 -22 -51 -43 -63 Q-44 -56 -46 -52 Q-51 -48 -49 -43 Q-54 -39 -51 -35 Q-54 -30 -49 -27 Q-49 -22 -46 -21 Q-39 -14 -34 -14 Q-31 -10 -24 -11 Q-10 -4 1 -4Z';
      const p=new Path2D(outline);
      const wash=g.createLinearGradient(-39,-82,14,-2);
      wash.addColorStop(0,fore?'#eedb84':'#f1dd8d');wash.addColorStop(.32,'#ebdd91');
      wash.addColorStop(.63,fore?'#e2d992':'#d5cd83');wash.addColorStop(1,'#a1a468');
      g.fillStyle=wash;g.fill(p);g.save();g.clip(p);
      const random=rng(fore?67:122);
      for(let i=0;i<2600;i++){
        const x=-56+random()*104,y=-95+random()*95,rr=.18+random()*.52;
        g.fillStyle=i%3?'rgba(116,114,66,.24)':'rgba(255,244,172,.62)';
        g.fillRect(x,y,rr,rr*(.5+random()));
      }
      const veins=fore?[
        [1,-5,4,-26,10,-62,14,-86],[1,-8,-1,-31,-1,-55,-4,-74],
        [1,-9,-4,-33,-9,-49,-17,-65],[-2,-14,-7,-28,-15,-43,-27,-53],
        [-1,-9,-10,-25,-19,-34,-33,-41],[-1,-7,-9,-17,-20,-23,-27,-29],
        [-3,-34,-7,-39,-10,-40,-15,-42]
      ]:[
        [1,-4,-12,-18,-25,-36,-43,-61],[0,-5,-16,-17,-34,-33,-49,-42],
        [-2,-6,-16,-17,-32,-23,-50,-30],[-2,-5,-19,-12,-33,-17,-43,-18],
        [-18,-26,-20,-35,-30,-42,-35,-51],[-24,-27,-30,-29,-41,-37,-47,-37]
      ];
      g.lineCap='round';
      for(const v of veins){
        brushCurve(g,v,'rgba(113,119,70,.53)',.79);
        g.save();g.translate(-.35,-.53);brushCurve(g,v,'rgba(255,239,169,.78)',.53);g.restore();
      }
      const dotX=fore?-7:-22,dotY=fore?-46:-32;
      g.fillStyle='#b99350';g.beginPath();g.ellipse(dotX,dotY,fore?1.9:2.8,fore?2.8:2.25,-.38,0,TAU);g.fill();
      g.fillStyle='#dfb86d';g.beginPath();g.ellipse(dotX+.15,dotY,1.35,1.32,-.48,0,TAU);g.fill();
      g.restore();g.lineWidth=.95;g.strokeStyle=fore?'#a99c60':'#9b9a62';g.stroke(p);
      if(fore)brushCurve(g,[1,-7,7,-27,13,-68,14,-87],'#fff0ad',1.38);
    });
  }
  function brimstone(g,x,y,scale,t,flight) {
    g.save();g.translate(x,y);g.scale(scale,scale);g.rotate(-.19-.18*flight);
    const takeoff=47.55+5.45*.55;
    const wingBeat=t*2.5+Math.max(0,t-takeoff)*25;
    const fold=flight>0?.17+.82*Math.sin(wingBeat):.85+.10*Math.sin(wingBeat);
    const far=.84+.10*Math.sin(wingBeat-.14)-flight*.67;
    function wing(fore,spread,rear){
      g.save();g.translate(rear?2:0,rear?-3:-1);
      g.transform(spread,rear?-.12:-.08,rear?.007:-.042,.70+.26*Math.abs(spread),0,0);
      g.drawImage(butterflyWing(fore),-64,-99,116,108);
      g.restore();
    }
    wing(true,far,true);wing(false,fold,false);wing(true,fold,false);
    g.lineCap='round';
    // Stepped abdomen, shaggy thorax and a hooked pair of antennae.
    const body=g.createLinearGradient(0,-7,0,5);body.addColorStop(0,'#d3c789');body.addColorStop(.42,'#897d52');body.addColorStop(1,'#625e47');
    g.fillStyle=body;g.beginPath();g.moveTo(-26,-3);g.bezierCurveTo(-16,-6,-6,-8,5,-6);g.bezierCurveTo(14,-7,15,0,1,1);g.quadraticCurveTo(-19,1,-26,-3);g.fill();
    for(let i=0;i<6;i++)brushCurve(g,[-22+i*3,-4.4,-21+i*3,-3.2,-21+i*3,-2,-21+i*3,-1.5],'rgba(228,212,157,.64)',.53);
    g.fillStyle='#7c7753';g.beginPath();g.ellipse(6,-5,7.5,5.1,-.18,0,TAU);g.fill();
    const fuzz=rng(492);
    for(let i=0;i<52;i++){
      const xx=fuzz()*13-1,yy=-8-fuzz()*2.2;
      stroke(g,[xx,yy+2.4,xx-1.7-fuzz()*1.5,yy+.7,xx-2.2,yy-.35],i%3?'#c9c491':'#ede3b2',.50);
    }
    g.fillStyle='#77765d';g.beginPath();g.ellipse(14,-6.3,4.5,3.8,-.22,0,TAU);g.fill();
    g.fillStyle='#424b41';g.beginPath();g.arc(15,-6.3,2.0,0,TAU);g.fill();
    g.fillStyle='#f7e6b2';g.fillRect(14.2,-7.45,.92,.71);
    for(const [dx,dy] of [[0,0],[-3,1.6]]){
      brushCurve(g,[15+dx,-8.3,21+dx,-16+dy,26+dx,-21+dy,29+dx,-22+dy],'#716b4e',.81);
      brushCurve(g,[27.4+dx,-20.4+dy,28+dx,-21+dy,29+dx,-23.8+dy,30+dx,-23.6+dy],'#8f8055',1.18);
    }
    for(const [ox,reach,depth] of [[5,18,6],[2,8,9],[-1,-13,7]]){
      const tuck=1-flight*.65;
      stroke(g,[ox,-1,ox+reach*.50,depth*1.32*tuck,ox+reach*.86,depth*.86*tuck,ox+reach+2,depth*.92*tuck],'#7d7553',.86);
    }
    if(flight<.35){
      brushCurve(g,[15,-3.5,20,0,19,3,18,5.1],'#8e7956',.67);
    }
    g.restore();
  }
  function dew(g,x,y,r) {
    g.save();g.translate(x,y);g.scale(r,r);
    const body=g.createLinearGradient(0,-1,0,1.1);
    body.addColorStop(0,'rgba(184,192,136,.74)');body.addColorStop(.35,'rgba(101,125,109,.84)');
    body.addColorStop(.54,'rgba(126,143,111,.88)');body.addColorStop(.64,'rgba(249,213,144,.92)');body.addColorStop(1,'rgba(246,238,180,.92)');
    const p=new Path2D('M0 -1.44 C.12 -.94 .95 -.51 .98 .12 C1 .75 .48 1.04 -.02 1.02 C-.62 1.02 -.98 .62 -.93 .10 C-.88 -.56 -.18 -.97 0 -1.44Z');
    g.fillStyle=body;g.fill(p);g.lineWidth=.09;g.strokeStyle='rgba(109,137,115,.8)';g.stroke(p);
    g.fillStyle='#fff8ce';g.beginPath();g.ellipse(-.41,-.35,.14,.28,.49,0,TAU);g.fill();
    g.fillStyle='#ffefbf';g.beginPath();g.ellipse(.29,.82,.29,.065,-.30,0,TAU);g.fill();g.restore();
  }

  function meadowLife(g,{t,wind},progress){
    const shift=progress*134,sway=8*Math.sin(t*2.12)+4*Math.sin(t*3.60);
    const baseX=617-shift,tipX=baseX-42+sway,tipY=748+sway*.16;
    g.save();g.lineCap='round';g.lineJoin='round';
    // Lower stalks overlap the hero stem at its base and catch reflected green light.
    for(const [offset,h,spread] of [[-202,948,.61],[-162,1010,.47],[89,988,.62]]){
      const x=baseX+offset,dx=-43+sway*.57;
      brushCurve(g,[x+19,1103,x+10,1064,x+dx+18,h+57,x+dx,h],'#7c8d5c',2.3);
      yarrowHead(g,x+dx,h,spread,-.13+sway*.0021);
    }
    brushCurve(g,[baseX+43,1102,baseX+47,1023,tipX+9,902,tipX,tipY],'#5e714d',4.6);
    brushCurve(g,[baseX+41.5,1102,baseX+43,1019,tipX+7,900,tipX-.65,tipY],'#c0bf80',1.38);
    for(const [h,side,reach] of [[.19,-1,72],[.36,1,90],[.6,-1,85],[.77,1,49]]){
      const x=lerp(baseX+38,tipX,h),y=lerp(1093,tipY,h);
      herbLeaves(g,x,y,reach,side,'yarrow','#72845a','#a7b175');
    }
    brushCurve(g,[baseX+8,940,baseX-46,887,tipX-94,858,tipX-117,812],'#7f8a5a',2.5);
    yarrowHead(g,tipX-117,812,.63,.14+sway*.003);
    yarrowHead(g,tipX,tipY,1.45,-.061+sway*.0013);
    const release=clip((progress-.55)/.43);
    const fly=release*release;
    const rest=1-clip(release*11);
    const px=tipX-13+sway*.10+fly*1122+Math.sin(release*13)*47*release;
    const py=tipY-136+sway*.085-fly*525-release*122-30*release*Math.sin(release*16);
    brimstone(g,px,py,1.42-1.15*release,t,1-rest);
    // A flexible blade carries its droplets. Highlights stay on the sunward rim.
    const ax=baseX-113,bx=ax-108+sway*1.5,by=937-5*Math.sin(t*1.4);
    leaf(g,ax+15,1111,bx,by,18,'#91a364','#6b8358');
    brushCurve(g,[ax+13,1110,ax+4,1059,bx+27,974,bx,by],'#c7c682',1.15);
    dew(g,bx+1,by+4.4,3.0);dew(g,bx+43,by+68,2.35);
    g.restore();
  }

  // A closer glass: the skyline recedes while near seed heads cross the camera faster.
  function meadow(g,{t=48,progress=0,wind=.4,light=1,drawCast}={}) {
    if(!loaded)return;
    const slide=clip(progress)*92;
    g.save();g.translate(-184-slide*.38,-825);g.scale(1.32,1.78);
    draw(g,{t,light,wind,pan:-.16+.34*progress});g.restore();
    if(drawCast)drawCast({x:feet.x*1.32-184-slide*.38,y:feet.y*1.78-825,height:151,sx:1.32,sy:1.78,tx:-184-slide*.38,ty:-825});
    g.save();g.translate(55-slide*1.22,0);
    for(const a of nearSprays)renderSpray(g,a,t,wind);
    renderHerbs(g,herbs.near,t,wind,light);g.restore();
    g.save();floaters(g,t,clip(light),clip(wind));g.restore();
  }
  async function load(){
    if(loaded)return;
    for(const lit of [0,1]){
      plate('peaks',lit,564,mountains);plate('fields',lit,746,fields);plate('hill',lit,732,hillside);
    }
    plantSeeds();plantHerbs();
    grassesAtlas.cool=makeGrassesAtlas(false);grassesAtlas.warm=makeGrassesAtlas(true);
    grassesAtlas.blend=document.createElement('canvas');grassesAtlas.blend.width=grassesAtlas.cool.width;grassesAtlas.blend.height=grassesAtlas.cool.height;
    loaded=true;
  }
  return {load,draw,front,meadow,meadowLife,feet};
})();
