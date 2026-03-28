let items = [];

function addItem() {
  const nameInput = document.getElementById("name");
  const dateInput = document.getElementById("date");

  const name = nameInput.value.trim();
  const date = dateInput.value;

  if (name === "" || date === "") {
    alert("食品名と期限を入力してください");
    return;
  }

  const item = { name, date };
  items.push(item);

  saveData();
  displayItems();

  nameInput.value = "";
  dateInput.value = "";
}

function displayItems() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  items.sort((a, b) => new Date(a.date) - new Date(b.date));

  items.forEach((item, index) => {
    const li = document.createElement("li");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(item.date);
    expiry.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      li.classList.add("danger");
    } else if (diffDays <= 3) {
      li.classList.add("warning");
    }

    let statusText = "";
    if (diffDays < 0) {
      statusText = "期限切れ";
    } else if (diffDays === 0) {
      statusText = "今日まで";
    } else {
      statusText = "あと" + diffDays + "日";
    }

    li.innerHTML = `
      <div class="item-row">
        <div class="item-text">
          <strong>${item.name}</strong><br>
          期限：${item.date}<br>
          ${statusText}
        </div>
        <button class="delete-btn">削除</button>
      </div>
    `;

    li.querySelector("button").onclick = () => {
      items.splice(index, 1);
      saveData();
      displayItems();
    };

    list.appendChild(li);
  });
}

function saveData() {
  localStorage.setItem("items", JSON.stringify(items));
}

function loadData() {
  const data = localStorage.getItem("items");
  if (data) {
    items = JSON.parse(data);
    displayItems();
  }
}

loadData();