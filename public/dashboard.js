document.addEventListener("DOMContentLoaded", async () => {
    showLoadingSpinner();
    try {
        // 獲取收藏和歷史紀錄數據
        const [favorites, history] = await Promise.all([
            fetchData("/api/favorites"),
            fetchData("/api/history")
        ]);

        // 渲染收藏和歷史紀錄
        renderList("favorites-list", favorites, "favorites");
        renderList("history-list", history, "history");

        // 初始化篩選功能
        initFilter("favorites-filter", "favorites-list");
        initFilter("history-filter", "history-list");
    } catch (error) {
        console.error("Error fetching data:", error);
        showErrorMessage("無法載入資料，請稍後再試。");
    } finally {
        hideLoadingSpinner();
    }
});

// 通用的獲取數據函數
async function fetchData(url) {
    const res = await fetch(url, {
        credentials: 'include' // 確保 cookie 包含在請求中
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to fetch data from ${url}: ${errorData.error}`);
    }
    return await res.json();
}

// 通用的渲染列表函數
function renderList(listId, items, type) {
    const listElement = document.getElementById(listId);
    listElement.innerHTML = ""; // 清空列表

    if (items.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = type === "favorites" ? "目前沒有收藏項目。" : "目前沒有歷史紀錄。";
        emptyMessage.classList.add("empty-message");
        listElement.appendChild(emptyMessage);
        return;
    }

    items.forEach((item) => {
        const li = document.createElement("li");
        li.classList.add("list-item");

        const title = document.createElement("strong");
        title.textContent = item.label || "未命名項目";

        const description = document.createElement("span");
        description.textContent = item.description ? `: ${item.description}` : "";

        li.appendChild(title);
        li.appendChild(description);

        // 添加取消收藏或刪除歷史紀錄按鈕
        const deleteButton = document.createElement("button");
        deleteButton.textContent = type === "favorites" ? "取消收藏" : "刪除歷史紀錄";
        deleteButton.classList.add("delete-button");
        
        // 綁定 deleteItem 函數，傳遞 item.id
        deleteButton.addEventListener("click", () => deleteItem(type, item.id, li));
        
        li.appendChild(deleteButton);

        if (item.image_url) {
            const imageDiv = document.createElement("div");

            const img = document.createElement("img");
            img.src = item.image_url;
            img.alt = item.label || "圖片";
            img.classList.add("thumbnail");
            img.loading = "lazy"; // 使用 lazy loading
            img.addEventListener("click", () => showImageModal(item.image_url, item.label));

            imageDiv.appendChild(img);
            li.appendChild(imageDiv);
        } else {
            const noImage = document.createElement("p");
            noImage.textContent = "圖片不可用";
            li.appendChild(noImage);
        }

        listElement.appendChild(li);
    });
}

// 刪除收藏或歷史紀錄項目
async function deleteItem(type, itemId, listItem) {
    if (!confirm("確定要刪除這個項目嗎？")) return;

    try {
        const url = type === "favorites" ? `/api/favorites/${itemId}` : `/api/history/${itemId}`;
        const res = await fetch(url, {
            method: "DELETE",
            credentials: 'include',  // 確保 cookie 包含在請求中
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(`Failed to delete item: ${errorData.error}`);
        }
        // 刪除成功後移除 DOM 中的元素
        listItem.remove();
        showToast("項目已刪除");
    } catch (error) {
        console.error("Error deleting item:", error);
        showErrorMessage("刪除項目時出現錯誤，請稍後再試。");
    }
}

// 顯示圖片放大模態視窗
function showImageModal(imageUrl, label) {
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("modal-img");
    const modalCaption = document.getElementById("modal-caption");

    modal.style.display = "flex";
    modalImg.src = imageUrl;
    modalImg.alt = label || "圖片";
    modalCaption.textContent = label || "";

    // 支持通過鍵盤的 Esc 鍵關閉模態視窗
    document.addEventListener("keydown", handleEscKey);
}

// 隱藏模態視窗
function closeModal() {
    const modal = document.getElementById("image-modal");
    modal.style.display = "none";
    document.removeEventListener("keydown", handleEscKey);
}

// 通過鍵盤 Esc 鍵隱藏模態視窗
function handleEscKey(event) {
    if (event.key === "Escape") {
        closeModal();
    }
}

// 點擊外部關閉模態視窗
window.onclick = function (event) {
    const modal = document.getElementById("image-modal");
    if (event.target === modal) {
        closeModal();
    }
};

// 初始化篩選功能
function initFilter(filterId, listId) {
    const filterInput = document.getElementById(filterId);
    filterInput.addEventListener("input", () => {
        const filterValue = filterInput.value.toLowerCase();
        const listItems = document.querySelectorAll(`#${listId} .list-item`);
        listItems.forEach((item) => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(filterValue) ? "" : "none";
        });
    });
}

// 顯示載入中旋轉器
function showLoadingSpinner() {
    const spinner = document.getElementById("loading-spinner");
    spinner.style.display = "flex";
}

// 隱藏載入中旋轉器
function hideLoadingSpinner() {
    const spinner = document.getElementById("loading-spinner");
    spinner.style.display = "none";
}

// 顯示錯誤訊息
function showErrorMessage(message) {
    const errorDiv = document.createElement("div");
    errorDiv.classList.add("error-message");
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// 顯示提示訊息
function showToast(message) {
    const toast = document.createElement("div");
    toast.classList.add("toast-message");
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("fade-out");
    }, 3000);

    toast.addEventListener("transitionend", () => {
        toast.remove();
    });
}