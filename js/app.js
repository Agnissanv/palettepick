


function goto(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  const el=document.getElementById('nav-'+page);
  if(el)el.classList.add('active');
  window.scrollTo(0,0);
}

function showToast(msg){
  const t=document.getElementById('globalToast');
  t.textContent=msg||'Copié !';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),1600);
}

const thief=new ColorThief();
let colorCount=5;
let currentImg=null;

const dropZone=document.getElementById('dropZone');
const fileInput=document.getElementById('fileInput');
const resultArea=document.getElementById('resultArea');
const resultImg=document.getElementById('resultImg');
const paletteList=document.getElementById('paletteList');
const cssPanel=document.getElementById('cssPanel');
const cssCode=document.getElementById('cssCode');
const cssCopyBtn=document.getElementById('cssCopyBtn');
const resetBtn=document.getElementById('resetBtn');






dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('drag')});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('drag'));
dropZone.addEventListener('drop',e=>{
  e.preventDefault();dropZone.classList.remove('drag');
  const f=e.dataTransfer.files[0];
  if(f&&f.type.startsWith('image/'))handleFile(f);
});
fileInput.addEventListener('change',()=>{if(fileInput.files[0])handleFile(fileInput.files[0])});

document.getElementById('countBar').querySelectorAll('.count-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const n=parseInt(btn.dataset.n);
    // La limitation a été retirée pour offrir toutes les fonctionnalités gratuitement
    document.getElementById('countBar').querySelectorAll('.count-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    colorCount=n;
    if(currentImg)analyze();
  });
});

resetBtn.addEventListener('click',()=>{
  resultArea.classList.remove('visible');
  cssPanel.classList.remove('visible');
  dropZone.style.display='block';
  fileInput.value='';
  currentImg=null;
});

function handleFile(file){
  const url=URL.createObjectURL(file);
  resultImg.src=url;
  resultImg.onload=()=>{currentImg=resultImg;analyze()};
  dropZone.style.display='none';
  resultArea.classList.add('visible');
}

function rgbToHex(r,g,b){
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
}

const varNames=['primary','secondary','accent','neutral','highlight','warm','cool','subtle','vivid','base'];

function analyze(){
  const palette=thief.getPalette(currentImg,colorCount,5);
  paletteList.innerHTML='';
  let cssLines='<span class="kw">:root</span> {\n';
  palette.forEach(([r,g,b],i)=>{
    const hex=rgbToHex(r,g,b);
    const vn='--color-'+(varNames[i]||'color-'+(i+1));
    cssLines+='  <span class="prop">'+vn+'</span>: <span class="val">'+hex+'</span>;\n';
    const row=document.createElement('div');
    row.className='pal-row';
    row.style.animationDelay=(i*.07)+'s';
    row.innerHTML=`
      <div class="pal-swatch" style="background:${hex}" onclick="copyVal('${hex}')"></div>
      <div class="pal-info">
        <div class="pal-hex">${hex}</div>
        <div class="pal-rgb">rgb(${r}, ${g}, ${b})</div>
      </div>
      <button class="copy-btn" onclick="copyVal('${hex}',this)">HEX</button>
      <button class="copy-btn" onclick="copyVal('rgb(${r},${g},${b})',this)">RGB</button>
    `;
    paletteList.appendChild(row);
  });
  cssLines+='}';
  cssCode.innerHTML=cssLines;
  cssPanel.classList.add('visible');
}




function copyVal(text,btn){
  navigator.clipboard.writeText(text).then(()=>{
    showToast('Copié : '+text);
    if(btn){btn.classList.add('ok');const o=btn.textContent;btn.textContent='✓';setTimeout(()=>{btn.classList.remove('ok');btn.textContent=o},1200);}
  });
}

cssCopyBtn.addEventListener('click',()=>{
  const raw=cssCode.innerText;
  navigator.clipboard.writeText(raw).then(()=>{
    showToast('CSS copié !');
    cssCopyBtn.textContent='✓ Copié';
    setTimeout(()=>cssCopyBtn.textContent='Copier le CSS',1500);
  });
});