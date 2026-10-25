'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvases = {A:$('cubeA'),B:$('cubeB')};
  const values = {a1:90,a2:90,b1:90,b2:90};
  // Progress is measured in two phases: [0,1] first rotation, [1,2] second.
  // The target angles are independent of this animation state.
  const stage = {A:0,B:0};
  const playing = {A:false,B:false};
  const midpointHandled = {A:false,B:false};
  let frameId = null, lastTime = null;
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
  const right = [.8,.6,0], up = [-.36,.48,.8],
        eye = [right[1]*up[2]-right[2]*up[1],
               right[2]*up[0]-right[0]*up[2],
               right[0]*up[1]-right[1]*up[0]];
  function rotation(seq,atStage=stage[seq]){
    if(atStage <= 0)return identity;
    const firstTarget=seq==='A'?values.a1:values.b1;
    const secondTarget=seq==='A'?values.a2:values.b2;
    const first=seq==='A'?Rx(rad(firstTarget*Math.min(atStage,1))):
                           Ry(rad(firstTarget*Math.min(atStage,1)));
    if(atStage<=1)return first;
    const second=seq==='A'?Ry(rad(secondTarget*Math.min(atStage-1,1))):
                            Rx(rad(secondTarget*Math.min(atStage-1,1)));
    return mm(second,first); // active rotations about fixed world axes.
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
    const p=stage[seq];
    const firstAngle=seq==='A'?values.a1:values.b1;
    const secondAngle=seq==='A'?values.a2:values.b2;
    const eps=1e-7;
    const heading=p<eps?'Start':
      p<1-eps?'First turn '+(firstAngle*p).toFixed(1)+'° / '+firstAngle+'°':
      p<1+eps?'After first turn':
      p<2-eps?'Second turn '+(secondAngle*(p-1)).toFixed(1)+'° / '+secondAngle+'°':'After both turns';
    $('progress'+seq).value=p;
    $('progressText'+seq).textContent=p<eps?'Start':p<1-eps?'Turn 1':p<1+eps?'Between turns':p<2-eps?'Turn 2':'Finished';
    $('pause'+seq).disabled=!playing[seq];
    $('play'+seq).textContent=playing[seq]?'▶ Playing…':'▶ Play / Resume';
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
      playing[seq]=false;stage[seq]=0;midpointHandled[seq]=false;render();
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
      const seq=button.dataset.seq;
      playing[seq]=false;stage[seq]=Number(button.dataset.stage);
      midpointHandled[seq]=stage[seq]>=1;render();
    });
  });
  function preset(angle){
    for(const key of Object.keys(values)){
      values[key]=angle;$(key).value=angle;$(key+'n').value=angle;
    }
    playing.A=playing.B=false;
    stage.A=stage.B=0;
    midpointHandled.A=midpointHandled.B=false;
    render();
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
  // Animation progresses by actual angle traversed (degrees/second), not
  // by an arbitrary fixed duration per phase. A zero-angle phase is skipped.
  const speed=$('speed');
  const pauseFirst=$('pauseFirst');
  function updateSpeed(){ $('speedValue').textContent=Number(speed.value)+'°/s'; }
  speed.addEventListener('input',updateSpeed);
  updateSpeed();

  function advance(seq,deltaDegrees){
    let p=stage[seq];
    const a1=Math.abs(seq==='A'?values.a1:values.b1);
    const a2=Math.abs(seq==='A'?values.a2:values.b2);
    for(let safeguard=0;safeguard<4 && playing[seq];safeguard++){
      if(p<1-1e-9){
        const remain=a1*(1-p);
        if(remain>deltaDegrees && a1>1e-9){
          p+=deltaDegrees/a1;
          break;
        }
        deltaDegrees=Math.max(0,deltaDegrees-remain);
        p=1;
        if(pauseFirst.checked && !midpointHandled[seq]){
          midpointHandled[seq]=true;
          playing[seq]=false;
          break;
        }
      } else if(p<2-1e-9){
        const remain=a2*(2-p);
        if(remain>deltaDegrees && a2>1e-9){
          p+=deltaDegrees/a2;
          break;
        }
        deltaDegrees=Math.max(0,deltaDegrees-remain);
        p=2;
        playing[seq]=false;
        break;
      } else {
        playing[seq]=false;
        p=2;
        break;
      }
      if(deltaDegrees<=0 && a2>0)break;
    }
    stage[seq]=Math.max(0,Math.min(2,p));
  }
  function frame(time){
    frameId=null;
    if(lastTime===null)lastTime=time;
    // Clamping avoids sudden jumps after tab switches or system sleep.
    const elapsed=Math.min(.06,Math.max(0,(time-lastTime)/1000));
    lastTime=time;
    const delta=Number(speed.value)*elapsed;
    for(const seq of ['A','B'])if(playing[seq])advance(seq,delta);
    render();
    if(playing.A||playing.B)frameId=requestAnimationFrame(frame);
    else lastTime=null;
  }
  function ensureFrame(){
    if(frameId===null){
      lastTime=null;
      frameId=requestAnimationFrame(frame);
    }
  }
  function start(seq){
    if(stage[seq]>=2-1e-9){
      stage[seq]=0;midpointHandled[seq]=false;
    }
    // Explicitly starting at the midpoint resumes the second turn.
    if(stage[seq]>=1-1e-9)midpointHandled[seq]=true;
    playing[seq]=true;
    ensureFrame();render();
  }
  function pause(seq){playing[seq]=false;render();}
  function reset(seq){
    playing[seq]=false;stage[seq]=0;midpointHandled[seq]=false;
    render();
  }
  for(const seq of ['A','B']){
    $('play'+seq).addEventListener('click',()=>start(seq));
    $('pause'+seq).addEventListener('click',()=>pause(seq));
    $('reset'+seq).addEventListener('click',()=>reset(seq));
    $('progress'+seq).addEventListener('input',event=>{
      playing[seq]=false;
      stage[seq]=Number(event.target.value);
      midpointHandled[seq]=stage[seq]>=1;
      render();
    });
  }
  $('playBoth').addEventListener('click',()=>{
    start('A');start('B');
  });
  $('pauseBoth').addEventListener('click',()=>{
    playing.A=playing.B=false;render();
  });
  $('resetBoth').addEventListener('click',()=>{
    playing.A=playing.B=false;stage.A=stage.B=0;
    midpointHandled.A=midpointHandled.B=false;render();
  });
  // Don't continue advancing time invisibly when the page is backgrounded.
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){playing.A=playing.B=false;lastTime=null;render();}
  });

  window.__posterRotation={Rx,Ry,mv,mm,rotation,values,stage,playing,advance,start,pause,reset};
  window.addEventListener('resize',()=>{drawNet();render()});
  drawNet();render();
})();