// Initialize Supabase client
const SUPABASE_URL = 'https://vykswdpnxjjyuyewdrxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5a3N3ZHBueGpqeXV5ZXdkcnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MDQ3NzYsImV4cCI6MjA1OTA4MDc3Nn0.t_jttp5DuHuK53i4WI80lHHFpAfyGvF_OOriF2U2Bn8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create storage bucket if not exists
async function initializeStorage() {
  try {
    // First, try to upload a test file to see if bucket exists
    const testFile = new Blob(['test'], { type: 'text/plain' });
    const { error: testError } = await supabase.storage
      .from('equipment-images')
      .upload('test.txt', testFile, { upsert: true });
    
    if (testError && testError.message.includes('bucket')) {
      console.log('Creating storage bucket...');
      // Bucket doesn't exist, try to create it
      const { error: createError } = await supabase.storage.createBucket('equipment-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        // If bucket already exists, that's fine
        if (!createError.message.includes('already exists')) {
          throw createError;
        }
      }
    } else {
      // Clean up test file
      await supabase.storage.from('equipment-images').remove(['test.txt']);
    }
    
    console.log('Storage initialized successfully');
  } catch (error) {
    console.error('Storage initialization error:', error);
  }
}

// Upload image to Supabase Storage
async function uploadImageToStorage(file) {
  try {
    console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `equipment/${fileName}`;
    
    // Upload file
    const { data, error } = await supabase.storage
      .from('equipment-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Upload error:', error);
      throw error;
    }
    
    console.log('Upload successful:', data);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('equipment-images')
      .getPublicUrl(filePath);
    
    console.log('Public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

// Data and logic for equipment estimate
let data=[];

// ---------- Supabase Data Load/Save ----------
async function loadFromSupabase() {
  try {
    console.log('Loading data from Supabase...');
    const startTime = Date.now();
    
    const { data: equipment, error } = await supabase
      .from('studio_equipment')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    
    const loadTime = Date.now() - startTime;
    console.log(`Data loaded in ${loadTime}ms`);
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    // Transform Supabase data to match our format
    return equipment.map(item => ({
      category: item.category,
      name: item.name,
      maker: item.maker || '',
      min: item.min_price,
      avg: item.avg_price,
      max: item.max_price,
      channels: item.channels || 0,
      drum: item.is_drum || false,
      img: item.image_url || '',
      desc: item.description || '',
      links: item.links || [],
      id: item.id // Keep the ID for updates/deletes
    }));
  } catch (error) {
    console.error('Error loading from Supabase:', error);
    // If Supabase is slow or fails, use default data
    if (error.message && error.message.includes('timeout')) {
      console.log('Supabase timeout, using default data');
      return null;
    }
    return null;
  }
}

async function saveToSupabase(item) {
  try {
    const supabaseItem = {
      category: item.category,
      name: item.name,
      maker: item.maker || null,
      min_price: item.min,
      avg_price: item.avg,
      max_price: item.max,
      channels: item.channels || 0,
      is_drum: item.drum || false,
      image_url: item.img || null,
      description: item.desc || null,
      links: item.links || []
    };
    
    if (item.id) {
      // Update existing item
      const { error } = await supabase
        .from('studio_equipment')
        .update(supabaseItem)
        .eq('id', item.id);
      
      if (error) throw error;
    } else {
      // Insert new item
      const { data: newItem, error } = await supabase
        .from('studio_equipment')
        .insert(supabaseItem)
        .select()
        .single();
      
      if (error) throw error;
      return newItem.id;
    }
  } catch (error) {
    console.error('Error saving to Supabase:', error);
    throw error;
  }
}

async function deleteFromSupabase(id) {
  try {
    const { error } = await supabase
      .from('studio_equipment')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
    throw error;
  }
}

// Loading indicator
const loadingIndicator = document.getElementById('loadingIndicator');

function showLoading() {
  if (loadingIndicator) {
    loadingIndicator.classList.remove('hidden');
  }
}

function hideLoading() {
  if (loadingIndicator) {
    loadingIndicator.classList.add('hidden');
  }
}

// Initialize data from Supabase or use default data
async function initializeData() {
  showLoading();
  
  try {
    // Initialize storage first
    await initializeStorage();
    
    const supabaseData = await loadFromSupabase();
    
    if (supabaseData && supabaseData.length > 0) {
      // Use Supabase data if available
      data = supabaseData;
    } else {
      // First time: insert default data to Supabase
      console.log('Initializing with default data...');
      for (const item of defaultData) {
        try {
          const id = await saveToSupabase(item);
          item.id = id;
        } catch (error) {
          console.error('Error saving default item:', error);
        }
      }
      data = [...defaultData];
    }
    
    // Update UI after data is loaded
    updateCategoryButtons();
    renderEquipmentGrid();
    updateSummary();
  } catch (error) {
    console.error('Error initializing data:', error);
    alert('데이터를 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
  } finally {
    hideLoading();
  }
}

// Default data for reset
const defaultData = [
 // 컴퓨터 및 소프트웨어
 {category:'컴퓨터',name:'Mac Studio M2 Max 기본형',min:3800000,avg:4000000,max:4200000,channels:0},
 {category:'컴퓨터',name:'Mac Mini M2 Pro',min:1800000,avg:2000000,max:2200000,channels:0},
 {category:'소프트웨어',name:'Logic Pro X',min:280000,avg:300000,max:320000,channels:0},
 {category:'소프트웨어',name:'Pro Tools',min:550000,avg:600000,max:650000,channels:0},
 {category:'소프트웨어',name:'Waves 플러그인 패키지',min:1800000,avg:2000000,max:2200000,channels:0},
 {category:'소프트웨어',name:'FabFilter 전체 패키지',min:900000,avg:1000000,max:1100000,channels:0},
 
 // 오디오 인터페이스
 {category:'인터페이스',name:'Universal Audio Apollo x8p',min:3800000,avg:4000000,max:4200000,channels:8},
 {category:'인터페이스',name:'Universal Audio Apollo x8 (추가)',min:2800000,avg:3000000,max:3200000,channels:8},
 {category:'인터페이스',name:'Focusrite Scarlett 2i2',min:200000,avg:250000,max:300000,channels:2},
 
 // 마이크
 {category:'마이크',name:'Neumann U87 Ai',min:3800000,avg:4000000,max:4200000,channels:0},
 {category:'마이크',name:'AKG C414 XLII (2개)',min:2800000,avg:3000000,max:3200000,channels:0},
 {category:'마이크',name:'Telefunken U47 (프리미엄)',min:11000000,avg:12000000,max:13000000,channels:0},
 {category:'마이크',name:'드럼 마이크 세트 (SM57, Beta52A 포함)',min:1800000,avg:2000000,max:2200000,channels:0,drum:true},
 {category:'마이크',name:'Shure SM58',min:120000,avg:150000,max:180000,channels:0},
 
 // 프리앰프
 {category:'프리앰프',name:'Focusrite ISA 428 MkII',min:2800000,avg:3000000,max:3200000,channels:4},
 {category:'프리앰프',name:'API 3124V (4채널)',min:3800000,avg:4000000,max:4200000,channels:4},
 {category:'프리앰프',name:'SSL VHD Pre',min:1500000,avg:1700000,max:1900000,channels:4},
 
 // 컴프레서 및 아웃보드
 {category:'아웃보드',name:'Tube-Tech CL1B 컴프레서',min:2800000,avg:3000000,max:3200000,channels:0},
 {category:'아웃보드',name:'API 2500 컴프레서',min:2800000,avg:3000000,max:3200000,channels:0},
 {category:'아웃보드',name:'Manley Massive Passive EQ',min:6500000,avg:7000000,max:7500000,channels:0},
 {category:'아웃보드',name:'DBX 160A',min:800000,avg:900000,max:1000000,channels:0},
 
 // 모니터링
 {category:'스튜디오모니터',name:'Adam Audio A7V (7인치 페어)',min:1800000,avg:2000000,max:2200000,channels:0},
 {category:'스튜디오모니터',name:'Genelec 8351B (페어)',min:6500000,avg:7000000,max:7500000,channels:0},
 {category:'스튜디오모니터',name:'Yamaha NS-10M (빈티지)',min:1200000,avg:1500000,max:1800000,channels:0},
 {category:'모니터링',name:'헤드폰 모니터링 시스템 (4개)',min:900000,avg:1000000,max:1100000,channels:0},
 {category:'모니터링',name:'Beyerdynamic DT 770 Pro',min:200000,avg:250000,max:300000,channels:0},
 
 // 악기
 {category:'악기',name:'Nord Stage 4 Compact',min:4700000,avg:5000000,max:5300000,channels:0},
 {category:'악기',name:'Fender Deluxe Reverb 기타 앰프',min:1800000,avg:2000000,max:2200000,channels:0},
 {category:'악기',name:'Ampeg Rocket Bass RB-115',min:900000,avg:1000000,max:1100000,channels:0},
 {category:'악기',name:'Yamaha Stage Custom 드럼세트',min:1800000,avg:2000000,max:2200000,channels:0,drum:true},
 {category:'악기',name:'Gibson Les Paul Standard',min:3500000,avg:4000000,max:4500000,channels:0},
 
 // 가구 및 액세서리
 {category:'가구',name:'Herman Miller Aeron Chair (2개)',min:3600000,avg:4000000,max:4400000,channels:0},
 {category:'가구',name:'녹음용 기본 책상 및 액세서리',min:1800000,avg:2000000,max:2200000,channels:0},
 {category:'가구',name:'스튜디오 랙 (19인치)',min:500000,avg:700000,max:900000,channels:0},
 {category:'액세서리',name:'마이크 스탠드 및 액세서리',min:1800000,avg:2000000,max:2200000,channels:0},
 {category:'액세서리',name:'룸 어쿠스틱 튜닝 장비 및 컨설팅',min:1800000,avg:2000000,max:2200000,channels:0},
 {category:'액세서리',name:'케이블 세트 (XLR, TRS)',min:500000,avg:700000,max:900000,channels:0},
 
 // 기타
 {category:'기타',name:'전원 컨디셔너',min:800000,avg:1000000,max:1200000,channels:0},
 {category:'기타',name:'DI Box (Radial J48)',min:250000,avg:300000,max:350000,channels:0},
];

const equipDiv=document.getElementById('equipment');
const selectedList=document.getElementById('selected-list');
const minTotalEl=document.getElementById('minTotal');
const avgTotalEl=document.getElementById('avgTotal');
const maxTotalEl=document.getElementById('maxTotal');
const channelsEl=document.getElementById('channels');
const capsEl=document.getElementById('caps');

// Search and filter elements
const searchInput=document.getElementById('searchInput');
const categoryButtons=document.getElementById('categoryButtons');
const clearFiltersBtn=document.getElementById('clearFilters');

// Summary modal elements
const summaryBar = document.getElementById('summaryBar');
const summaryModal = document.getElementById('summaryModal');
const summaryContent = document.getElementById('summaryContent');
const summaryBackdrop = document.getElementById('summaryBackdrop');
const toggleSummary = document.getElementById('toggleSummary');
const toggleIcon = document.getElementById('toggleIcon');
const selectedCountEl = document.getElementById('selectedCount');
const avgTotalBarEl = document.getElementById('avgTotalBar');

// Filter state
let currentSearchTerm = '';
let selectedCategories = new Set();
let selectedItems = new Map(); // Track selected items with quantities: name -> {item, quantity}

// Edit mode state
let isEditMode = false;
const EDIT_PASSWORD = 'tamid2025';

// Password modal elements
const passwordModal = document.getElementById('passwordModal');
const passwordInput = document.getElementById('passwordInput');
const passwordSubmit = document.getElementById('passwordSubmit');
const passwordCancel = document.getElementById('passwordCancel');
const passwordError = document.getElementById('passwordError');
const editModeBtn = document.getElementById('editModeBtn');

function num(n){return n.toLocaleString();}

function createTableRow(item, tbody) {
  const tr = document.createElement('tr');
  tr.className = 'border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer';
  
  // Add click event to show detail modal
  tr.addEventListener('click', (e) => {
    // Don't open modal if clicking on checkbox, buttons, or quantity controls
    if (e.target.type === 'checkbox' || e.target.tagName === 'BUTTON' || e.target.closest('.quantity-controls')) {
      return;
    }
    openDetailModal(item);
  });
  
  // Checkbox cell
  const checkboxTd = document.createElement('td');
  checkboxTd.className = 'p-3 w-16 text-center';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.className = 'w-4 h-4 accent-emerald-600';
  checkboxTd.appendChild(cb);
  
  // Image thumbnail cell (NEW)
  const imgTd = document.createElement('td');
  imgTd.className = 'p-3 w-20 text-center';
  const imgEl = document.createElement('img');
  imgEl.src = item.img || 'images/Image placeholder portrait.png';
  imgEl.alt = item.name;
  imgEl.className = 'w-12 h-12 object-cover rounded-md mx-auto';
  imgTd.appendChild(imgEl);
  
  // Category cell
  const categoryTd = document.createElement('td');
  categoryTd.className = 'p-3 text-sm text-zinc-500 whitespace-nowrap';
  categoryTd.textContent = item.category;
  
  // Name cell
  const nameTd = document.createElement('td');
  nameTd.className = 'p-3 font-medium';
  nameTd.textContent = item.name;
  
  // Price cell
  const priceTd = document.createElement('td');
  priceTd.className = 'p-3 text-sm text-zinc-600 dark:text-zinc-400';
  priceTd.innerHTML = `₩${num(item.min)} ~ ₩${num(item.max)}<br><span class="text-emerald-600 font-medium">평균 ₩${num(item.avg)}</span>`;
  
  // Channels cell
  const channelsTd = document.createElement('td');
  channelsTd.className = 'p-3 text-sm text-center';
  channelsTd.textContent = item.channels || '-';
  
  // Quantity cell
  const quantityTd = document.createElement('td');
  quantityTd.className = 'p-3 w-32';
  const quantityContainer = document.createElement('div');
  quantityContainer.className = 'flex items-center gap-1 justify-center quantity-controls';
  quantityContainer.style.display = 'none';
  
  const decreaseBtn = document.createElement('button');
  decreaseBtn.type = 'button';
  decreaseBtn.innerHTML = '−';
  decreaseBtn.className = 'w-6 h-6 text-xs bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded flex items-center justify-center transition-colors';
  
  const quantityDisplay = document.createElement('span');
  quantityDisplay.className = 'w-8 text-xs text-center font-medium';
  quantityDisplay.textContent = '1';
  
  const increaseBtn = document.createElement('button');
  increaseBtn.type = 'button';
  increaseBtn.innerHTML = '+';
  increaseBtn.className = 'w-6 h-6 text-xs bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded flex items-center justify-center transition-colors';
  
  let currentQuantity = 1;
  
  const updateQuantity = (newQuantity) => {
    currentQuantity = Math.max(1, Math.min(99, newQuantity));
    quantityDisplay.textContent = currentQuantity;
    
    if (!cb.checked) {
      cb.checked = true;
    }
    
    selectedItems.set(item.name, {item, quantity: currentQuantity});
    updateSummary();
  };
  
  decreaseBtn.addEventListener('click', () => {
    updateQuantity(currentQuantity - 1);
  });
  
  increaseBtn.addEventListener('click', () => {
    updateQuantity(currentQuantity + 1);
  });
  
  cb.addEventListener('change', (e) => {
    if (e.target.checked) {
      quantityContainer.style.display = 'flex';
      selectedItems.set(item.name, {item, quantity: currentQuantity});
    } else {
      quantityContainer.style.display = 'none';
      selectedItems.delete(item.name);
    }
    updateSummary();
  });
  
  // Restore checkbox and quantity state
  if (selectedItems.has(item.name)) {
    const savedData = selectedItems.get(item.name);
    cb.checked = true;
    currentQuantity = savedData.quantity;
    quantityDisplay.textContent = currentQuantity;
    quantityContainer.style.display = 'flex';
  }
  
  quantityContainer.appendChild(decreaseBtn);
  quantityContainer.appendChild(quantityDisplay);
  quantityContainer.appendChild(increaseBtn);
  quantityTd.appendChild(quantityContainer);
  
  // Action cell (only in edit mode)
  const actionTd = document.createElement('td');
  actionTd.className = 'p-3 text-center';
  
  if (isEditMode) {
    actionTd.innerHTML = `
      <button data-idx='${data.indexOf(item)}' class='editItemBtn text-emerald-600 hover:underline text-xs mr-2'>수정</button>
      <button data-idx='${data.indexOf(item)}' class='deleteItemBtn text-red-600 hover:underline text-xs'>삭제</button>
    `;
  }
  
  tr.appendChild(checkboxTd);
  tr.appendChild(imgTd); // NEW: 이미지 셀 추가
  tr.appendChild(categoryTd);
  tr.appendChild(nameTd);
  tr.appendChild(priceTd);
  tr.appendChild(channelsTd);
  tr.appendChild(quantityTd);
  if (isEditMode) {
    tr.appendChild(actionTd);
  }
  
  tbody.appendChild(tr);
}

function renderEquipmentGrid(){
  equipDiv.innerHTML='';
  
  // Filter data based on search and category
  let filteredData = data.filter(item => {
    const matchesSearch = currentSearchTerm === '' || 
      item.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
      (item.maker && item.maker.toLowerCase().includes(currentSearchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategories.size === 0 || 
      selectedCategories.has(item.category);
    
    return matchesSearch && matchesCategory;
  });
  
  // Show message if no results
  if (filteredData.length === 0) {
    equipDiv.innerHTML = '<div class="text-center py-12 text-zinc-500"><p class="text-lg">검색 결과가 없습니다.</p><p class="text-sm mt-2">다른 검색어나 카테고리를 시도해보세요.</p></div>';
    return;
  }
  
  // Create table wrapper for horizontal scroll
  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'overflow-x-auto bg-white dark:bg-zinc-800 rounded-lg shadow-sm';
  
  // Create table
  const table = document.createElement('table');
  table.className = 'w-full min-w-[800px]';
  
  // Create table header
  const thead = document.createElement('thead');
  thead.className = 'bg-zinc-50 dark:bg-zinc-700';
  const headerRow = document.createElement('tr');
  
  const headers = ['선택', '이미지', '카테고리', '장비명', '가격', '채널', '수량'];
  if (isEditMode) {
    headers.push('작업');
  }
  
  headers.forEach(headerText => {
    const th = document.createElement('th');
    th.className = 'p-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300';
    if (headerText === '선택') th.className += ' w-16 text-center';
    if (headerText === '채널') th.className += ' text-center';
    if (headerText === '수량') th.className += ' text-center w-32';
    if (headerText === '카테고리') th.className += ' whitespace-nowrap';
    if (headerText === '작업') th.className += ' text-center w-24';
    if (headerText === '이미지') th.className += ' text-center w-20';
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create table body
  const tbody = document.createElement('tbody');
  filteredData.forEach(item => {
    createTableRow(item, tbody);
  });
  
  // Add event listeners for edit/delete buttons
  if (isEditMode) {
    tbody.querySelectorAll('.editItemBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        editItem(idx);
      });
    });
    
    tbody.querySelectorAll('.deleteItemBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        deleteProduct(idx);
      });
    });
  }
  
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  equipDiv.appendChild(tableWrapper);
  
  // Add button for adding new equipment in edit mode
  if (isEditMode) {
    const addButton = document.createElement('button');
    addButton.className = 'mt-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm';
    addButton.textContent = '+ 새 장비 추가';
    addButton.addEventListener('click', () => {
      manageOverlay.classList.remove('hidden');
      editingIndex = null;
      addForm.reset();
      imgPreview.classList.add('hidden');
      uploadedImgData = '';
      prodImgUrlInput.value = '';
      linksContainer.innerHTML = '';
      addLinkInput();
    });
    equipDiv.appendChild(addButton);
  }
}

function updateSummary(){
  let min=0,avg=0,max=0,totalInputChannels=0,totalOutputChannels=0,drumAble=false;
  selectedList.innerHTML='';
  
  // Update selected count in bottom bar
  selectedCountEl.textContent = selectedItems.size;
  
  selectedItems.forEach(({item, quantity}) => {
    const itemMin = item.min * quantity;
    const itemAvg = item.avg * quantity;
    const itemMax = item.max * quantity;
    const itemChannels = (item.channels || 0) * quantity;
    
    min += itemMin;
    avg += itemAvg;
    max += itemMax;
    
    // 입력 채널 계산 (마이크, 인터페이스, 프리앰프)
    if(['마이크', '인터페이스', '프리앰프'].includes(item.category)) {
      totalInputChannels += itemChannels;
    }
    
    // 출력 채널 계산 (스튜디오모니터)
    if(item.category === '스튜디오모니터') {
      totalOutputChannels += 2 * quantity; // 모니터는 보통 스테레오 페어
    }
    
    if(item.drum) drumAble=true;
    
    const li=document.createElement('li');
    li.className='flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded-md';
    li.innerHTML=`
      <span class="font-medium">${item.name} ${quantity > 1 ? `(${quantity}개)` : ''}</span>
      <span class="text-xs text-zinc-500">₩${num(itemAvg)}</span>
    `;
    selectedList.appendChild(li);
  });
  
  minTotalEl.textContent=num(min);
  avgTotalEl.textContent=num(avg);
  maxTotalEl.textContent=num(max);
  avgTotalBarEl.textContent=num(avg); // Update bottom bar average
  channelsEl.textContent=totalInputChannels;
  
  // 간소화된 캡스 메시지
  let capMsg='';
  if(totalInputChannels > 0) {
    capMsg += `최대 입력: ${totalInputChannels}채널`;
  }
  if(totalOutputChannels > 0) {
    if(capMsg) capMsg += '\n';
    capMsg += `최대 출력: ${totalOutputChannels}채널`;
  }
  if(drumAble) {
    if(capMsg) capMsg += '\n';
    capMsg += '드럼 세트 포함';
  }
  
  capsEl.textContent=capMsg.trim();
  
  // Show/hide summary bar based on selection
  if(selectedItems.size > 0) {
    summaryBar.classList.remove('translate-y-full');
  } else {
    summaryBar.classList.add('translate-y-full');
    closeSummaryModal();
  }
}

// Summary modal functions
function openSummaryModal() {
  summaryModal.classList.remove('hidden');
  setTimeout(() => {
    summaryContent.classList.remove('translate-y-full');
    toggleIcon.classList.add('rotate-180');
  }, 10);
}

function closeSummaryModal() {
  summaryContent.classList.add('translate-y-full');
  toggleIcon.classList.remove('rotate-180');
  setTimeout(() => {
    summaryModal.classList.add('hidden');
  }, 300);
}

// Toggle summary modal
toggleSummary?.addEventListener('click', () => {
  if(summaryModal.classList.contains('hidden')) {
    openSummaryModal();
  } else {
    closeSummaryModal();
  }
});

// Close modal when clicking backdrop
summaryBackdrop?.addEventListener('click', closeSummaryModal);

// Category buttons functions
function updateCategoryButtons() {
  // Get all unique categories from data
  const categories = [...new Set(data.map(item => item.category))].sort();
  
  // Define the order of categories
  const categoryOrder = [
    '컴퓨터',
    '소프트웨어',
    '인터페이스',
    '마이크',
    '프리앰프',
    '아웃보드',
    '스튜디오모니터',
    '모니터링',
    '악기',
    '가구',
    '액세서리',
    '기타'
  ];
  
  // Sort categories according to the defined order, and add any missing ones at the end
  const sortedCategories = [
    ...categoryOrder.filter(cat => categories.includes(cat)),
    ...categories.filter(cat => !categoryOrder.includes(cat))
  ];
  
  categoryButtons.innerHTML = '';
  
  // Add "All" button first
  const allButton = document.createElement('button');
  allButton.textContent = 'All';
  allButton.className = 'px-3 py-1.5 text-sm rounded-md border transition-colors';
  
  if(selectedCategories.size === 0) {
    allButton.className += ' bg-emerald-600 text-white border-emerald-600';
  } else {
    allButton.className += ' bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-emerald-500';
  }
  
  allButton.addEventListener('click', () => {
    selectedCategories.clear();
    updateCategoryButtons();
    renderEquipmentGrid();
  });
  
  categoryButtons.appendChild(allButton);
  
  // Add category buttons
  sortedCategories.forEach(category => {
    const button = document.createElement('button');
    button.textContent = category;
    button.className = 'px-3 py-1.5 text-sm rounded-md border transition-colors';
    
    if(selectedCategories.has(category)) {
      button.className += ' bg-emerald-600 text-white border-emerald-600';
    } else {
      button.className += ' bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-emerald-500';
    }
    
    button.addEventListener('click', () => {
      if(selectedCategories.has(category)) {
        selectedCategories.delete(category);
      } else {
        selectedCategories.add(category);
      }
      updateCategoryButtons();
      renderEquipmentGrid();
    });
    
    categoryButtons.appendChild(button);
  });
}

// Search functionality
searchInput?.addEventListener('input', (e) => {
  currentSearchTerm = e.target.value.trim();
  renderEquipmentGrid();
});

// Clear filters
clearFiltersBtn?.addEventListener('click', () => {
  currentSearchTerm = '';
  selectedCategories.clear();
  searchInput.value = '';
  updateCategoryButtons();
  renderEquipmentGrid();
});

// 다크모드 토글
const toggle=document.getElementById('themeToggle');
const root=document.documentElement;
if(toggle) toggle.addEventListener('click',()=>{root.classList.toggle('dark');});

// ---------- Manage Overlay Elements ----------
const manageOverlay=document.getElementById('manageOverlay');
const closeManage=document.getElementById('closeManage');
if(closeManage){closeManage.addEventListener('click',()=>{manageOverlay.classList.add('hidden');});}

// ---------- Add Product Form ----------
const addForm=document.getElementById('addProductForm');
const prodMinI=document.getElementById('prodMin');
const prodMaxI=document.getElementById('prodMax');
const prodAvgI=document.getElementById('prodAvg');
function calcAvg(){const min=parseInt(prodMinI.value)||0;const max=parseInt(prodMaxI.value)||0;prodAvgI.value=min&&max?Math.round((min+max)/2):'';}
prodMinI?.addEventListener('input',calcAvg);prodMaxI?.addEventListener('input',calcAvg);

const linksContainer=document.getElementById('linksContainer');
const addLinkField=document.getElementById('addLinkField');
function addLinkInput(){if(linksContainer.childElementCount>=5)return;const inp=document.createElement('input');inp.type='url';inp.placeholder='https://example.com';inp.className='w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-sm';linksContainer.appendChild(inp);} 
if(addLinkField)addLinkField.addEventListener('click',addLinkInput); 
addLinkInput();

const prodImgInput=document.getElementById('prodImg');
const prodImgUrlInput=document.getElementById('prodImgUrl');
const imgPreview=document.getElementById('imgPreview');
let uploadedImgData='';

// Handle image URL input
prodImgUrlInput?.addEventListener('input', e => {
  const url = e.target.value.trim();
  if(url) {
    uploadedImgData = url;
    imgPreview.src = url;
    imgPreview.classList.remove('hidden');
    imgPreview.style.opacity = '1';
    // Clear file input when URL is entered
    if(prodImgInput) prodImgInput.value = '';
    console.log('Image URL set:', url);
  } else {
    if(!prodImgInput.files?.length) {
      uploadedImgData = '';
      imgPreview.classList.add('hidden');
    }
  }
});

// Handle image file upload
prodImgInput?.addEventListener('change', async e=>{
  const file=e.target.files[0];
  if(file){
    try {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert('지원하지 않는 이미지 형식입니다. PNG, JPEG, WebP, GIF만 가능합니다.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기가 너무 큽니다. 5MB 이하의 이미지를 선택해주세요.');
        return;
      }
      
      // Show loading state
      imgPreview.src = '';
      imgPreview.classList.remove('hidden');
      imgPreview.style.opacity = '0.5';
      
      // Try to upload to Supabase Storage first
      try {
        const publicUrl = await uploadImageToStorage(file);
        uploadedImgData = publicUrl;
        imgPreview.src = publicUrl;
        imgPreview.style.opacity = '1';
        console.log('Image uploaded to Supabase:', publicUrl);
      } catch (storageError) {
        console.warn('Supabase Storage upload failed, using base64 fallback:', storageError);
        
        // Fallback to base64 encoding
        const reader = new FileReader();
        reader.onload = (ev) => {
          uploadedImgData = ev.target.result;
          imgPreview.src = uploadedImgData;
          imgPreview.style.opacity = '1';
          console.log('Image stored as base64');
        };
        reader.readAsDataURL(file);
      }
      
      // Clear URL input when file is uploaded
      if(prodImgUrlInput) prodImgUrlInput.value = '';
      
    } catch (error) {
      console.error('Error processing image:', error);
      alert('이미지 처리 중 오류가 발생했습니다: ' + error.message);
      imgPreview.classList.add('hidden');
      uploadedImgData = '';
    }
  }else{
    if(!prodImgUrlInput?.value) {
      uploadedImgData='';
      imgPreview.classList.add('hidden');
    }
  }
});

let editingIndex=null;

addForm?.addEventListener('submit', async e=>{
  e.preventDefault();
  const itemData={
    category:document.getElementById('prodCategory').value||'기타',
    name:document.getElementById('prodName').value.trim(),
    maker:document.getElementById('prodMaker').value.trim(),
    min:Number(prodMinI.value),
    max:Number(prodMaxI.value),
    avg:Number(prodAvgI.value)||Math.round((Number(prodMinI.value)+Number(prodMaxI.value))/2),
    channels:Number(document.getElementById('prodChannels').value)||0,
    drum:document.getElementById('prodDrum').checked||false,
    img:uploadedImgData||'',
    desc:document.getElementById('prodDesc').value.trim(),
    links:Array.from(linksContainer.querySelectorAll('input')).map(i=>i.value).filter(v=>v)
  };
  
  let msg='';
  try {
    if(editingIndex===null){
      // Add new item
      itemData.id = await saveToSupabase(itemData);
      data.push(itemData);
      msg='제품이 추가되었습니다!';
    }else{
      // Update existing item
      itemData.id = data[editingIndex].id;
      await saveToSupabase(itemData);
      data[editingIndex]=itemData;
      msg='제품이 수정되었습니다!';
    }
    
    // reset form
    addForm.reset();
    imgPreview.classList.add('hidden');
    uploadedImgData=''; 
    prodImgUrlInput.value = '';
    linksContainer.innerHTML=''; 
    addLinkInput();
    editingIndex=null; // Fix: reset editing state
    updateCategoryButtons();
    renderEquipmentGrid();
    updateSummary();
    manageOverlay.classList.add('hidden');
    alert(msg);
  } catch (error) {
    console.error('Error saving item:', error);
    alert('저장 중 오류가 발생했습니다.');
  }
});

// Delete product function
async function deleteProduct(index) {
  if(confirm('정말로 이 제품을 삭제하시겠습니까?')) {
    try {
      const item = data[index];
      if(item.id) {
        await deleteFromSupabase(item.id);
      }
      data.splice(index, 1);
      updateCategoryButtons();
      renderEquipmentGrid();
      updateSummary();
      alert('제품이 삭제되었습니다!');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  }
}

// Detail Modal Functions
const detailModal=document.getElementById('detailModal');
const closeDetail=document.getElementById('closeDetail');
const detailContent=document.getElementById('detailContent');
closeDetail?.addEventListener('click',()=>{detailModal.classList.add('hidden');});

function openDetailModal(item){
  detailContent.innerHTML=`
    <div class="space-y-4">
      ${item.img ? `<img src="${item.img}" alt="${item.name}" class="w-full max-w-md mx-auto rounded-lg object-cover" onerror="this.style.display='none'">` : ''}
      <h3 class='text-2xl font-bold'>${item.name}</h3>
      ${item.maker?`<p class='text-lg text-zinc-500'>제조사: ${item.maker}</p>`:''}
      <div class="grid grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
        <div class="text-center">
          <p class="text-sm text-zinc-500">최저가</p>
          <p class="text-lg font-semibold">₩${num(item.min)}</p>
        </div>
        <div class="text-center">
          <p class="text-sm text-zinc-500">평균가</p>
          <p class="text-lg font-semibold text-emerald-600">₩${num(item.avg)}</p>
        </div>
        <div class="text-center">
          <p class="text-sm text-zinc-500">최고가</p>
          <p class="text-lg font-semibold">₩${num(item.max)}</p>
        </div>
      </div>
      <div class="flex gap-4">
        <span class="inline-block px-3 py-1 bg-zinc-200 dark:bg-zinc-700 rounded-full text-sm">카테고리: ${item.category}</span>
        ${item.channels ? `<span class="inline-block px-3 py-1 bg-zinc-200 dark:bg-zinc-700 rounded-full text-sm">채널: ${item.channels}</span>` : ''}
        ${item.drum ? '<span class="inline-block px-3 py-1 bg-emerald-200 dark:bg-emerald-700 rounded-full text-sm">드럼 세트 포함</span>' : ''}
      </div>
      ${item.desc ? `<div class="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg"><p class='whitespace-pre-wrap text-sm leading-relaxed'>${item.desc}</p></div>` : ''}
      ${(item.links && item.links.length) ? `
        <div class='mt-4'>
          <h4 class="font-semibold mb-2">구매 링크</h4>
          <div class='space-y-1'>
            ${item.links.map(l => `<a href='${l}' target='_blank' class='text-emerald-600 hover:underline text-sm block'>🔗 ${new URL(l).hostname}</a>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
  detailModal.classList.remove('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize summary bar as hidden
  summaryBar.classList.add('translate-y-full');
  
  // Initialize data from Supabase
  initializeData();
});

// Share button functionality
const shareBtn = document.getElementById('shareBtn');
shareBtn?.addEventListener('click', () => {
  const selectedItemsList = Array.from(selectedItems.entries()).map(([name, {item, quantity}]) => {
    return `${item.name}${quantity > 1 ? ` (${quantity}개)` : ''}: ₩${num(item.avg * quantity)}`;
  }).join('\n');
  
  const shareText = `스튜디오 장비 견적\n\n${selectedItemsList}\n\n총 평균가: ₩${avgTotalEl.textContent}`;
  
  if(navigator.share) {
    navigator.share({
      title: '스튜디오 장비 견적',
      text: shareText
    });
  } else {
    navigator.clipboard.writeText(shareText);
    alert('견적이 클립보드에 복사되었습니다!');
  }
});

// Reset data function
async function resetToDefaultData() {
  if(confirm('모든 장비 데이터를 기본값으로 초기화하시겠습니까? 추가/수정한 모든 데이터가 삭제됩니다.')) {
    try {
      // Delete all existing data from Supabase
      const { error: deleteError } = await supabase
        .from('studio_equipment')
        .delete()
        .neq('id', 0); // Delete all rows
      
      if (deleteError) throw deleteError;
      
      // Insert default data
      data = [];
      for (const item of defaultData) {
        const id = await saveToSupabase(item);
        data.push({...item, id});
      }
      
      // Clear selected items
      selectedItems.clear();
      
      // Update UI
      updateCategoryButtons();
      renderEquipmentGrid();
      updateSummary();
      
      alert('데이터가 기본값으로 초기화되었습니다!');
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('초기화 중 오류가 발생했습니다.');
    }
  }
}

// Edit mode functionality
editModeBtn?.addEventListener('click', () => {
  if (!isEditMode) {
    // Show password modal
    passwordModal.classList.remove('hidden');
    passwordInput.value = '';
    passwordError.classList.add('hidden');
    passwordInput.focus();
  } else {
    // Exit edit mode
    isEditMode = false;
    editModeBtn.textContent = '수정 모드';
    editModeBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
    editModeBtn.classList.add('bg-zinc-600', 'hover:bg-zinc-700');
    renderEquipmentGrid();
  }
});

// Password submission
passwordSubmit?.addEventListener('click', () => {
  if (passwordInput.value === EDIT_PASSWORD) {
    isEditMode = true;
    passwordModal.classList.add('hidden');
    editModeBtn.textContent = '수정 모드 종료';
    editModeBtn.classList.remove('bg-zinc-600', 'hover:bg-zinc-700');
    editModeBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
    renderEquipmentGrid();
  } else {
    passwordError.classList.remove('hidden');
  }
});

passwordCancel?.addEventListener('click', () => {
  passwordModal.classList.add('hidden');
});

// Enter key support for password input
passwordInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    passwordSubmit.click();
  }
});

// Edit item function
function editItem(index) {
  const item = data[index];
  editingIndex = index;
  
  // Fill form
  document.getElementById('prodName').value = item.name;
  document.getElementById('prodMaker').value = item.maker || '';
  document.getElementById('prodCategory').value = item.category || '기타';
  prodMinI.value = item.min;
  prodMaxI.value = item.max;
  calcAvg();
  document.getElementById('prodChannels').value = item.channels || 0;
  document.getElementById('prodDrum').checked = !!item.drum;
  document.getElementById('prodDesc').value = item.desc || '';
  uploadedImgData = item.img || '';
  
  // Handle image display
  if (uploadedImgData) {
    imgPreview.src = uploadedImgData;
    imgPreview.classList.remove('hidden');
    // If it's a URL, show it in the URL input
    if (uploadedImgData.startsWith('http')) {
      prodImgUrlInput.value = uploadedImgData;
    }
  } else {
    imgPreview.classList.add('hidden');
    prodImgUrlInput.value = '';
  }
  
  linksContainer.innerHTML = '';
  (item.links || []).forEach(l => {
    addLinkInput();
    linksContainer.lastChild.value = l;
  });
  if (linksContainer.childElementCount === 0) addLinkInput();
  
  manageOverlay.classList.remove('hidden');
  manageOverlay.scrollTop = 0;
}