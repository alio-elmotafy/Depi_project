(function () {
    document.addEventListener("DOMContentLoaded", function () {
        // ====== Mobile Menu Toggle ======
    const menuIcon = document.querySelector(".menu-icon");
    const navDesktop = document.querySelector(".nav-desktop");

    if (menuIcon && navDesktop) {
        menuIcon.addEventListener("click", () => {
            navDesktop.classList.toggle("mobile-active");
        });
    }
        const API_URL = (window.__FRIDGO_API_URL__ || localStorage.getItem("backendUrl") || "https://attribute-quiver-hubcap.ngrok-free.dev").replace(/\/$/, "");
        const sessionId = crypto.randomUUID();
        let currentIngredients = [];
        let currentFile = null;
        let localPreviewUrl = "";
        let currentRecipe = null;

        const getStartButtons = document.querySelectorAll(".get-start");
        getStartButtons.forEach((btn) => {
            btn?.addEventListener("click", (e) => {
                e.preventDefault();
                window.location.href = "./main_app_dashboard.html";
            });
        });

        const uploadZone = document.getElementById("uploadZone");
        const fileInput = document.getElementById("fileInput");
        const browseBtn = document.getElementById("browseBtn");
        const previewImage = document.getElementById("previewImage");
        const inventoryTags = document.getElementById("inventoryTags");
        const inventoryCount = document.getElementById("inventoryCount");
        const addItemInput = document.getElementById("addItemInput");
        const addItemBtn = document.getElementById("addItemBtn");
        const findRecipesBtn = document.getElementById("findRecipesBtn");
        const recipeGrid = document.getElementById("recipeGrid");
        const aiBody = document.querySelector(".ai-body");
        const aiInput = document.querySelector(".ai-input");
        const aiSend = document.querySelector(".ai-send");
        const processingOverlay = document.getElementById("processingOverlay");

        const isDashboardPage = Boolean(uploadZone && fileInput && browseBtn && previewImage && inventoryTags && inventoryCount && addItemInput && addItemBtn && findRecipesBtn && recipeGrid && aiBody && aiInput && aiSend);

        if (!isDashboardPage) {
            return;
        }

        const escapeHTML = (value) =>
            String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#39;");

        const normalizeIngredient = (value) =>
            String(value ?? "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");

        const setProcessingState = (isProcessing) => {
            if (!uploadZone) return;
            uploadZone.style.opacity = isProcessing ? "0.6" : "0.8";
            uploadZone.style.pointerEvents = isProcessing ? "none" : "auto";
            if (processingOverlay) {
                processingOverlay.style.display = isProcessing ? "flex" : "none";
            }
        };

        const addIngredient = (ingredient) => {
            const normalized = normalizeIngredient(ingredient);
            if (!normalized || currentIngredients.some((item) => item === normalized)) {
                return false;
            }
            currentIngredients.push(normalized);
            renderIngredients();
            return true;
        };

        uploadZone.addEventListener("click", (e) => {
            if (e.target === previewImage || e.target.closest(".preview-img") || e.target.closest("#processingOverlay")) {
                return;
            }
            fileInput.click();
        });

        browseBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            fileInput.click();
        });

        fileInput.addEventListener("change", () => {
            const file = fileInput.files?.[0];
            if (!file) return;

            currentFile = file;
            if (localPreviewUrl) {
                URL.revokeObjectURL(localPreviewUrl);
            }
            localPreviewUrl = URL.createObjectURL(file);

            previewImage.src = localPreviewUrl;
            previewImage.style.display = "block";
            detectIngredients(file);
        });

        async function detectIngredients(file) {
            setProcessingState(true);

            const formData = new FormData();
            formData.append("file", file);

            try {
                const res = await fetch(`${API_URL}/api/detect`, {
                    method: "POST",
                    headers: {
                        "ngrok-skip-browser-warning": "true",
                    },
                    body: formData,
                });

                if (!res.ok) {
                    throw new Error(`Detection failed with status ${res.status}`);
                }

                const data = await res.json();

                if (data?.success) {
                    if (data.image_base64) {
                        const mimeType = data.mime_type || "image/jpeg";
                        previewImage.src = `data:${mimeType};base64,${data.image_base64}`;
                    } else if (localPreviewUrl) {
                        previewImage.src = localPreviewUrl;
                    }
                    currentIngredients = Array.isArray(data.ingredients)
                        ? data.ingredients.map(normalizeIngredient).filter(Boolean)
                        : [];
                    renderIngredients();
                } else {
                    if (localPreviewUrl) {
                        previewImage.src = localPreviewUrl;
                    }
                    previewImage.style.display = "block";
                    window.alert("Could not detect ingredients. Try another image.");
                }
            } catch (error) {
                console.error("Detection Error:", error);
                if (localPreviewUrl) {
                    previewImage.src = localPreviewUrl;
                    previewImage.style.display = "block";
                }
                window.alert("Failed to connect to the AI backend. Make sure the backend and Ngrok URL are correct.");
            } finally {
                setProcessingState(false);
            }
        }

        function renderIngredients() {
            inventoryTags.innerHTML = "";

            if (currentIngredients.length === 0) {
                inventoryTags.innerHTML = '<p style="color: var(--on-surface-variant); font-size: 14px;">No ingredients yet.</p>';
                inventoryCount.textContent = "0 ITEMS";
                findRecipesBtn.disabled = true;
                return;
            }

            currentIngredients.forEach((ing, index) => {
                const tag = document.createElement("div");
                tag.className = "inventory-tag";
                tag.innerHTML = `
                    <span class="material-symbols-outlined" style="font-size:16px; color: var(--on-surface-variant);">grass</span>
                    ${escapeHTML(ing.charAt(0).toUpperCase() + ing.slice(1))}
                    <span class="material-symbols-outlined remove-tag" data-index="${index}" style="font-size:16px; color: #ff4444; cursor: pointer; margin-left: 8px;">close</span>
                `;
                inventoryTags.appendChild(tag);
            });

            inventoryCount.textContent = `${currentIngredients.length} ITEM${currentIngredients.length === 1 ? "" : "S"}`;
            findRecipesBtn.disabled = false;

            document.querySelectorAll(".remove-tag").forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    const idx = parseInt(e.target.getAttribute("data-index"), 10);
                    if (!Number.isNaN(idx)) {
                        currentIngredients.splice(idx, 1);
                        renderIngredients();
                    }
                });
            });
        }

        addItemBtn.addEventListener("click", () => {
            const value = addItemInput.value.trim();
            if (value) {
                addIngredient(value);
                addItemInput.value = "";
            }
        });

        addItemInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const value = addItemInput.value.trim();
                if (value) {
                    addIngredient(value);
                    addItemInput.value = "";
                }
            }
        });

        findRecipesBtn.addEventListener("click", async () => {
            if (currentIngredients.length === 0) return;

            findRecipesBtn.disabled = true;
            findRecipesBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> Analyzing...';
            recipeGrid.innerHTML = '<div class="chat-loading">Searching for optimal recipes...</div>';

            try {
                const res = await fetch(`${API_URL}/api/recipes`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "true",
                    },
                    body: JSON.stringify({ ingredients: currentIngredients }),
                });

                if (!res.ok) {
                    throw new Error(`Recipes failed with status ${res.status}`);
                }

                const data = await res.json();

                if (data?.success) {
                    renderRecipes(data.recipes || data.recipes_md || []);
                } else {
                    recipeGrid.innerHTML = '<p>No recipes found for these ingredients.</p>';
                }
            } catch (error) {
                console.error("Recipe Error:", error);
                recipeGrid.innerHTML = '<p style="color: #ff4444;">Failed to fetch recipes.</p>';
            } finally {
                findRecipesBtn.disabled = false;
                findRecipesBtn.innerHTML = '<span class="material-symbols-outlined">restaurant_menu</span> Find Recipes';
            }
        });

        function renderRecipes(recipesPayload) {
            recipeGrid.innerHTML = "";

            let recipes = [];
            if (Array.isArray(recipesPayload)) {
                recipes = recipesPayload;
            } else if (typeof recipesPayload === "string") {
                recipes = String(recipesPayload || "")
                    .split(/(?:\n|^)\s*---\s*(?:\n|$)/)
                    .map((recipe) => recipe.trim())
                    .filter(Boolean);
            }

            if (recipes.length === 0) {
                recipeGrid.innerHTML = "<p>No recipes matched your ingredients.</p>";
                return;
            }

            recipes.forEach((recipe, index) => {
                const recipeTitle = recipe?.title || `Recipe ${index + 1}`;
                const matchPercent = Number.isFinite(Number(recipe?.match_percentage)) ? Number(recipe.match_percentage) : "?";
                const matchedIngredients = Array.isArray(recipe?.matched_ingredients) ? recipe.matched_ingredients : [];
                const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
                const directions = Array.isArray(recipe?.directions) ? recipe.directions : [];

                const card = document.createElement("div");
                card.className = "recipe-card-dynamic";

                const renderedIngredients = ingredients.length
                    ? ingredients.map((item) => `<div style="padding-left:8px; font-size:13px; color:var(--on-surface-variant);">• ${escapeHTML(item)}</div>`).join("")
                    : "";

                const renderedDirections = directions.length
                    ? directions.map((step, stepIndex) => `<div style="margin-bottom:6px;">${stepIndex + 1}. ${escapeHTML(step)}</div>`).join("")
                    : "";

                card.innerHTML = `
                    <div class="recipe-match-badge">${matchPercent}% MATCH</div>
                    <div class="recipe-title-dynamic">${escapeHTML(recipeTitle)}</div>
                    ${matchedIngredients.length ? `<div class="recipe-matched-ings">🟢 Matched: ${escapeHTML(matchedIngredients.join(", "))}</div>` : ""}
                    ${ingredients.length ? `<div style="font-weight:600; margin-bottom:6px; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:var(--on-surface-variant);">Ingredients:</div>${renderedIngredients}` : ""}
                    ${directions.length ? `<div class="recipe-desc-dynamic"><div style="font-weight:600; margin-bottom:6px; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:var(--on-surface-variant);">Directions:</div>${renderedDirections}</div>` : ""}
                    <button class="recipe-cta" type="button" aria-label="Ask AI to modify">
                        <span class="material-symbols-outlined" style="font-size:16px;">chat</span>
                    </button>
                `;

                const recipeButton = card.querySelector(".recipe-cta");
                recipeButton?.addEventListener("click", () => {
                    currentRecipe = {
                        title: recipeTitle,
                        ingredients: ingredients.map((item) => normalizeIngredient(item)).filter(Boolean),
                        directions,
                    };
                    aiInput?.focus();
                    if (aiInput) {
                        aiInput.placeholder = `Ask about \"${recipeTitle}\"...`;
                    }
                });

                recipeGrid.appendChild(card);
            });
        }

        aiSend?.addEventListener("click", sendChat);
        aiInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                sendChat();
            }
        });

        async function sendChat() {
            const msg = aiInput.value.trim();
            if (!msg) return;

            appendChatMessage(msg, "user");
            aiInput.value = "";
            const loadingId = appendChatMessage("", "loading");

            try {
                const res = await fetch(`${API_URL}/api/chat`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "true",
                    },
                    body: JSON.stringify({
                        message: msg,
                        recipe: currentRecipe,
                        session_id: sessionId,
                        available_ingredients: currentIngredients,
                    }),
                });

                if (!res.ok) {
                    throw new Error(`Chat failed with status ${res.status}`);
                }

                const data = await res.json();

                document.getElementById(loadingId)?.remove();
                appendChatMessage(data?.reply || "Sorry, I couldn't process that.", "ai");
            } catch (error) {
                console.error("Chat Error:", error);
                document.getElementById(loadingId)?.remove();
                appendChatMessage("LLM backend is not connected yet.", "ai");
            }
        }

        function appendChatMessage(text, type) {
            const id = "msg-" + Date.now();
            const div = document.createElement("div");
            div.id = id;

            if (type === "user") {
                div.className = "ai-message";
                div.style.justifyContent = "flex-end";
                div.innerHTML = `<div class="ai-bubble" style="background: var(--surface-container-high); border-radius: 12px; border-top-right-radius: 0; max-width: 80%;">${escapeHTML(text)}</div>`;
            } else if (type === "loading") {
                div.className = "chat-loading";
                div.innerHTML = "Analyzing...";
            } else {
                div.className = "ai-message";
                div.innerHTML = `
                    <div class="ai-avatar"><span class="material-symbols-outlined" style="font-size:18px; color: var(--primary);">smart_toy</span></div>
                    <div class="ai-bubble">${escapeHTML(text).replace(/\n/g, "<br>")}</div>
                `;
            }

            aiBody.appendChild(div);
            aiBody.scrollTop = aiBody.scrollHeight;
            return id;
        }
    });
})();