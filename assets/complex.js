'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const canvas=$('complexPlane');
  const fields=[$('zre'),$('zim'),$('wre'),$('wim')];
  let z=[1.2,.65],w=[.45,1],held=null;
  let W,H,S,ox,oy;
  const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
  const mag=a=>Math.hypot(a[0],a[1]);
  const arg=a=>Math.atan2(a[1],a[0])*180/Math.PI;
  const fmt=a=>a[0].toFixed(3)+(a[1]<0?' − ':' + ')+Math.abs(a[1]).toFixed(3)+'i';
  const toPx=a=>[ox+a[0]*S,oy-a[1]*S];
  function syncFields(){
    [z[0],z[1],w[0],w[1]].forEach((n,i)=>fields[i].value=+n.toFixed(4));
  }
  function updateFromFields(){
    if(fields.some(x=>x.value.trim()===''))return;
    const v=fields.map(x=>Number(x.value));
    if(v.some(x=>!Number.isFinite(x)))return;
    const p=mul(v.slice(0,2),v.slice(2,4));
    if(p.some(x=>!Number.isFinite(x)))return;
    z=v.slice(0,2);w=v.slice(2,4);draw();
  }
  function draw(){
    let d=window.devicePixelRatio||1;
    W=Math.max(300,canvas.clientWidth);H=Math.max(350,Math.min(520,W*.76));
    canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);
    canvas.style.height=H+'px';
    const g=canvas.getContext('2d');g.setTransform(d,0,0,d,0,0);
    g.fillStyle='#fbfdff';g.fillRect(0,0,W,H);
    const p=mul(z,w);
    const maxMag=Math.max(3.0,mag(z),mag(w),mag(p));
    // Autoscale so even large numeric inputs remain visible.
    S=Math.min(W/8.5,H/8)*Math.min(1,3.35/maxMag);
    ox=W/2;oy=H/2;
    const gridStep=Math.pow(10,Math.floor(Math.log10(maxMag/3)));
    const step=Math.max(gridStep, 1);
    g.strokeStyle='#e1e9ee';g.lineWidth=1;
    const boundX=W/2/S,boundY=H/2/S;
    if(Number.isFinite(boundX)&&boundX<1e8) {
      for(let i=-Math.floor(boundX/step);i<=Math.ceil(boundX/step);i++){
        const x=ox+i*step*S;
        if(x<0||x>W)continue;
        g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();
      }
      for(let i=-Math.floor(boundY/step);i<=Math.ceil(boundY/step);i++){
        const y=oy+i*step*S;
        if(y<0||y>H)continue;
        g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();
      }
    }
    g.strokeStyle='#688394';g.lineWidth=1.6;
    g.beginPath();g.moveTo(0,oy);g.lineTo(W,oy);g.moveTo(ox,0);g.lineTo(ox,H);g.stroke();
    g.strokeStyle='#b6c6d0';g.setLineDash([4,6]);g.beginPath();
    g.arc(ox,oy,S,0,2*Math.PI);g.stroke();g.setLineDash([]);
    g.fillStyle='#40586a';g.font='13px system-ui';
    g.fillText('Re',W-30,oy-10);g.fillText('Im',ox+9,16);
    g.fillText('1',ox+S+3,oy+14);
    function arrow(a,color,label){
      const [x,y]=toPx(a),dx=x-ox,dy=y-oy,length=Math.hypot(dx,dy)||1;
      g.strokeStyle=color;g.fillStyle=color;g.lineWidth=3;
      g.beginPath();g.moveTo(ox,oy);g.lineTo(x,y);g.stroke();
      if(length>8) {
        g.beginPath();
        g.moveTo(x,y);
        g.lineTo(x-12*dx/length-5*dy/length,y-12*dy/length+5*dx/length);
        g.lineTo(x-12*dx/length+5*dy/length,y-12*dy/length-5*dx/length);
        g.closePath();g.fill();
      }
      g.beginPath();g.arc(x,y,6,0,2*Math.PI);g.fill();
      g.font='bold 17px system-ui';g.fillText(label,x+10,y-10);
    }
    arrow(p,'#8d4aaf','zw');
    arrow(z,'#166eb4','z');
    arrow(w,'#df7a19','w');
    for(const [id,a] of [['z',z],['w',w],['p',p]]){
      $(id+'val').textContent=fmt(a);
      $(id+'polar').textContent='|'+id+'| = '+mag(a).toFixed(3)+
        ' ; angle '+(mag(a)<1e-12?'undefined':arg(a).toFixed(2)+'°');
    }
    const lenError=Math.abs(mag(p)-mag(z)*mag(w));
    $('check').textContent='|zw| = |z| × |w| (difference '+lenError.toExponential(1)+')';
  }
  function pointerPosition(e){
    const r=canvas.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top];
  }
  canvas.addEventListener('pointerdown',e=>{
    const mouse=pointerPosition(e),a=toPx(z),b=toPx(w);
    const da=Math.hypot(mouse[0]-a[0],mouse[1]-a[1]);
    const db=Math.hypot(mouse[0]-b[0],mouse[1]-b[1]);
    if(Math.min(da,db)<42){
      held=da<=db?'z':'w';canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove',e=>{
    if(!held)return;
    const m=pointerPosition(e);
    const v=[(m[0]-ox)/S,(oy-m[1])/S];
    if(held==='z')z=v;else w=v;
    syncFields();draw();
  });
  canvas.addEventListener('pointerup',()=>held=null);
  canvas.addEventListener('pointercancel',()=>held=null);
  fields.forEach(x=>x.addEventListener('input',updateFromFields));
  document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.preset;
    if(id==='i'){z=[1.35,.5];w=[0,1];}
    else if(id==='half'){z=[1.4,.6];w=[Math.SQRT1_2,Math.SQRT1_2];}
    else if(id==='double'){z=[1,.8];w=[0,-2];}
    else{z=[1.2,.65];w=[.45,1];}
    syncFields();draw();
  }));
  window.addEventListener('resize',draw);
  syncFields();draw();
})();