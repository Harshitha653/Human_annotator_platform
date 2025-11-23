// admin_api.js
// depends on auth.js

async function loadFolders() {
  const res = await Auth.fetchWithAuth('/api/admin/folders');
  if (!res.ok) return;
  const j = await res.json();
  const dd = document.getElementById('folderDropdown');
  dd.innerHTML = '<option value="">-- select existing --</option>';
  (j.folders||[]).forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    dd.appendChild(opt);
  });
}

function previewFiles() {
  const files = document.getElementById('fileInput').files;
  const preview = document.getElementById('filePreview');
  preview.innerHTML = '';
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = '80px';
        img.style.borderRadius = '6px';
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    } else {
      const div = document.createElement('div');
      div.textContent = `📁 ${file.name}`;
      preview.appendChild(div);
    }
  }
}

document.getElementById('uploadForm').onsubmit = async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const newFolder = formData.get('new_folder');
  if (newFolder) formData.set('folder', newFolder);

  try {
    const resp = await Auth.fetchWithAuth('/api/admin/upload', { method: 'POST', body: formData });
    const j = await resp.json();
    if (j.ok) {
      showToast(`✅ ${j.message}`);
      form.reset();
      document.getElementById('filePreview').innerHTML = '';
      await loadFolders();
      await updateDashboard();
      await loadDatasetsList();
    } else {
      showToast(`❌ ${j.error}`, false);
    }
  } catch (err) {
    console.error(err);
    showToast('⚠️ Upload failed', false);
  }
};

async function updateDashboard() {
  const res = await Auth.fetchWithAuth('/api/admin/dashboard');
  if (!res.ok) return;
  const data = await res.json();
  const dashboard = document.getElementById('dashboardStats');
  dashboard.innerHTML = '';
  (data||[]).forEach(d => {
    const div = document.createElement('div');
    div.className = 'card-mini';
    div.innerHTML = `<strong>${d.dataset}</strong><div>${d.count} files</div><div class="muted">${d.size_est}</div>`;
    dashboard.appendChild(div);
  });
}

async function loadDatasetsList() {
  const res = await Auth.fetchWithAuth('/api/datasets/list');
  if (!res.ok) return;
  const j = await res.json();
  const el = document.getElementById('datasetList');
  if (!el) return;
  el.innerHTML = '';
  (j.datasets||[]).forEach(ds => {
    const d = document.createElement('div');
    d.textContent = `${ds.dataset_name} — ${ds.item_count} items`;
    el.appendChild(d);
  });
}

function showCreateUser() {
  document.getElementById('createUserForm').style.display = 'block';
}

async function createUser() {
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value;
  const role = document.getElementById('newRole').value;
  if (!username || !password) {
    document.getElementById('createUserMsg').textContent = "Fill both fields";
    return;
  }
  try {
    const res = await Auth.fetchWithAuth('/api/auth/register', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({username, password, role})
    });
    const j = await res.json();
    if (j.ok) {
      document.getElementById('createUserMsg').textContent = "User created";
      document.getElementById('newUsername').value = '';
      document.getElementById('newPassword').value = '';
      await loadFolders();
    } else {
      document.getElementById('createUserMsg').textContent = j.error || 'Error';
    }
  } catch (err) {
    console.error(err);
    document.getElementById('createUserMsg').textContent = 'Error creating user';
  }
}

function showToast(message, success=true) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.style.backgroundColor = success ? '#2ecc71' : '#e74c3c';
  t.className = 'toast show';
  setTimeout(()=> t.className = t.className.replace('show',''), 3000);
}

window.onload = async () => {
  // show admin actions if role is admin
  const user = Auth.getUser();
  if (user && user.role === 'admin') {
    document.getElementById('admin-actions').style.display = 'block';
  }
  await loadFolders();
  await updateDashboard();
  await loadDatasetsList();
};
