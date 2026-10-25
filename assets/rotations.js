'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvases = {A:$('cubeA'),B:$('cubeB')};
  const values = {a1:90,a2:90,b1:90,b2:90};
  const stage = {A:2,B:2};
  const colors = {T:'#f6ca48',D:'#f89b48',F:'#5a9feb',B:'#9674d3',R:'#e76060',L:'#69bd80'};
  const faces = {T:[0,0,1],D:[0,0,-1],F:[0,-1,0],B:[0,1,0],R:[1,0,0],L:[-1,0,0]};
  const identity = [[1,0,0],[0,1,0],[0,0,1]];
  const rad = deg => deg * Math.PI/180;
  const Rx = t => [[1,0,0],[0,Math.cos(t),-Math.sin(t)],[0,Math.sin(t),Math.cos(t)]];
  const Ry = t => [[Math.cos(t),0,Math.sin(t)],[0,1,0],[-Math.sin(t),0,Math.cos(t)]];
  const mv = (A,v) => A.map(row => row.reduce((s,x,k)=>s+x*v[k],0));
  const mm = (A,B) => A.map(row => [0,1,2].map(j=>row.reduce((s,x,k)=>s+x*B[k][j],0)));
  const dot = (a,b) => a.reduce((s,x,i)=>s+x*b[i],0);
  // An orthonormal camera basis: displayed cubes are orthographic projections
  // of genuine squares in 3D, not arbitrary parallelograms.
  const right = [.8,.6,0], up = [-.384,.512,.784],
        eye = [right[1]*up[2]-right[2]*up[1],
               right[2]*up[0]-right[0]*up[2],
               right[0]*up[1]-right[1]*up[0]];
  function rotation(seq,atStage=stage[seq]){
    if(atStage===0)return identity;
    const first=seq==='A'?Rx(rad(values.a1)):Ry(rad(values.b1));
    if(atStage===1)return first;
    const second=seq==='A'?Ry(rad(values.a2)):Rx(rad(values.b2));
    return mm(second,first); // fixed world axes: second left-multiplies first.
  }
  function alignedLabels(A){
    const worldDirections=[[0,0,1],[0,-1,0],[1,0,0]];
    const letters=Object.keys(faces);
    const out=worldDirections.map(direction=>{
      const sorted=letters.map(letter=>({letter,score:dot(mv(A,faces[letter]),direction)}))
        .sort((a,b)=>b.score-a.score);
      return sorted[0].score>0.9999?sorted[0].letter:'–';
    });
    return out.every(x=>x!=='–')?out.join(' / '):null;
  }
  function setup(c,height=310){
    const width=Math.max(290,c.clientWidth),d=window.devicePixelRatio||1;
    c.width=Math.round(width*d);c.height=Math.round(height*d);
    c.style.height=height+'px';
    const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);
    g.fillStyle='#fbfdff';g.fillRect(0,0,width,height);
    return {g,width,height};
  }
  function renderCube(seq){
    const {g,width}=setup(canvases[seq]);
    const A=rotation(seq),unit=Math.min(width*.16,72),ox=width/2,oy=133;
    const proj=p=>[ox+dot(p,right)*unit,oy-dot(p,up)*unit];
    const visible=Object.entries(faces)
      .map(([label,n])=>({label,normal:mv(A,n),objectNormal:n}))
      .filter(f=>dot(f.normal,eye)>1e-6)
      .sort((a,b)=>dot(a.normal,eye)-dot(b.normal,eye));
    for(const f of visible){
      const n=f.objectNormal;
      // In-object face basis is orthogonal to the face normal.
      const U=Math.abs(n[2]) ? [1,0,0] : Math.abs(n[0]) ? [0,1,0] : [1,0,0];
      const V=Math.abs(n[2]) ? [0,1,0] : [0,0,1];
      const points=[[-1,-1],[1,-1],[1,1],[-1,1]]
        .map(([i,j])=>proj(mv(A,n.map((v,k)=>.9*(v+i*U[k]+j*V[k])))));
      g.beginPath();
      points.forEach((pt,i)=>i?g.lineTo(...pt):g.moveTo(...pt));
      g.closePath();g.fillStyle=colors[f.label];g.fill();
      g.strokeStyle='#18364a';g.lineWidth=2;g.stroke();
      const mid=proj(mv(A,n.map(v=>v*.9)));
      g.fillStyle='#13283c';g.font='bold 21px system-ui';g.textAlign='center';
      g.fillText(f.label,mid[0],mid[1]+6);
    }
    // Explicit fixed-world coordinate axes (do NOT rotate these).
    const axis=[[[1,0,0],'x','#c73434'],[[0,1,0],'y','#25844f'],[[0,0,1],'z','#225fc0']];
    const X=50,Y=261;
    for(const [direction,name,color] of axis){
      const dx=dot(direction,right)*44,dy=-dot(direction,up)*44;
      g.beginPath();g.moveTo(X,Y);g.lineTo(X+dx,Y+dy);
      g.strokeStyle=color;g.lineWidth=3;g.stroke();
      const l=Math.hypot(dx,dy)||1;
      g.fillStyle=color;g.beginPath();
      g.moveTo(X+dx,Y+dy);
      g.lineTo(X+dx-dx/l*10-dy/l*4,Y+dy-dy/l*10+dx/l*4);
      g.lineTo(X+dx-dx/l*10+dy/l*4,Y+dy-dy/l*10-dx/l*4);
      g.closePath();g.fill();
      g.font='bold 15px system-ui';g.fillText(name,X+dx+7,Y+dy+2);
    }
    g.fillStyle='#51697b';g.textAlign='left';g.font='12px system-ui';g.fillText('Fixed axes',105,289);
    const top=mv(A,faces.T),labels=alignedLabels(A);
    const heading=stage[seq]===0?'Start':stage[seq]===1?'After first turn':'After both turns';
    $('state'+seq).textContent=heading+' · '+(labels?
      'Top / Front / Right = '+labels :
      'original T face normal = ('+top.map(x=>Math.abs(x)<1e-9?'0':x.toFixed(3)).join(', ')+')');
    document.querySelectorAll('[data-seq="'+seq+'"][data-stage]').forEach(button=>
      button.setAttribute('aria-pressed',Number(button.dataset.stage)===stage[seq]?'true':'false'));
  }
  function drawNet(){
    const {g,width}=setup($('net'),300),size=Math.min(width/5.6,62),ox=width/2-size/2,oy=115;
    for(const [label,x,y]of[['F',0,0],['L',-1,0],['R',1,0],['B',2,0],['T',0,-1],['D',0,1]]){
      const px=ox+x*size,py=oy+y*size;
      g.fillStyle=colors[label];g.fillRect(px,py,size,size);
      g.strokeStyle='#18364a';g.lineWidth=1.5;g.strokeRect(px,py,size,size);
      g.textAlign='center';g.fillStyle='#14283d';g.font='bold 22px system-ui';
      g.fillText(label,px+size/2,py+size/2+7);
    }
  }
  function render(){renderCube('A');renderCube('B')}
  for(const key of Object.keys(values)){
    const slider=$(key),numeric=$(key+'n'),seq=key[0].toUpperCase();
    function setAngle(v){
      if(!Number.isFinite(v))return;
      v=Math.max(-360,Math.min(360,v));
      values[key]=v;
      slider.value=v;
      if(document.activeElement!==numeric)numeric.value=v;
      stage[seq]=2;render();
    }
    slider.addEventListener('input',()=>{
      numeric.value=slider.value;setAngle(Number(slider.value));
    });
    numeric.addEventListener('input',()=>{
      if(numeric.value.trim()!==''&&Number.isFinite(Number(numeric.value)))
        setAngle(Number(numeric.value));
    });
    numeric.addEventListener('blur',()=>numeric.value=values[key]);
  }
  document.querySelectorAll('[data-seq][data-stage]').forEach(button=>{
    button.addEventListener('click',()=>{
      stage[button.dataset.seq]=Number(button.dataset.stage);render();
    });
  });
  function preset(angle){
    for(const key of Object.keys(values)){
      values[key]=angle;$(key).value=angle;$(key+'n').value=angle;
    }
    stage.A=stage.B=2;render();
  }
  $('both90').addEventListener('click',()=>preset(90));
  $('clear').addEventListener('click',()=>preset(0));
  // 90-degree reference checks are independent of the renderer.
  const saved={...values};
  for(const key of Object.keys(values))values[key]=90;
  if(alignedLabels(rotation('A',1))!=='B / T / R'||
     alignedLabels(rotation('A',2))!=='L / T / B'||
     alignedLabels(rotation('B',1))!=='L / F / T'||
     alignedLabels(rotation('B',2))!=='B / L / T')
    console.error('Cube orientation reference check failed');
  Object.assign(values,saved);
  window.__posterRotation={Rx,Ry,mv,mm,rotation,values,stage};
  window.addEventListener('resize',()=>{drawNet();render()});
  drawNet();render();
})();