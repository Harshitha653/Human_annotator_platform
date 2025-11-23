// annotation_api.js (uses auth.js)
let items = [];
let currentIndex = 0;

async function loadItems() {
  try {
    const res = await Auth.fetchWithAuth('/api/items');
    if (!res.ok) {
      console.error("loadItems failed", res.status);
      return;
    }
    const arr = await res.json();
    const list = document.getElementById('dataList');
    const prevCount = items.length;
    items = arr || [];
    list.innerHTML = '';
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.textContent = it.filename + (it.folder ? (' · ' + it.folder) : '');
      li.onclick = () => showItem(i);
      if ((it.annotations_count || 0) > 0) {
        li.style.opacity = 0.7;
      }
      list.appendChild(li);
    });
    if (items.length > 0) showItem(Math.min(currentIndex, items.length - 1));
    if (items.length > prevCount) showToast(`📥 ${items.length - prevCount} new file(s) loaded`);
  } catch (e) {
    console.error(e);
  }
}

function showItem(index) {
  currentIndex = index;
  const it = items[index];
  const box = document.getElementById('previewBox');
  box.innerHTML = '';
  if (!it) return;

  if (it.file_type === 'image' || it.file_type === 'mixed') {
    const p = it.url;
    const img = document.createElement('img');
    img.src = p;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '600px';
    img.style.objectFit = 'contain';
    box.appendChild(img);
  } else if (it.file_type === 'text') {
    if (it.content) {
      const pre = document.createElement('pre');
      pre.textContent = it.content;
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordBreak = 'break-word';
      box.appendChild(pre);
    } else if (it.url) {
      fetch(it.url).then(r => r.text()).then(txt => {
        const pre = document.createElement('pre');
        pre.textContent = txt;
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.wordBreak = 'break-word';
        box.appendChild(pre);
      });
    } else {
      box.textContent = "No preview available.";
    }
  } else if (it.file_type === 'audio') {
    const a = document.createElement('audio');
    a.controls = true;
    a.src = it.url;
    box.appendChild(a);
  } else if (it.file_type === 'video') {
    const v = document.createElement('video');
    v.controls = true;
    v.src = it.url;
    v.style.maxWidth = '100%';
    box.appendChild(v);
  } else {
    box.textContent = "Preview not available for this file type.";
  }
}

function nextItem() {
  if (currentIndex < items.length - 1) showItem(currentIndex + 1);
}
function prevItem() {
  if (currentIndex > 0) showItem(currentIndex - 1);
}

async function saveLabel() {
  const dataset = document.getElementById('datasetName').value.trim();
  const label = document.getElementById('labelInput').value.trim();
  const annotator = document.getElementById('annotator').value.trim() || (Auth.getUser() && Auth.getUser().username) || 'anonymous';

  if (!dataset || !label) { showToast('Fill dataset and label', false); return; }
  if (!items[currentIndex]) { showToast('No item selected', false); return; }

  const payload = { file_id: items[currentIndex]._id, dataset: dataset, label: label, annotator: annotator };

  try {
    const res = await Auth.fetchWithAuth('/api/annotation/save', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const j = await res.json();
    if (j.ok) {
      showToast(`✅ ${j.message}`);
      document.getElementById('datasetName').value = '';
      document.getElementById('labelInput').value = '';
      await loadItems();
      await updateProgress();
      nextItem();
    } else {
      showToast(`❌ ${j.error}`, false);
    }
  } catch (err) {
    console.error(err);
    showToast('⚠️ Save failed', false);
  }
}

async function updateProgress() {
  const res = await Auth.fetchWithAuth('/api/stats/progress');
  if (!res.ok) return;
  const j = await res.json();
  console.log('progress', j);
}

function showToast(message, success=true) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.style.backgroundColor = success ? '#2ecc71' : '#e74c3c';
  t.className = 'toast show';
  setTimeout(()=> t.className = t.className.replace('show',''), 3000);
}

window.onload = () => {
  loadItems();
  setInterval(loadItems, 20000);
};
