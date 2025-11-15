import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyCTWg_Hq-TQe3SRwHOj5hVwb9S8gX5glZk",
  authDomain: "jamiat-16eb0.firebaseapp.com",
  projectId: "jamiat-16eb0",
  storageBucket: "jamiat-16eb0.firebasestorage.app",
  messagingSenderId: "1014125063682",
  appId: "1:1014125063682:web:1ba1b165f92c4fea3c3cee"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let messages = [];
let programs = [];
let members = [];
let attendance = [];
let deleteTarget = null;

function showLoading(show = true) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    if (show) {
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  }
}

function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    font-weight: 600;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn, .mobile-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
}

function openModal(modalId) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById(modalId);
  if (overlay && modal) {
    overlay.classList.add('active');
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById(modalId);
  if (overlay && modal) {
    overlay.classList.remove('active');
    modal.classList.remove('active');
    if (modalId !== 'delete-modal') {
      const form = document.getElementById(`${modalId.replace('-modal', '-form')}`);
      if (form) {
        form.reset();
        clearImagePreviews();
      }
    }
  }
}

function clearImagePreviews() {
  const previewContainers = [
    'message-image-preview',
    'program-featured-preview',
    'program-gallery-preview'
  ];
  previewContainers.forEach(id => {
    const container = document.getElementById(id);
    if (container) container.innerHTML = '';
  });
}

function setupImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  
  if (!input || !preview) return;
  
  input.addEventListener('change', (e) => {
    preview.innerHTML = '';
    const files = e.target.files;
    
    if (files.length === 0) return;
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.createElement('img');
          img.src = e.target.result;
          preview.appendChild(img);
        };
        reader.readAsDataURL(file);
      }
    });
  });
}

async function uploadImage(file, path) {
  try {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${safeName}`;
    const storageRef = ref(storage, `${path}/${filename}`);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch (error) {
    return dateString;
  }
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMessages() {
  const container = document.getElementById('messages-list');
  if (!container) return;
  
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 72px; height: 72px; margin: 0 auto 20px;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>
        <h3>No messages yet</h3>
        <p>Be the first to share a message with the community</p>
        <button class="btn-primary" onclick="openModal('message-modal')">Post First Message</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = messages.map(msg => `
    <div class="card" data-testid="card-message-${msg.id}">
      <button class="delete-btn" onclick="confirmDelete('message', '${msg.id}', '${escapeHtml(msg.title)}')" data-testid="button-delete-message-${msg.id}">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
      <div class="card-header">
        <h3 class="card-title" data-testid="text-message-title">${escapeHtml(msg.title)}</h3>
      </div>
      <div class="card-content" data-testid="text-message-content">${escapeHtml(msg.content)}</div>
      ${msg.images && msg.images.length > 0 ? `
        <div class="images-grid">
          ${msg.images.map(url => `<img src="${url}" alt="Message image" loading="lazy">`).join('')}
        </div>
      ` : ''}
      <div class="card-meta">
        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span data-testid="text-message-date">${formatDate(msg.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

function renderPrograms() {
  const container = document.getElementById('programs-list');
  if (!container) return;
  
  if (programs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 72px; height: 72px; margin: 0 auto 20px;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <h3>No programs yet</h3>
        <p>Start documenting your weekly programs and events</p>
        <button class="btn-primary" onclick="openModal('program-modal')">Add First Program</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = programs.map(prog => `
    <div class="card" data-testid="card-program-${prog.id}">
      <button class="delete-btn" onclick="confirmDelete('program', '${prog.id}', '${escapeHtml(prog.title)}')" data-testid="button-delete-program-${prog.id}">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
      ${prog.featuredImage ? `
        <img src="${prog.featuredImage}" 
             style="width:100%;height:200px;object-fit:cover;border-radius:8px;margin-bottom:16px;" 
             alt="${escapeHtml(prog.title)}"
             loading="lazy">
      ` : ''}
      <div class="card-header">
        <h3 class="card-title" data-testid="text-program-title">${escapeHtml(prog.title)}</h3>
      </div>
      ${prog.isUpcoming ? 
        '<span class="badge badge-primary" data-testid="badge-upcoming">Upcoming</span>' : 
        '<span class="badge badge-secondary" data-testid="badge-completed">Completed</span>'
      }
      <div class="card-content" data-testid="text-program-description">${escapeHtml(prog.description)}</div>
      <div class="card-meta">
        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <span data-testid="text-program-location">${escapeHtml(prog.location)}</span>
        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span data-testid="text-program-date">${formatDate(prog.date)}</span>
      </div>
      ${prog.galleryImages && prog.galleryImages.length > 0 ? `
        <div class="images-grid">
          ${prog.galleryImages.map(url => `<img src="${url}" alt="Program gallery" loading="lazy">`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

function renderMembers() {
  const container = document.getElementById('members-list');
  if (!container) return;
  
  if (members.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 72px; height: 72px; margin: 0 auto 20px;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <h3>No members yet</h3>
        <p>Add members to start tracking attendance</p>
        <button class="btn-primary" onclick="openModal('member-modal')">Add First Member</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `<div class="members-grid">${members.map(member => {
    const memberAttendance = attendance.filter(a => a.memberId === member.id).length;
    const totalPrograms = programs.filter(p => !p.isUpcoming).length;
    const attendanceRate = totalPrograms > 0 ? Math.round((memberAttendance / totalPrograms) * 100) : 0;
    
    return `
      <div class="card member-card" data-testid="card-member-${member.id}">
        <button class="delete-btn" onclick="confirmDelete('member', '${member.id}', '${escapeHtml(member.name)}')" data-testid="button-delete-member-${member.id}">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
        <div class="member-avatar" data-testid="text-member-initials">${getInitials(member.name)}</div>
        <h3 class="card-title" data-testid="text-member-name">${escapeHtml(member.name)}</h3>
        <div class="card-meta">
          <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
          </svg>
          <span data-testid="text-member-phone">${escapeHtml(member.phone)}</span>
        </div>
        ${member.email ? `
          <div class="card-meta">
            <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <span data-testid="text-member-email">${escapeHtml(member.email)}</span>
          </div>
        ` : ''}
        <div style="margin-top:16px;">
          <span class="badge ${attendanceRate >= 70 ? 'badge-success' : attendanceRate >= 40 ? 'badge-warning' : 'badge-danger'}" data-testid="badge-attendance-rate">
            ${attendanceRate}% Attendance
          </span>
          <div class="card-meta" data-testid="text-attendance-stats">${memberAttendance} / ${totalPrograms} programs</div>
        </div>
      </div>
    `;
  }).join('')}</div>`;
}

function updateAttendanceModal() {
  const programSelect = document.getElementById('program-select');
  const checklist = document.getElementById('members-checklist');
  
  if (!programSelect || !checklist) return;
  
  programSelect.innerHTML = '<option value="">Choose a program...</option>' + 
    programs.map(p => `<option value="${p.id}">${escapeHtml(p.title)} - ${formatDate(p.date)}</option>`).join('');
  
  checklist.innerHTML = members.map(m => `
    <div class="checkbox-item">
      <input type="checkbox" name="members" value="${m.id}" id="member-${m.id}">
      <label for="member-${m.id}">${escapeHtml(m.name)}</label>
    </div>
  `).join('');
}

function confirmDelete(type, id, name) {
  deleteTarget = { type, id };
  const deleteMessage = document.getElementById('delete-message');
  if (deleteMessage) {
    deleteMessage.textContent = `Are you sure you want to delete "${name}"? This action cannot be undone.`;
  }
  openModal('delete-modal');
}

async function performDelete() {
  if (!deleteTarget) return;
  
  const { type, id } = deleteTarget;
  
  try {
    showLoading(true);
    
    if (type === 'message') {
      const messageDoc = await getDoc(doc(db, 'messages', id));
      const messageData = messageDoc.data();
      
      if (messageData?.images) {
        for (const imageUrl of messageData.images) {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.warn('Could not delete image:', error);
          }
        }
      }
      
      await deleteDoc(doc(db, 'messages', id));
      showNotification('Message deleted successfully', 'success');
    } else if (type === 'program') {
      const programDoc = await getDoc(doc(db, 'programs', id));
      const programData = programDoc.data();
      
      if (programData?.featuredImage) {
        try {
          await deleteObject(ref(storage, programData.featuredImage));
        } catch (error) {
          console.warn('Could not delete featured image:', error);
        }
      }
      
      if (programData?.galleryImages) {
        for (const imageUrl of programData.galleryImages) {
          try {
            await deleteObject(ref(storage, imageUrl));
          } catch (error) {
            console.warn('Could not delete gallery image:', error);
          }
        }
      }
      
      await deleteDoc(doc(db, 'programs', id));
      showNotification('Program deleted successfully', 'success');
    } else if (type === 'member') {
      await deleteDoc(doc(db, 'members', id));
      showNotification('Member deleted successfully', 'success');
    } else if (type === 'attendance') {
      await deleteDoc(doc(db, 'attendance', id));
      showNotification('Attendance record deleted successfully', 'success');
    }
    
    closeModal('delete-modal');
    deleteTarget = null;
  } catch (error) {
    console.error('Delete failed:', error);
    showNotification('Failed to delete. Please try again.', 'error');
  } finally {
    showLoading(false);
  }
}

onSnapshot(
  query(collection(db, 'messages'), orderBy('createdAt', 'desc')), 
  (snapshot) => {
    messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMessages();
  },
  (error) => {
    console.error('Error loading messages:', error);
    showNotification('Error loading messages', 'error');
  }
);

onSnapshot(
  query(collection(db, 'programs'), orderBy('date', 'desc')), 
  (snapshot) => {
    programs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        isUpcoming: new Date(data.date) > new Date()
      };
    });
    renderPrograms();
    updateAttendanceModal();
  },
  (error) => {
    console.error('Error loading programs:', error);
    showNotification('Error loading programs', 'error');
  }
);

onSnapshot(
  query(collection(db, 'members'), orderBy('name')), 
  (snapshot) => {
    members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMembers();
    updateAttendanceModal();
  },
  (error) => {
    console.error('Error loading members:', error);
    showNotification('Error loading members', 'error');
  }
);

onSnapshot(
  query(collection(db, 'attendance'), orderBy('createdAt', 'desc')), 
  (snapshot) => {
    attendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMembers();
  },
  (error) => {
    console.error('Error loading attendance:', error);
    showNotification('Error loading attendance', 'error');
  }
);

document.querySelectorAll('.tab-btn, .mobile-tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.modal');
    if (modal) {
      closeModal(modal.id);
    }
  });
});

const modalOverlay = document.getElementById('modal-overlay');
if (modalOverlay) {
  modalOverlay.addEventListener('click', () => {
    document.querySelectorAll('.modal.active').forEach(modal => {
      closeModal(modal.id);
    });
  });
}

const addMessageBtn = document.getElementById('add-message-btn');
if (addMessageBtn) {
  addMessageBtn.addEventListener('click', () => openModal('message-modal'));
}

const addProgramBtn = document.getElementById('add-program-btn');
if (addProgramBtn) {
  addProgramBtn.addEventListener('click', () => openModal('program-modal'));
}

const addMemberBtn = document.getElementById('add-member-btn');
if (addMemberBtn) {
  addMemberBtn.addEventListener('click', () => openModal('member-modal'));
}

const markAttendanceBtn = document.getElementById('mark-attendance-btn');
if (markAttendanceBtn) {
  markAttendanceBtn.addEventListener('click', () => openModal('attendance-modal'));
}

const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', performDelete);
}

setupImagePreview('message-images', 'message-image-preview');
setupImagePreview('program-featured-image', 'program-featured-preview');
setupImagePreview('program-gallery-images', 'program-gallery-preview');

const messageForm = document.getElementById('message-form');
if (messageForm) {
  messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      showLoading(true);
      const images = [];
      
      const files = formData.getAll('images');
      for (const file of files) {
        if (file && file.size > 0) {
          const url = await uploadImage(file, 'messages');
          images.push(url);
        }
      }
      
      await addDoc(collection(db, 'messages'), {
        title: formData.get('title'),
        content: formData.get('content'),
        images,
        createdAt: new Date().toISOString()
      });
      
      closeModal('message-modal');
      showNotification('Message added successfully!', 'success');
    } catch (error) {
      console.error('Error adding message:', error);
      showNotification('Failed to add message. Please try again.', 'error');
    } finally {
      showLoading(false);
    }
  });
}

const programForm = document.getElementById('program-form');
if (programForm) {
  programForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      showLoading(true);
      
      let featuredImage = null;
      const featuredFile = formData.get('featuredImage');
      if (featuredFile && featuredFile.size > 0) {
        featuredImage = await uploadImage(featuredFile, 'programs/featured');
      }
      
      const galleryImages = [];
      const galleryFiles = formData.getAll('galleryImages');
      for (const file of galleryFiles) {
        if (file && file.size > 0) {
          const url = await uploadImage(file, 'programs/gallery');
          galleryImages.push(url);
        }
      }
      
      await addDoc(collection(db, 'programs'), {
        title: formData.get('title'),
        description: formData.get('description'),
        date: new Date(formData.get('date')).toISOString(),
        location: formData.get('location'),
        featuredImage,
        galleryImages,
        createdAt: new Date().toISOString()
      });
      
      closeModal('program-modal');
      showNotification('Program added successfully!', 'success');
    } catch (error) {
      console.error('Error adding program:', error);
      showNotification('Failed to add program. Please try again.', 'error');
    } finally {
      showLoading(false);
    }
  });
}

const memberForm = document.getElementById('member-form');
if (memberForm) {
  memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      showLoading(true);
      
      await addDoc(collection(db, 'members'), {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email') || null
      });
      
      closeModal('member-modal');
      showNotification('Member added successfully!', 'success');
    } catch (error) {
      console.error('Error adding member:', error);
      showNotification('Failed to add member. Please try again.', 'error');
    } finally {
      showLoading(false);
    }
  });
}

const attendanceForm = document.getElementById('attendance-form');
if (attendanceForm) {
  attendanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const programId = formData.get('program');
    const selectedMembers = Array.from(document.querySelectorAll('input[name="members"]:checked')).map(cb => cb.value);
    
    if (!programId || selectedMembers.length === 0) {
      showNotification('Please select a program and at least one member', 'error');
      return;
    }
    
    try {
      showLoading(true);
      
      const program = programs.find(p => p.id === programId);
      
      for (const memberId of selectedMembers) {
        const member = members.find(m => m.id === memberId);
        await addDoc(collection(db, 'attendance'), {
          programId,
          memberId,
          programTitle: program.title,
          memberName: member.name,
          date: program.date,
          createdAt: new Date().toISOString()
        });
      }
      
      closeModal('attendance-modal');
      showNotification(`Attendance marked for ${selectedMembers.length} member(s)!`, 'success');
    } catch (error) {
      console.error('Error marking attendance:', error);
      showNotification('Failed to mark attendance. Please try again.', 'error');
    } finally {
      showLoading(false);
    }
  });
}

window.openModal = openModal;
window.closeModal = closeModal;
window.confirmDelete = confirmDelete;

console.log('Jamiat Bahawalpur Portal initialized successfully!');
console.log('Firebase connected. Real-time sync active.');
