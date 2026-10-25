'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const tilt = $('tilt');
  const k = 0.62, d = 0.92, coneHeight = 2.75;
  const criticalAngle = Math.atan(1 / k) * 180 / Math.PI;
  let yaw = 0.55, pitch = 0.48, dragging = null;

  const resize = (canvas, height = 360) => {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(290, canvas.clientWidth);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#fbfdff'; ctx.fillRect(0, 0, width, height);
    return {ctx, width, height};
  };
  const add = (a, b) => a.map((v,i) => v+b[i]);
  const scale = (v, s) => v.map(x => x*s);
  const dist = (a,b) => a.map((x,i)=>x-b[i]);

  function draw() {
    const beta = (+tilt.value) * Math.PI / 180;
    const sb = Math.sin(beta), cb = Math.cos(beta);
    // n is the plane unit normal; (u,v) are orthonormal coordinates IN it.
    // n·(x,y,z)=d is nonsingular at exactly 90° (vertical plane x=-d).
    const n = [-sb, 0, cb], eu = [cb, 0, sb], ev = [0, 1, 0];
    const base = scale(n, d);
    const point = (u, v) => add(base, add(scale(eu,u),scale(ev,v)));
    const ecc = Math.sqrt(1+k*k) * Math.abs(sb);
    const kind = ecc < 1e-9 ? 'Circle' :
      Math.abs(ecc-1)<1e-9 ? 'Parabola' : ecc<1 ? 'Ellipse' : 'Hyperbola';
    $('tiltout').textContent = (beta*180/Math.PI).toFixed(2)+'°';
    $('ecc').textContent = ecc.toFixed(4);
    $('kind').textContent = kind;
    $('threshold').textContent = criticalAngle.toFixed(4)+'°';
    $('desc').textContent = {
      Circle:'A horizontal plane cuts one cone nappe.',
      Ellipse:'A closed curve, entirely on one cone nappe.',
      Parabola:'A plane parallel to a cone generator (unbounded).',
      Hyperbola:'Two open branches, one in each nappe.'
    }[kind];

    // Intrinsic exact cross-section: for coordinates u,v in the plane,
    // v² = k² (d cosβ+u sinβ)² - (-d sinβ+u cosβ)².
    function val(u) {
      const x=-d*sb+u*cb, z=d*cb+u*sb;
      return k*k*z*z - x*x;
    }
    function sampled(uMin,uMax,count) {
      const sections=[];
      for(const sign of [-1,1]) {
        let segment=[];
        for(let i=0;i<=count;i++) {
          const u=uMin+(uMax-uMin)*i/count, v2=val(u);
          if(v2<0) {if(segment.length>1)sections.push(segment);segment=[];continue;}
          segment.push({u,v:sign*Math.sqrt(Math.max(0,v2))});
        }
        if(segment.length>1)sections.push(segment);
      }
      return sections;
    }
    const sections=sampled(-4.5,4.5,2200);
    const view = resize($('cone'),360), g=view.ctx;
    const xMid=view.width/2,yMid=view.height*.53,zoom=Math.min(view.width/7.5,58);
    const co=Math.cos(yaw),si=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const project = ([x,y,z]) => {
      const X = co*x-si*y, Y=si*x+co*y;
      return [xMid+X*zoom,yMid-(cp*z-sp*Y)*zoom];
    };
    function stroke3(points,color,lw=1,dashes=[]) {
      if(points.length<2)return;
      g.beginPath();points.forEach((v,i)=>{const [x,y]=project(v);if(i)g.lineTo(x,y);else g.moveTo(x,y);});
      g.strokeStyle=color;g.lineWidth=lw;g.setLineDash(dashes);g.stroke();g.setLineDash([]);
    }
    function drawCone(s) {
      for(let i=0;i<12;i++) {
        const a=i*Math.PI/6;
        stroke3([[0,0,0],[k*coneHeight*Math.cos(a),k*coneHeight*Math.sin(a),s*coneHeight]],'#b7c9d3');
      }
      for(let z=.55;z<=coneHeight;z+=.55) {
        stroke3(Array.from({length:100},(_,i)=>{
          const a=i*Math.PI*2/99;return [k*z*Math.cos(a),k*z*Math.sin(a),s*z];
        }),'#d7e3e8');
      }
    }
    // Render both nappes: x²+y²=k²z² holds for positive and negative z.
    // Each section point is exact (to floating-point rounding).
    drawCone(1);drawCone(-1);
    const span=2.8, corners=[[-span,-span],[span,-span],[span,span],[-span,span]].map(([u,v])=>point(u,v));
    g.fillStyle='rgba(40,124,167,.10)';g.strokeStyle='#247da7';g.lineWidth=1.7;
    g.beginPath();corners.forEach((p,i)=>{const [x,y]=project(p);if(i)g.lineTo(x,y);else g.moveTo(x,y)});
    g.closePath();g.fill();g.stroke();
    for(const segment of sections) {
      // Clip the intersection at the drawn cone's finite height.
      let run=[];
      function flush(){if(run.length>1)stroke3(run,'#d05c29',2.8);run=[];}
      for(const {u,v} of segment) {
        const p=point(u,v);
        if(Math.abs(p[2])>coneHeight+.03) {flush();continue;}
        run.push(p);
      }
      flush();
    }
    g.fillStyle='#33556b';g.font='13px system-ui';
    g.fillText('Drag to orbit · orange = intersection',12,view.height-12);

    const flat=resize($('section'),360), f=flat.ctx;
    const cX=flat.width/2,cY=flat.height/2,unit=Math.min(flat.width/8.5,44);
    f.strokeStyle='#dfeaf0';f.lineWidth=1;
    for(let q=-5;q<=5;q++) {
      f.beginPath();f.moveTo(cX+q*unit,0);f.lineTo(cX+q*unit,flat.height);
      f.moveTo(0,cY+q*unit);f.lineTo(flat.width,cY+q*unit);f.stroke();
    }
    f.strokeStyle='#6d8495';f.beginPath();f.moveTo(cX,0);f.lineTo(cX,flat.height);
    f.moveTo(0,cY);f.lineTo(flat.width,cY);f.stroke();
    for(const seg of sections) {
      let run=[];
      function flush(){
        if(run.length>1){
          f.beginPath();run.forEach(([x,y],i)=>{if(i)f.lineTo(x,y);else f.moveTo(x,y)});
          f.strokeStyle='#d05c29';f.lineWidth=2.5;f.stroke();
        }
        run=[];
      }
      for(const {u,v} of seg) {
        const x=cX+u*unit,y=cY-v*unit;
        if(x<-10||x>flat.width+10||y<-10||y>flat.height+10) {flush();continue;}
        run.push([x,y]);
      }
      flush();
    }
    f.fillStyle='#33556b';f.font='13px system-ui';f.fillText('Coordinates inside the cutting plane',10,flat.height-10);
  }
  document.querySelectorAll('[data-angle]').forEach(button=>button.addEventListener('click',()=>{
    tilt.value=button.dataset.angle;draw();
  }));
  $('critical').addEventListener('click',()=>{tilt.value=criticalAngle;draw()});
  tilt.addEventListener('input',draw);
  const canvas=$('cone');
  canvas.addEventListener('pointerdown',e=>{dragging=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{
    if(!dragging)return;
    yaw+=(e.clientX-dragging[0])*.009;
    pitch=Math.max(-1.4,Math.min(1.4,pitch+(e.clientY-dragging[1])*.008));
    dragging=[e.clientX,e.clientY];draw();
  });
  canvas.addEventListener('pointerup',()=>dragging=null);
  canvas.addEventListener('pointercancel',()=>dragging=null);
  window.addEventListener('resize',draw);
  window.__posterConics={criticalAngle,k,d};
  draw();
})();