// ============================================
// 상세검색 토글
// ============================================
function toggleDetailSearch() {
    const detailSearch = document.getElementById('detailSearch');
    const toggleBtn = document.querySelector('.btn-detail-toggle');

    detailSearch.classList.toggle('active');
    toggleBtn.classList.toggle('active');
}

// ============================================
// 검색 실행
// ============================================
function performSearch() {
    showLoading();
    const keyword = document.getElementById('searchKeyword').value;
    console.log('검색어:', keyword);

    setTimeout(() => {
        updateSelectedFilters();
        hideLoading();
    }, 300);
}

// ============================================
// 필터 적용
// ============================================
function applyFilters() {
    showLoading();
    const filters = collectFilters();
    console.log('적용된 필터:', filters);

    setTimeout(() => {
        updateSelectedFilters();
        hideLoading();
    }, 300);
}

// ============================================
// 필터 초기화
// ============================================
function resetFilters() {
    // 모든 체크박스 해제
    const checkboxes = document.querySelectorAll('.detail-search input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });

    // 검색어 초기화
    const searchKeyword = document.getElementById('searchKeyword');
    const deptSearch = document.getElementById('deptSearch');

    if (searchKeyword) searchKeyword.value = '';
    if (deptSearch) deptSearch.value = '';

    // 선택된 필터 태그 초기화
    const selectedFilters = document.getElementById('selectedFilters');
    const deptTags = document.getElementById('deptTags');

    if (selectedFilters) selectedFilters.innerHTML = '';
    if (deptTags) deptTags.innerHTML = '';

    console.log('필터가 초기화되었습니다.');
}

// ============================================
// 필터 수집
// ============================================
function collectFilters() {
    const filters = {
        keyword: document.getElementById('searchKeyword')?.value || '',
        departments: [],
        supportFields: [],
        regions: [],
        targets: [],
        ages: [],
        careers: []
    };

    // 주관부처
    document.querySelectorAll('input[name="department"]:checked').forEach(cb => {
        filters.departments.push(cb.value);
    });

    // 지원분야
    document.querySelectorAll('input[name="supportField"]:checked').forEach(cb => {
        filters.supportFields.push(cb.value);
    });

    // 지역
    document.querySelectorAll('input[name="region"]:checked').forEach(cb => {
        filters.regions.push(cb.value);
    });

    // 대상
    document.querySelectorAll('input[name="target"]:checked').forEach(cb => {
        filters.targets.push(cb.value);
    });

    // 연령대
    document.querySelectorAll('input[name="age"]:checked').forEach(cb => {
        filters.ages.push(cb.value);
    });

    // 창업업력
    document.querySelectorAll('input[name="career"]:checked').forEach(cb => {
        filters.careers.push(cb.value);
    });

    return filters;
}

// ============================================
// 선택된 필터 표시 업데이트
// ============================================
function updateSelectedFilters() {
    const container = document.getElementById('selectedFilters');
    if (!container) return;

    const filters = collectFilters();
    let html = '';

    // 키워드
    if (filters.keyword) {
        html += createFilterTag('keyword', filters.keyword);
    }

    // 주관부처
    filters.departments.forEach(dept => {
        html += createFilterTag('department', dept);
    });

    // 지원분야
    filters.supportFields.forEach(field => {
        html += createFilterTag('supportField', field);
    });

    // 지역
    filters.regions.forEach(region => {
        html += createFilterTag('region', region);
    });

    // 대상
    filters.targets.forEach(target => {
        html += createFilterTag('target', target);
    });

    // 연령대
    filters.ages.forEach(age => {
        html += createFilterTag('age', age);
    });

    // 창업업력
    filters.careers.forEach(career => {
        html += createFilterTag('career', career);
    });

    container.innerHTML = html;
}

// ============================================
// 필터 태그 생성
// ============================================
function createFilterTag(type, value) {
    return `
        <span class="selected-filter" data-type="${type}" data-value="${value}">
            ${value}
            <span class="remove-btn" onclick="removeFilter('${type}', '${value}')">×</span>
        </span>
    `;
}

// ============================================
// 필터 제거
// ============================================
function removeFilter(type, value) {
    if (type === 'keyword') {
        document.getElementById('searchKeyword').value = '';
    } else {
        const checkbox = document.querySelector(`input[name="${type}"][value="${value}"]`);
        if (checkbox) {
            checkbox.checked = false;
        }
    }
    updateSelectedFilters();

    // 결과 다시 로드 (index.html에 loadResults 함수가 있는 경우)
    if (typeof loadResults === 'function') {
        loadResults();
    }
}

// ============================================
// 정렬 변경
// ============================================
function changeSort() {
    const sortValue = document.getElementById('sortSelect')?.value;
    console.log('정렬 방식:', sortValue);

    if (typeof loadResults === 'function') {
        showLoading();
        setTimeout(() => {
            loadResults();
            hideLoading();
        }, 200);
    }
}

// ============================================
// 스크랩 토글
// ============================================
function toggleScrap(button, postId) {
    button.classList.toggle('active');
    const icon = button.querySelector('.scrap-icon');

    if (button.classList.contains('active')) {
        icon.textContent = '♥';
        // 스크랩 저장
        let scraps = JSON.parse(localStorage.getItem('scraps') || '[]');
        if (!scraps.includes(postId)) {
            scraps.push(postId);
            localStorage.setItem('scraps', JSON.stringify(scraps));
        }
    } else {
        icon.textContent = '♡';
        // 스크랩 제거
        let scraps = JSON.parse(localStorage.getItem('scraps') || '[]');
        scraps = scraps.filter(id => id !== postId);
        localStorage.setItem('scraps', JSON.stringify(scraps));
    }
}

// ============================================
// 로딩 스피너
// ============================================
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// ============================================
// 상단으로 이동
// ============================================
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ============================================
// 페이지 로드 시 초기화
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // 로딩 오버레이 생성
    if (!document.getElementById('loadingOverlay')) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(loadingOverlay);
    }

    // 상단 이동 버튼 생성
    if (!document.getElementById('scrollTopBtn')) {
        const scrollTopBtn = document.createElement('button');
        scrollTopBtn.id = 'scrollTopBtn';
        scrollTopBtn.className = 'scroll-top-btn';
        scrollTopBtn.innerHTML = '↑';
        scrollTopBtn.onclick = scrollToTop;
        document.body.appendChild(scrollTopBtn);
    }

    // 스크롤 이벤트 - 상단 이동 버튼 표시/숨김, 헤더 그림자
    window.addEventListener('scroll', function() {
        const scrollTopBtn = document.getElementById('scrollTopBtn');
        const header = document.querySelector('.header');

        if (window.scrollY > 300) {
            scrollTopBtn?.classList.add('visible');
        } else {
            scrollTopBtn?.classList.remove('visible');
        }

        if (window.scrollY > 50) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }
    });

    // 햄버거 메뉴 토글 (모바일)
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
        });
    }

    // 네비게이션 활성화 (기존 코드와 호환)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // data-category가 있으면 페이지 이동 처리는 별도로
            if (!this.dataset.category) {
                e.preventDefault();
                navItems.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // 체크박스 변경 시 선택된 필터 업데이트
    const checkboxes = document.querySelectorAll('.detail-search input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // 최대 5개 제한 (주관부처)
            if (this.name === 'department') {
                const checked = document.querySelectorAll('input[name="department"]:checked');
                if (checked.length > 5) {
                    this.checked = false;
                    alert('최대 5개까지 선택 가능합니다.');
                    return;
                }
            }
        });
    });

    // 부처 검색 기능
    const deptSearch = document.getElementById('deptSearch');
    if (deptSearch) {
        deptSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const options = document.querySelectorAll('#deptOptions .filter-option');

            options.forEach(option => {
                const text = option.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    option.style.display = 'inline-flex';
                } else {
                    option.style.display = 'none';
                }
            });
        });
    }

    // 검색창 엔터키 이벤트
    const searchKeyword = document.getElementById('searchKeyword');
    if (searchKeyword) {
        searchKeyword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
                if (typeof loadResults === 'function') {
                    loadResults();
                }
            }
        });
    }
});

// ============================================
// 페이지네이션 (기존 코드 호환)
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const pageNums = document.querySelectorAll('.page-num');
    const prevBtn = document.querySelector('.page-btn.prev');
    const nextBtn = document.querySelector('.page-btn.next');

    if (pageNums.length > 0) {
        pageNums.forEach(btn => {
            btn.addEventListener('click', function() {
                pageNums.forEach(p => p.classList.remove('active'));
                this.classList.add('active');

                // 이전/다음 버튼 상태 업데이트
                const currentPage = parseInt(this.textContent);
                if (prevBtn) prevBtn.disabled = currentPage === 1;

                // 스크롤 상단으로
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (this.disabled) return;
                const active = document.querySelector('.page-num.active');
                const prev = active?.previousElementSibling;
                if (prev && prev.classList.contains('page-num')) {
                    active.classList.remove('active');
                    prev.classList.add('active');
                    this.disabled = prev.textContent === '1';
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                const active = document.querySelector('.page-num.active');
                const next = active?.nextElementSibling;
                if (next && next.classList.contains('page-num')) {
                    active.classList.remove('active');
                    next.classList.add('active');
                    if (prevBtn) prevBtn.disabled = false;
                }
            });
        }
    }
});
