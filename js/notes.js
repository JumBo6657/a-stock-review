/**
 * 复盘笔记模块
 */

let currentNoteId = null;

function initNotes() {
    const newBtn = document.getElementById('newNote');
    const saveBtn = document.getElementById('saveNote');
    const deleteBtn = document.getElementById('deleteNote');
    
    if (newBtn) newBtn.addEventListener('click', createNewNote);
    if (saveBtn) saveBtn.addEventListener('click', saveNote);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteNote);
    
    renderNotesList();
    
    // 如果有笔记，加载第一个
    if (AppState.notes.length > 0) {
        loadNote(0);
    }
}

function createNewNote() {
    currentNoteId = null;
    
    const titleInput = document.getElementById('noteTitle');
    const dateInput = document.getElementById('noteDate');
    const contentInput = document.getElementById('noteContent');
    
    if (titleInput) titleInput.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    if (contentInput) contentInput.value = '';
    
    // 更新列表选中状态
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('active');
    });
}

function saveNote() {
    const titleInput = document.getElementById('noteTitle');
    const dateInput = document.getElementById('noteDate');
    const contentInput = document.getElementById('noteContent');
    
    const title = titleInput?.value.trim() || '无标题';
    const date = dateInput?.value || new Date().toISOString().split('T')[0];
    const content = contentInput?.value || '';
    
    if (currentNoteId !== null) {
        // 更新现有笔记
        AppState.notes[currentNoteId] = {
            ...AppState.notes[currentNoteId],
            title,
            date,
            content,
            updateTime: new Date().toISOString()
        };
    } else {
        // 创建新笔记
        AppState.notes.push({
            id: Date.now(),
            title,
            date,
            content,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        });
        currentNoteId = AppState.notes.length - 1;
    }
    
    saveData();
    renderNotesList();
    
    // 显示保存成功提示
    showToast('笔记已保存');
}

function deleteNote() {
    if (currentNoteId === null) {
        showToast('没有可删除的笔记');
        return;
    }
    
    if (!confirm('确定要删除这条笔记吗？')) {
        return;
    }
    
    AppState.notes.splice(currentNoteId, 1);
    currentNoteId = null;
    
    saveData();
    renderNotesList();
    createNewNote();
    
    showToast('笔记已删除');
}

function loadNote(index) {
    const note = AppState.notes[index];
    if (!note) return;
    
    currentNoteId = index;
    
    const titleInput = document.getElementById('noteTitle');
    const dateInput = document.getElementById('noteDate');
    const contentInput = document.getElementById('noteContent');
    
    if (titleInput) titleInput.value = note.title;
    if (dateInput) dateInput.value = note.date;
    if (contentInput) contentInput.value = note.content;
    
    // 更新列表选中状态
    document.querySelectorAll('.note-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
}

function renderNotesList() {
    const container = document.getElementById('notesList');
    if (!container) return;
    
    if (AppState.notes.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">暂无笔记</div>';
        return;
    }
    
    container.innerHTML = AppState.notes.map((note, index) => `
        <div class="note-item ${index === currentNoteId ? 'active' : ''}" onclick="loadNote(${index})">
            <div class="note-item-title">${note.title}</div>
            <div class="note-item-date">${note.date}</div>
        </div>
    `).join('');
}

function showToast(message) {
    // 创建toast提示
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-primary);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

window.loadNote = loadNote;
