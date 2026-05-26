// auth-cloud.js
// Подменяет логин и регистрацию на облачные, не трогая index.html
(function() {
    // 🔑 ВСТАВЬ СЮДА URL СВОЕГО WORKER
    const WORKER_URL = 'https://course-api.твой-ник.workers.dev';
    const ADMIN_SECRET = 'super-secret-kristina'; // Тот же, что в воркере

    // Ждём полной загрузки страницы
    window.addEventListener('load', () => {
        // Если пользователь уже вошёл ранее (есть сессия)
        const sessionUser = localStorage.getItem('courseCloudUser');
        if (sessionUser && document.getElementById('loginError')) {
            // Автоматически скрываем форму входа и показываем курс
            const loginPage = document.querySelector('.login-container') || document.getElementById('page-login');
            if (loginPage) loginPage.style.display = 'none';
            const dashboard = document.getElementById('page-dashboard');
            if (dashboard) {
                dashboard.style.display = 'block';
                document.getElementById('dashboardUserName').textContent = sessionUser;
            }
        }

        // Перехватываем функцию логина из index.html
        if (typeof handleLogin === 'function') {
            window._originalHandleLogin = handleLogin;
            window.handleLogin = async function() {
                const u = document.getElementById('loginUsername').value.trim();
                const p = document.getElementById('loginPassword').value.trim();
                const errEl = document.getElementById('loginError');

                if (!u || !p) {
                    errEl.textContent = 'Заполните все поля';
                    errEl.style.display = 'block';
                    return;
                }

                errEl.textContent = 'Проверяем доступ в облаке...';
                errEl.style.display = 'block';

                try {
                    const res = await fetch(WORKER_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'login', username: u, password: p })
                    });
                    const data = await res.json();

                    if (data.success) {
                        localStorage.setItem('courseCloudUser', data.username);
                        errEl.style.display = 'none';
                        // Запускаем стандартный переход в курс из твоего index.html
                        if (typeof showPage === 'function') showPage('page-dashboard');
                        if (typeof showToast === 'function') showToast(`Добро пожаловать, ${data.username}! 🍒`);
                    } else {
                        errEl.textContent = data.error || 'Неверный логин или пароль';
                        errEl.style.display = 'block';
                    }
                } catch (e) {
                    errEl.textContent = 'Нет связи с сервером. Проверьте интернет.';
                    errEl.style.display = 'block';
                }
            };
        }

        // Перехватываем функцию регистрации из index.html (если она там есть)
        if (typeof registerStudent === 'function') {
            window._originalRegisterStudent = registerStudent;
            window.registerStudent = async function() {
                const name = document.getElementById('newStudentName')?.value.trim();
                const pass = document.getElementById('newStudentPass')?.value.trim();
                if (!name || !pass) {
                    if (typeof showToast === 'function') showToast('Заполни имя и пароль');
                    return;
                }
                if (typeof showToast === 'function') showToast('Создаём аккаунт в облаке...');
                try {
                    const res = await fetch(WORKER_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'register', username: name, password: pass, adminSecret: ADMIN_SECRET })
                    });
                    const data = await res.json();
                    if (data.success) {
                        if (typeof showToast === 'function') showToast(`Ученик "${name}" создан! ✅`);
                        if (document.getElementById('newStudentName')) document.getElementById('newStudentName').value = '';
                        if (document.getElementById('newStudentPass')) document.getElementById('newStudentPass').value = '';
                    } else {
                        if (typeof showToast === 'function') showToast('Ошибка: ' + (data.error || 'Не удалось создать'));
                    }
                } catch (e) {
                    if (typeof showToast === 'function') showToast('Ошибка соединения');
                }
            };
        }
    });
})();
