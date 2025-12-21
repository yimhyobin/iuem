/**
 * 관리자 페이지 기능
 */

// 게시글 목록 로드
function loadPosts(category = 'all') {
    const posts = DataManager.getPostsByCategory(category);
    const tbody = document.getElementById('postTableBody');

    if (posts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message">등록된 게시글이 없습니다.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = posts.map((post, index) => `
        <tr data-id="${post.id}">
            <td class="check-col">
                <input type="checkbox" class="post-check" value="${post.id}">
            </td>
            <td class="num-col">${posts.length - index}</td>
            <td class="category-col">
                <span class="category-badge ${post.category}">${CategoryMap[post.category]}</span>
            </td>
            <td class="title-col">
                <a href="admin-post.html?id=${post.id}">${post.title}</a>
            </td>
            <td class="status-col">
                <span class="status-badge ${post.status}">${StatusMap[post.status]}</span>
            </td>
            <td class="date-col">${post.createdAt}</td>
            <td class="action-col">
                <button class="btn-edit" onclick="editPost('${post.id}')">수정</button>
                <button class="btn-delete" onclick="deletePost('${post.id}')">삭제</button>
            </td>
        </tr>
    `).join('');

    updateTotalCount(posts.length);
}

// 회원 목록 로드
function loadUsers() {
    const users = Auth.getAllUsers();
    const tbody = document.getElementById('userTableBody');

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message">등록된 회원이 없습니다.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map((user, index) => `
        <tr data-id="${user.userId}">
            <td class="num-col">${users.length - index}</td>
            <td>${user.userId}</td>
            <td>${user.userName}</td>
            <td>${user.email}</td>
            <td>${user.createdAt}</td>
            <td>
                <span class="user-type ${user.isAdmin ? 'admin' : 'member'}">
                    ${user.isAdmin ? '관리자' : '일반회원'}
                </span>
            </td>
            <td class="action-col">
                ${user.userId !== 'admin' ? `
                    ${user.isAdmin ?
                        `<button class="btn-revoke" onclick="revokeAdmin('${user.userId}')">권한해제</button>` :
                        `<button class="btn-grant" onclick="grantAdmin('${user.userId}')">관리자지정</button>`
                    }
                    <button class="btn-delete" onclick="deleteUser('${user.userId}')">삭제</button>
                ` : '<span class="default-admin">기본관리자</span>'}
            </td>
        </tr>
    `).join('');
}

// 총 게시글 수 업데이트
function updateTotalCount(count) {
    const countEl = document.querySelector('.section-header h2');
    if (countEl) {
        countEl.textContent = `게시글 관리 (${count}건)`;
    }
}

// 전체 선택 토글
function toggleCheckAll() {
    const checkAll = document.getElementById('checkAll');
    const checkboxes = document.querySelectorAll('.post-check');
    checkboxes.forEach(cb => cb.checked = checkAll.checked);
}

// 게시글 수정
function editPost(id) {
    window.location.href = `admin-post.html?id=${id}`;
}

// 게시글 삭제
function deletePost(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const result = DataManager.deletePost(id);
    alert(result.message);
    if (result.success) {
        loadPosts();
    }
}

// 선택 삭제
function deleteSelected() {
    const checkboxes = document.querySelectorAll('.post-check:checked');
    if (checkboxes.length === 0) {
        alert('삭제할 게시글을 선택해주세요.');
        return;
    }

    if (!confirm(`${checkboxes.length}개의 게시글을 삭제하시겠습니까?`)) return;

    const ids = Array.from(checkboxes).map(cb => cb.value);
    const result = DataManager.deletePosts(ids);
    alert(result.message);
    if (result.success) {
        document.getElementById('checkAll').checked = false;
        loadPosts();
    }
}

// 관리자 권한 부여
function grantAdmin(userId) {
    if (!confirm(`${userId}에게 관리자 권한을 부여하시겠습니까?`)) return;

    const result = Auth.grantAdmin(userId);
    alert(result.message);
    if (result.success) {
        loadUsers();
    }
}

// 관리자 권한 해제
function revokeAdmin(userId) {
    if (!confirm(`${userId}의 관리자 권한을 해제하시겠습니까?`)) return;

    const result = Auth.revokeAdmin(userId);
    alert(result.message);
    if (result.success) {
        loadUsers();
    }
}

// 사용자 삭제
function deleteUser(userId) {
    if (!confirm(`${userId} 회원을 삭제하시겠습니까?`)) return;

    const result = Auth.deleteUser(userId);
    alert(result.message);
    if (result.success) {
        loadUsers();
    }
}

// API 설정 저장
function saveApiSettings() {
    const apiKey = document.getElementById('apiKey').value;
    const apiEndpoint = document.getElementById('apiEndpoint').value;

    localStorage.setItem('apiSettings', JSON.stringify({
        apiKey,
        apiEndpoint
    }));

    alert('API 설정이 저장되었습니다.');
}

// 데이터 내보내기
function exportData() {
    const data = DataManager.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `startup-portal-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 데이터 가져오기
function importData() {
    document.getElementById('importFile').click();
}

// 파일 가져오기 처리
function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const result = DataManager.importData(e.target.result);
        alert(result.message);
        if (result.success) {
            loadPosts();
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// 전체 데이터 삭제
function clearAllData() {
    if (!confirm('모든 게시글 데이터가 삭제됩니다. 계속하시겠습니까?')) return;
    if (!confirm('이 작업은 되돌릴 수 없습니다. 정말 삭제하시겠습니까?')) return;

    const result = DataManager.clearAll();
    alert(result.message);
    loadPosts();
}
