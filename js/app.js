(function () {
  'use strict';

  /* ============================================================
     Greeting — live clock, full date, time-of-day greeting
     ============================================================ */
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date');
  const greetingTextEl = document.getElementById('greeting-text');

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function greetingFor(hour) {
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  function updateGreeting() {
    const now = new Date();
    clockEl.textContent =
      pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    dateEl.textContent = now.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    greetingTextEl.textContent = greetingFor(now.getHours());
  }

  updateGreeting();
  setInterval(updateGreeting, 1000);

  /* ============================================================
     Focus Timer — 25:00 with Start / Stop / Reset
     Timestamp-based so it stays accurate when the tab is idle.
     ============================================================ */
  const TIMER_DURATION = 25 * 60; // seconds

  const timerDisplayEl = document.getElementById('timer-display');
  const startBtn = document.getElementById('timer-start');
  const stopBtn = document.getElementById('timer-stop');
  const resetBtn = document.getElementById('timer-reset');

  let remaining = TIMER_DURATION; // seconds left
  let endTime = null;              // ms timestamp when a running timer hits 0
  let intervalId = null;           // setInterval handle, null when not running

  function formatTimer(seconds) {
    return pad(Math.floor(seconds / 60)) + ':' + pad(seconds % 60);
  }

  function renderTimer() {
    timerDisplayEl.textContent = formatTimer(remaining);
  }

  function clearTimer() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function tick() {
    remaining = Math.round((endTime - Date.now()) / 1000);
    if (remaining <= 0) {
      remaining = 0;
      clearTimer();
      endTime = null;
    }
    renderTimer();
  }

  function startTimer() {
    // Guard: never run more than one interval at a time.
    if (intervalId !== null) return;

    // If the previous run finished, restart from the full duration.
    if (remaining <= 0) {
      remaining = TIMER_DURATION;
    }

    endTime = Date.now() + remaining * 1000;
    intervalId = setInterval(tick, 1000);
    tick(); // update the display immediately instead of waiting 1s
  }

  function stopTimer() {
    if (intervalId === null) return; // not running, nothing to stop
    remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    clearTimer();
    endTime = null;
    renderTimer();
  }

  function resetTimer() {
    clearTimer();
    endTime = null;
    remaining = TIMER_DURATION;
    renderTimer();
  }

  renderTimer();
  startBtn.addEventListener('click', startTimer);
  stopBtn.addEventListener('click', stopTimer);
  resetBtn.addEventListener('click', resetTimer);

  /* ============================================================
     Local Storage helper — shared by all features
     ============================================================ */
  const Storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        // ignore write failures (storage disabled or full)
      }
    }
  };

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ============================================================
     Theme (light/dark) — saved in Local Storage
     ============================================================ */
  const THEME_KEY = 'tld.theme';
  const themeToggleBtn = document.getElementById('theme-toggle');

  let currentTheme = Storage.get(THEME_KEY, 'light');
  if (currentTheme !== 'light' && currentTheme !== 'dark') currentTheme = 'light';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggleBtn.setAttribute('aria-pressed', String(theme === 'dark'));
    themeToggleBtn.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }

  applyTheme(currentTheme);

  themeToggleBtn.addEventListener('click', function () {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    Storage.set(THEME_KEY, currentTheme);
    applyTheme(currentTheme);
  });

  /* ============================================================
     Custom name in greeting — saved in Local Storage
     ============================================================ */
  const NAME_KEY = 'tld.name';
  const greetingCommaEl = document.getElementById('greeting-comma');
  const nameSlotEl = document.getElementById('name-slot');
  const nameEditBtn = document.getElementById('name-edit-btn');

  let userName = Storage.get(NAME_KEY, '');
  if (typeof userName !== 'string') userName = '';
  let nameEditing = false;

  function renderName() {
    if (userName) {
      greetingCommaEl.hidden = false;
      nameSlotEl.textContent = userName;
    } else {
      greetingCommaEl.hidden = true;
      nameSlotEl.textContent = '';
    }
  }

  function startNameEdit() {
    nameEditing = true;
    greetingCommaEl.hidden = false; // show the ", " while editing
    nameSlotEl.textContent = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'name-input';
    input.value = userName;
    input.maxLength = 40;
    input.setAttribute('aria-label', 'Your name');
    input.placeholder = 'Your name';
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commitNameEdit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelNameEdit(); }
    });
    input.addEventListener('blur', function () { commitNameEdit(); });
    nameSlotEl.appendChild(input);
    input.focus();
    input.select();
  }

  function commitNameEdit() {
    if (!nameEditing) return;
    const input = nameSlotEl.querySelector('input');
    if (input) {
      userName = input.value.trim();
      Storage.set(NAME_KEY, userName);
    }
    nameEditing = false; // set before renderName, which removes the input (blur)
    renderName();
  }

  function cancelNameEdit() {
    if (!nameEditing) return;
    nameEditing = false;
    renderName();
  }

  // keep focus in the field so the button click (not blur) commits the edit
  nameEditBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
  nameEditBtn.addEventListener('click', function () {
    if (nameEditing) commitNameEdit();
    else startNameEdit();
  });

  renderName();

  /* ============================================================
     To-Do List — add, edit, complete, delete; persisted
     ============================================================ */
  const TODO_KEY = 'tld.todos';
  const taskForm = document.getElementById('task-form');
  const taskInput = document.getElementById('task-input');
  const taskListEl = document.getElementById('task-list');
  const taskMsgEl = document.getElementById('task-msg');

  const storedTodos = Storage.get(TODO_KEY, []);
  let todos = Array.isArray(storedTodos) ? storedTodos : [];
  let editingId = null;

  function saveTodos() {
    Storage.set(TODO_KEY, todos);
  }

  function showTaskMsg(message) {
    taskMsgEl.textContent = message;
    taskMsgEl.hidden = false;
  }

  function clearTaskMsg() {
    taskMsgEl.textContent = '';
    taskMsgEl.hidden = true;
  }

  function buildItem(task, editing) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' task-item--done' : '');
    li.dataset.id = task.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-item__checkbox';
    checkbox.checked = task.done;
    if (editing) {
      // disabled so interacting with it cannot blur the edit field
      checkbox.disabled = true;
    } else {
      checkbox.addEventListener('change', function () { toggleTodo(task.id); });
    }
    li.appendChild(checkbox);

    if (editing) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'task-item__input';
      input.value = task.text;
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
      });
      input.addEventListener('blur', function () { exitEditInline(); });
      li.appendChild(input);

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'task-item__edit';
      saveBtn.textContent = 'Save';
      // keep focus in the field so the click (not blur) commits the edit
      saveBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
      saveBtn.addEventListener('click', function () { saveEdit(); });
      li.appendChild(saveBtn);
    } else {
      const text = document.createElement('span');
      text.className = 'task-item__text';
      text.textContent = task.text;
      li.appendChild(text);

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'task-item__edit';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', function () { startEdit(task.id); });
      li.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'task-item__delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function () { deleteTodo(task.id); });
      li.appendChild(deleteBtn);
    }

    return li;
  }

  function renderTodos() {
    taskListEl.textContent = '';
    todos.forEach(function (task) {
      taskListEl.appendChild(buildItem(task, task.id === editingId));
    });
  }

  function startEdit(id) {
    exitEditInline(); // commit any other edit already in progress
    editingId = id;
    renderTodos();
    const input = taskListEl.querySelector('.task-item__input');
    if (input) { input.focus(); input.select(); }
  }

  // Runs when the edit field loses focus (e.g. clicking elsewhere).
  // Updates only the edited row, so a click on another row's button still lands.
  function exitEditInline() {
    if (editingId === null) return;
    const id = editingId;
    const task = todos.find(function (t) { return t.id === id; });
    const input = taskListEl.querySelector('.task-item__input');
    if (task && input) {
      const trimmed = input.value.trim();
      if (trimmed) { task.text = trimmed; saveTodos(); }
    }
    editingId = null;
    if (task) {
      const li = taskListEl.querySelector('.task-item[data-id="' + id + '"]');
      if (li) li.replaceWith(buildItem(task, false));
    }
  }

  function saveEdit() {
    if (editingId === null) return;
    const task = todos.find(function (t) { return t.id === editingId; });
    const input = taskListEl.querySelector('.task-item__input');
    if (task && input) {
      const trimmed = input.value.trim();
      if (trimmed) { task.text = trimmed; saveTodos(); }
    }
    editingId = null;
    renderTodos();
  }

  function cancelEdit() {
    editingId = null; // discard the in-progress text
    renderTodos();
  }

  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) { clearTaskMsg(); return false; }
    const exists = todos.some(function (t) {
      return t.text.toLowerCase() === trimmed.toLowerCase();
    });
    if (exists) {
      showTaskMsg('"' + trimmed + '" is already on your list.');
      return false;
    }
    clearTaskMsg();
    todos.push({ id: makeId(), text: trimmed, done: false });
    saveTodos();
    taskListEl.appendChild(buildItem(todos[todos.length - 1], false));
    return true;
  }

  function toggleTodo(id) {
    const task = todos.find(function (t) { return t.id === id; });
    if (!task) return;
    task.done = !task.done;
    saveTodos();
    const li = taskListEl.querySelector('.task-item[data-id="' + id + '"]');
    if (li) li.replaceWith(buildItem(task, false));
  }

  function deleteTodo(id) {
    todos = todos.filter(function (t) { return t.id !== id; });
    saveTodos();
    if (editingId === id) editingId = null;
    const li = taskListEl.querySelector('.task-item[data-id="' + id + '"]');
    if (li) li.remove();
  }

  taskForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const added = addTodo(taskInput.value);
    if (added) taskInput.value = '';
    taskInput.focus();
  });

  taskInput.addEventListener('input', clearTaskMsg);

  renderTodos();

  /* ============================================================
     Quick Links — add name + URL, open in new tab, remove; persisted
     ============================================================ */
  const LINK_KEY = 'tld.links';
  const linksForm = document.getElementById('links-form');
  const linkNameInput = document.getElementById('link-name');
  const linkUrlInput = document.getElementById('link-url');
  const linksListEl = document.getElementById('links-list');

  const storedLinks = Storage.get(LINK_KEY, []);
  let links = Array.isArray(storedLinks) ? storedLinks : [];

  function saveLinks() {
    Storage.set(LINK_KEY, links);
  }

  function normalizeUrl(url) {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return 'https://' + trimmed;
  }

  function renderLinks() {
    linksListEl.textContent = '';
    links.forEach(function (link) {
      const entry = document.createElement('span');
      entry.className = 'link-entry';

      const anchor = document.createElement('a');
      anchor.className = 'link-button';
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = link.name;
      entry.appendChild(anchor);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'link-remove';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', 'Remove ' + link.name);
      removeBtn.addEventListener('click', function () { deleteLink(link.id); });
      entry.appendChild(removeBtn);

      linksListEl.appendChild(entry);
    });
  }

  function addLink(name, url) {
    const trimmedName = name.trim();
    const normalized = normalizeUrl(url);
    if (!trimmedName || !normalized) return;
    links.push({ id: makeId(), name: trimmedName, url: normalized });
    saveLinks();
    renderLinks();
  }

  function deleteLink(id) {
    links = links.filter(function (l) { return l.id !== id; });
    saveLinks();
    renderLinks();
  }

  linksForm.addEventListener('submit', function (e) {
    e.preventDefault();
    addLink(linkNameInput.value, linkUrlInput.value);
    linkNameInput.value = '';
    linkUrlInput.value = '';
    linkNameInput.focus();
  });

  renderLinks();

})();
