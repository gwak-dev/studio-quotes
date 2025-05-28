// Data and logic for equipment estimate
const data=[
 // 컴퓨터
 {category:'컴퓨터',name:'Mac Studio M2 Max',min:4500000,avg:4700000,max:5000000,channels:0,img:'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/mac-studio-select-202303?wid=890&hei=820&&qlt=80&.v=1677874322626'},
 // 모니터
 {category:'모니터',name:'LG 27UL850',min:550000,avg:600000,max:650000,channels:0,img:'https://image.lg전자.com/kr/monitor/md07519192/gallery/medium01.jpg'},
 // 인터페이스
 {category:'인터페이스',name:'Universal Audio Apollo x8p',min:3800000,avg:4000000,max:4200000,channels:8,img:'https://media.uaudio.com/assetlibrary/x/8/apollo-x8p-front.jpg'},
 // 프리앰프
 {category:'프리앰프',name:'Audient ASP880',min:1600000,avg:1750000,max:1900000,channels:8,img:'https://audient.com/wp-content/uploads/2016/09/asp880-hero.jpg'},
 {category:'프리앰프',name:'Focusrite ISA 428 MkII',min:2800000,avg:3000000,max:3200000,channels:4,img:'https://focusrite.com/sites/default/files/2019-04/isa428mkii.png'},
 // 마이크 (TLM103 4개 - 채널0)
 {category:'마이크',name:'Neumann TLM103 (4개)',min:6000000,avg:6400000,max:6800000,channels:0,img:'https://en-de.neumann.com/file-finder?file=tlm-103-mt_front.png'},
 {category:'마이크',name:'AKG C414 XLII (2개)',min:2800000,avg:3000000,max:3200000,channels:0,img:'https://www.akg.com/dw/image/v2/AAUV_PRD/on/demandware.static/-/Sites-masterCatalog_Harman/default/dw6aa6c9f3/AKG_C414-XLII_AK.jpg'},
 {category:'마이크',name:'Audix DP7 드럼세트',min:1600000,avg:1700000,max:1800000,channels:0,img:'https://audixusa.com/wp-content/uploads/2020/02/DP7_image-1.png',drum:true},
 // 스피커 선택지 (Adams, Eggs)
 {category:'스튜디오모니터',name:'Adam Audio A7V(페어)',min:1900000,avg:2000000,max:2100000,channels:0,img:'https://www.adam-audio.com/wp-content/uploads/2022/05/adam-audio-a7v.png'},
 {category:'스튜디오모니터',name:'Munro Sonic Egg150',min:2700000,avg:2850000,max:3000000,channels:0,img:'https://munrosonic.com/wp-content/uploads/2018/06/egg-150.png'},
 // 의자 2개
 {category:'가구',name:'Herman Miller Aeron Chair (2)',min:3600000,avg:4000000,max:4400000,channels:0,img:'https://www.hermanmiller.com/content/dam/hmc/en/products/seating/office_chairs/aeron_chairs/aeron_chair_a_product_list.jpg'},
 // 기타
 {category:'액세서리',name:'마이크 스탠드 K&M 210/9 (10)',min:1000000,avg:1100000,max:1200000,channels:0,img:'https://www.k-m.de/WebRoot/Sage/Shops/KM-Vertriebs-GmbH/6044/25CC/3197/2BD5/F405/0A30/05BB/493F/21021-300-55.png'},
];

const equipDiv=document.getElementById('equipment');
const selectedList=document.getElementById('selected-list');
const minTotalEl=document.getElementById('minTotal');
const avgTotalEl=document.getElementById('avgTotal');
const maxTotalEl=document.getElementById('maxTotal');
const channelsEl=document.getElementById('channels');
const capsEl=document.getElementById('caps');

const categories=[...new Set(data.map(d=>d.category))];

categories.forEach(cat=>{
  const section=document.createElement('div');
  const h=document.createElement('h2');
  h.textContent=cat;
  h.className='text-lg font-semibold mb-1';
  section.appendChild(h);
  data.filter(d=>d.category===cat).forEach(item=>{
    const div=document.createElement('div');div.className='flex items-center bg-white dark:bg-zinc-800 rounded-lg p-3 shadow-sm mb-2';
    const cb=document.createElement('input');cb.type='checkbox';
    cb.className='mr-3';
    cb.addEventListener('change',updateSummary);
    div.appendChild(cb);
    const img=document.createElement('img');img.src=item.img;img.className='w-14 h-14 rounded-md object-cover mr-3';
    img.onerror=()=>{img.src='https://via.placeholder.com/60?text=?';};
    div.appendChild(img);
    const label=document.createElement('div');
    label.innerHTML=`<strong>${item.name}</strong><br><span class='text-sm text-zinc-500'>₩${num(item.min)} ~ ₩${num(item.max)} (평균 ₩${num(item.avg)})</span>`;
    div.appendChild(label);
    cb.dataset.item=JSON.stringify(item);
    section.appendChild(div);
  })
  equipDiv.appendChild(section);
});

function num(n){return n.toLocaleString();}

function updateSummary(){
  const cbs=document.querySelectorAll('input[type="checkbox"]:checked');
  let min=0,avg=0,max=0,ch=0,drumAble=false;
  selectedList.innerHTML='';
  cbs.forEach(cb=>{
    const item=JSON.parse(cb.dataset.item);
    min+=item.min;avg+=item.avg;max+=item.max;ch+=item.channels||0; if(item.drum) drumAble=true;
    const li=document.createElement('li');li.textContent=item.name;selectedList.appendChild(li);
  });
  minTotalEl.textContent=num(min);
  avgTotalEl.textContent=num(avg);
  maxTotalEl.textContent=num(max);
  channelsEl.textContent=ch;
  let capMsg='';
  if(ch>=20) capMsg+='4중창 + 스트링 콰르텟 동시 녹음 가능\n';
  else if(ch>=12) capMsg+='4중창 또는 스트링 콰르텟 녹음 가능\n';
  else if(ch>=4) capMsg+='보컬/소규모 녹음 가능\n';
  if(drumAble) capMsg+='드럼 풀 마이킹 세트 포함';
  capsEl.textContent=capMsg.trim();
}

// 다크모드 토글
const toggle=document.getElementById('themeToggle');
const root=document.documentElement;
if(toggle) toggle.addEventListener('click',()=>{root.classList.toggle('dark');}); 