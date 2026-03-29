const STORAGE_KEY = "foodStockItems";

const itemForm = document.getElementById("item-form");
const itemNameInput = document.getElementById("item-name");
const itemCategoryInput = document.getElementById("item-category");
const itemDateInput = document.getElementById("item-date");
const formError = document.getElementById("form-error");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit-button");

const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const sortSelect = document.getElementById("sort-select");
const filterButtons = document.querySelectorAll(".filter-button");

const itemList = document.getElementById("item-list");
const emptyState = document.getElementById("empty-state");
const deleteAllButton = document.getElementById("delete-all-button");

const totalCount = document.getElementById("total-count");
const expiredCount = document.getElementById("expired-count");
const warningCount = document.getElementById("warning-count");
const todayCount = document.getElementById("today-count");

let items = loadItems();
let editingId = null;
let currentFilter = "すべて";

render();

itemForm.addEventListener("submit", handleSubmit);
cancelEditButton.addEventListener("click", cancelEditMode);
searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", render);
sortSelect.addEventListener("change", render);
deleteAllButton.addEventListener("click", handleDeleteAll);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    updateActiveFilterButton();
    render();
  });
});

function handleSubmit(event) {
  event.preventDefault();

  const name = itemNameInput.value.trim();
  const category = itemCategoryInput.value;
  const deadline = itemDateInput.value;

  if (!name) {
    showError("食品名を入力してください。");
    return;
  }

  if (!category) {
    showError("カテゴリを選択してください。");
    return;
  }

  if (!deadline) {
    showError("賞味期限を入力してください。");
    return;
  }

  clearError();

  if (editingId) {
    items = items.map((item) =>
      item.id === editingId
        ? { ...item, name, category, deadline }
        : item
    );
    exitEditMode();
  } else {
    const newItem = {
      id: crypto.randomUUID(),
      name,
      category,
      deadline,
      createdAt: Date.now(),
    };
    items.push(newItem);
  }

  saveItems();
  resetForm();
  render();
}

function handleDeleteAll() {
  if (items.length === 0) {
    return;
  }

  const confirmed = window.confirm("登録されている食品をすべて削除しますか？");
  if (!confirmed) {
    return;
  }

  items = [];
  saveItems();
  exitEditMode();
  resetForm();
  render();
}

function loadItems() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function render() {
  const processedItems = getProcessedItems();
  const stats = calculateStats(items);

  renderStats(stats);
  renderList(processedItems);
}

function getProcessedItems() {
  let result = [...items];

  const keyword = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;

  if (keyword) {
    result = result.filter((item) =>
      item.name.toLowerCase().includes(keyword)
    );
  }

  if (selectedCategory !== "すべて") {
    result = result.filter((item) => item.category === selectedCategory);
  }

  result = result.filter((item) => matchesDeadlineFilter(item, currentFilter));
  result = sortItems(result, sortSelect.value);

  return result;
}

function sortItems(list, sortType) {
  const sorted = [...list];

  if (sortType === "deadline-asc") {
    sorted.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  } else if (sortType === "deadline-desc") {
    sorted.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
  } else if (sortType === "name-asc") {
    sorted.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }

  return sorted;
}

function matchesDeadlineFilter(item, filter) {
  const daysLeft = calculateDaysLeft(item.deadline);

  if (filter === "すべて") return true;
  if (filter === "期限切れ") return daysLeft < 0;
  if (filter === "今日まで") return daysLeft === 0;
  if (filter === "3日以内") return daysLeft >= 0 && daysLeft <= 3;
  if (filter === "1週間以内") return daysLeft >= 0 && daysLeft <= 7;

  return true;
}

function calculateStats(list) {
  let expired = 0;
  let today = 0;
  let warning = 0;

  list.forEach((item) => {
    const daysLeft = calculateDaysLeft(item.deadline);

    if (daysLeft < 0) {
      expired += 1;
    } else if (daysLeft === 0) {
      today += 1;
    } else if (daysLeft <= 3) {
      warning += 1;
    }
  });

  return {
    total: list.length,
    expired,
    today,
    warning,
  };
}

function renderStats(stats) {
  totalCount.textContent = stats.total;
  expiredCount.textContent = stats.expired;
  todayCount.textContent = stats.today;
  warningCount.textContent = stats.warning;
}

function renderList(list) {
  itemList.innerHTML = "";

  if (list.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  list.forEach((item) => {
    const daysLeft = calculateDaysLeft(item.deadline);
    const statusInfo = getStatusInfo(daysLeft);

    const li = document.createElement("li");
    li.className = `item-card ${statusInfo.cardClass}`;

    li.innerHTML = `
      <div class="item-top">
        <div>
          <h3 class="item-name">${escapeHtml(item.name)}</h3>
        </div>
        <div class="badges">
          <span class="badge badge-category">${escapeHtml(item.category)}</span>
          <span class="badge ${statusInfo.badgeClass}">${statusInfo.label}</span>
        </div>
      </div>

      <div class="item-meta">
        <div class="meta-box">
          <span class="meta-label">賞味期限</span>
          <span class="meta-value">${formatDate(item.deadline)}</span>
        </div>
        <div class="meta-box">
          <span class="meta-label">残り日数</span>
          <span class="meta-value">${formatDaysLeft(daysLeft)}</span>
        </div>
        <div class="meta-box">
          <span class="meta-label">登録状態</span>
          <span class="meta-value">${statusInfo.shortText}</span>
        </div>
      </div>

      <div class="item-actions">
        <button type="button" class="action-button edit" data-id="${item.id}">
          編集
        </button>
        <button type="button" class="action-button delete" data-id="${item.id}">
          削除
        </button>
      </div>
    `;

    const editButton = li.querySelector(".edit");
    const deleteButton = li.querySelector(".delete");

    editButton.addEventListener("click", () => startEdit(item.id));
    deleteButton.addEventListener("click", () => deleteItem(item.id));

    itemList.appendChild(li);
  });
}

function deleteItem(id) {
  const confirmed = window.confirm("この食品を削除しますか？");
  if (!confirmed) {
    return;
  }

  items = items.filter((item) => item.id !== id);

  if (editingId === id) {
    exitEditMode();
    resetForm();
  }

  saveItems();
  render();
}

function startEdit(id) {
  const target = items.find((item) => item.id === id);
  if (!target) {
    return;
  }

  editingId = id;
  itemNameInput.value = target.name;
  itemCategoryInput.value = target.category;
  itemDateInput.value = target.deadline;

  submitButton.textContent = "更新する";
  cancelEditButton.classList.remove("hidden");
  clearError();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function cancelEditMode() {
  exitEditMode();
  resetForm();
  clearError();
}

function exitEditMode() {
  editingId = null;
  submitButton.textContent = "追加する";
  cancelEditButton.classList.add("hidden");
}

function resetForm() {
  itemForm.reset();
}

function updateActiveFilterButton() {
  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === currentFilter);
  });
}

function calculateDaysLeft(deadline) {
  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const target = new Date(deadline);
  const targetOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffTime = targetOnly - todayOnly;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getStatusInfo(daysLeft) {
  if (daysLeft < 0) {
    return {
      label: "期限切れ",
      shortText: "早めに確認が必要",
      cardClass: "expired",
      badgeClass: "badge badge-expired",
    };
  }

  if (daysLeft === 0) {
    return {
      label: "今日まで",
      shortText: "本日が期限",
      cardClass: "today",
      badgeClass: "badge badge-today",
    };
  }

  if (daysLeft <= 3) {
    return {
      label: "3日以内",
      shortText: "期限が近い",
      cardClass: "warning",
      badgeClass: "badge badge-warning",
    };
  }

  return {
    label: "余裕あり",
    shortText: "まだ余裕あり",
    cardClass: "safe",
    badgeClass: "badge badge-safe",
  };
}

function formatDaysLeft(daysLeft) {
  if (daysLeft < 0) {
    return `${Math.abs(daysLeft)}日超過`;
  }

  if (daysLeft === 0) {
    return "0日";
  }

  return `あと${daysLeft}日`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function showError(message) {
  formError.textContent = message;
}

function clearError() {
  formError.textContent = "";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}