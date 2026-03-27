// ==================== 从 storage.js 导入所需函数 ====================
import {
    initDefaultData,
    getCurrentConfig,
    saveCurrentConfig,
    getLastUsed,
    getAllPresets,
    addPreset,
    deletePreset,
    usePreset,
    setStorage
} from './js/storage.js';
import { getCurrentLanguage, setLanguage, t } from './js/i18n.js';

// ==================== 全局变量说明 ====================

/**
 * 当前正在编辑的条目列表（内存中的临时数据）
 * @type {string[]}
 */
let currentEditingItems = [];


/**
 * 当前正在编辑的转动次数
 * @type {number}
 */
let currentEditingSpinCount = 3;


// ==================== DOM 元素 ====================


const elements = {
    itemsList: document.getElementById('items-list'),
    itemCount: document.getElementById('item-count'),
    spinCountInput: document.getElementById('spinCount'),
    addItemBtn: document.getElementById('add-item'),
    saveCurrentBtn: document.getElementById('save-current'),
    collectPresetBtn: document.getElementById('collect-preset'),
    lastUsedContainer: document.getElementById('last-used-container'),
    lastUsedContent: document.getElementById('last-used-content'),
    presetList: document.getElementById('preset-list'),
    backToPopupBtn: document.getElementById('back-to-popup')
};


// ==================== 初始化入口 ====================


document.addEventListener('DOMContentLoaded', async () => {
    // 1. 初始化 storage 默认数据（如果需要）
    await initDefaultDataIfNeeded();

    // 加载语言
    await getCurrentLanguage();
    // 2. 加载上一次方案和所有 presets
    await loadLastUsed();
    await loadAllPresets();

    // 3. 加载当前编辑区（从 currentItems 开始）
    await loadCurrentEditingData();

    // 渲染语言
    applyLanguage();

    // 4. 绑定所有事件
    bindEvents();

    // 监听来自 popup 的语言切换消息
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'languageChanged') {
            getCurrentLanguage().then(() => {
                applyLanguage();
                loadLastUsed();
                loadAllPresets();
            });
        }
    });
});


/**
 * 如果需要，初始化默认数据
 */
async function initDefaultDataIfNeeded() {
    const result = await initDefaultData();
    if (result.success) {
        console.log(result.message);
    }
}


// ==================== 条目列表渲染与操作 ====================

/**
 * 加载当前编辑区的数据（从 storage 读取 currentItems）
 */
async function loadCurrentEditingData() {
    const config = await getCurrentConfig();
    
    currentEditingItems = [...config.items];           // 深拷贝
    currentEditingSpinCount = config.spinCount || 3;

    // 更新输入框
    elements.spinCountInput.value = currentEditingSpinCount;

    // 渲染列表
    renderItemsList();
}


/**
 * 渲染条目列表（现代布局：每行右侧带上移、下移、删除按钮）
 */
function renderItemsList() {
    elements.itemsList.innerHTML = '';
    
    currentEditingItems.forEach((item, index) => {
        const li = document.createElement('li');
        const displayValue = item === undefined ? '' : item;
        
        li.innerHTML = `
            <input type="text" 
                   value="${escapeHtml(displayValue)}" 
                   data-index="${index}" 
                   placeholder="${t('itemPlaceholder')}">
            <button class="move-up" data-index="${index}">↑</button>
            <button class="move-down" data-index="${index}">↓</button>
            <button class="delete-btn" data-index="${index}">${t('deleteBtn')}</button>
        `;
        
        elements.itemsList.appendChild(li);
    });
    
    elements.itemCount.textContent = `(${currentEditingItems.length})`;
    bindItemListEvents();
}

/**
 * 转译Html特定符合
 * @param {*} str 
 * @returns {string}
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

/**
 * 绑定条目列表中每个按钮的事件（上移、下移、删除、输入变化）
 */
function bindItemListEvents() {
    // 输入框实时更新
    elements.itemsList.querySelectorAll('input[type="text"]').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            currentEditingItems[index] = e.target.value.trim();
        });
    });

    // 上移按钮
    elements.itemsList.querySelectorAll('.move-up').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (index > 0) {
                [currentEditingItems[index], currentEditingItems[index - 1]] = 
                [currentEditingItems[index - 1], currentEditingItems[index]];
                renderItemsList();
            }
        });
    });

    // 下移按钮
    elements.itemsList.querySelectorAll('.move-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (index < currentEditingItems.length - 1) {
                [currentEditingItems[index], currentEditingItems[index + 1]] = 
                [currentEditingItems[index + 1], currentEditingItems[index]];
                renderItemsList();
            }
        });
    });

    // 删除按钮
    elements.itemsList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (currentEditingItems.length <= 2) {
                alert(t('atLeast2Items'));
                return;
            }
            currentEditingItems.splice(index, 1);
            renderItemsList();
        });
    });
}


/**
 * 新增一个空条目
 */
function addNewItem() {
    if (currentEditingItems.length >= 50) {
        alert(t('max50Items'));
        return;
    }
    currentEditingItems.push('');
    renderItemsList();
    
    // 自动聚焦到最后一个输入框
    setTimeout(() => {
        const lastInput = elements.itemsList.querySelector('li:last-child input');
        if (lastInput) lastInput.focus();
    }, 10);
}





// ==================== 主按钮与事件绑定 ====================


/**
 * 绑定所有全局按钮事件
 */
function bindEvents() {
    // 新增条目按钮
    elements.addItemBtn.addEventListener('click', addNewItem);

    // 转动次数输入框实时同步
    elements.spinCountInput.addEventListener('input', () => {
        currentEditingSpinCount = parseInt(elements.spinCountInput.value) || 1;
    });

    // 「确定」按钮
    elements.saveCurrentBtn.addEventListener('click', async () => {
        const result = await saveCurrentConfig(currentEditingItems, currentEditingSpinCount);
        
        if (result.success) {
            alert(t(result.messageKey || 'saveSuccess'));
            await loadLastUsed();
        } else {
            alert(t(result.messageKey || 'saveFailed'));
        }
    });

    // 「收藏为新方案」按钮
    elements.collectPresetBtn.addEventListener('click', async () => {
        const name = prompt(t('enterPresetName'));
        if (!name || name.trim() === '') return;

        const result = await addPreset(name.trim(), currentEditingItems, currentEditingSpinCount);
        
        if (result.success) {
            alert(t(result.messageKey || 'collectSuccess'));
            await loadAllPresets();
        } else {
           alert(t(result.messageKey || 'operationFailed'));
        }
    });

    // 「返回转盘」按钮
    elements.backToPopupBtn.addEventListener('click', () => {
        window.close();
    });
}


// ==================== 应用当前语言到所有固定文本 ====================


/**
 * 应用当前语言到所有固定文本
 */
function applyLanguage() {
    // header
    document.querySelector('h1').textContent = t('extensionName');
    elements.backToPopupBtn.textContent = t('backToWheel');

    // 左侧
    document.querySelector('.spin-count label').textContent = t('spinCountLabel');
    document.querySelector('.items-header h3').childNodes[0].textContent = t('itemsListTitle') + ' '; // 保留 span

    elements.addItemBtn.textContent = t('addItemBtn');
    elements.saveCurrentBtn.textContent = t('saveCurrentBtn');
    elements.collectPresetBtn.textContent = t('collectPresetBtn');
    
    // 右侧标题
    const titles = document.querySelectorAll('.preset-section h3');
    if (titles[0]) titles[0].textContent = t('lastUsedTitle');
    if (titles[1]) titles[1].textContent = t('presetsTitle');

    // 动态内容会通过 loadAllPresets / loadLastUsed 重新渲染
    // 所以我们在那些函数里也用 t()
    renderItemsList();
}


// ==================== 上一次方案与收藏方案渲染 ====================


/**
 * 加载并显示「上一次方案」
 */
async function loadLastUsed() {
    const lastUsed = await getLastUsed();
    if (!lastUsed) {
        elements.lastUsedContent.innerHTML = `<p>${t('noPresets')}</p>`;
        return;
    }

    const itemsText = lastUsed.items.join('、');
    
    elements.lastUsedContent.innerHTML = `
        <div class="preset-card">
            <strong>${t('lastSavedTime')}：</strong> ${new Date(lastUsed.timestamp).toLocaleString('zh-CN')}<br>
            <strong>${t('itemCountLabel')}：</strong> ${lastUsed.items.length} <br>
            <strong>${t('itemContentLabel')}：</strong> ${itemsText}<br>
            <strong>${t('spinCountLabel')}：</strong> ${lastUsed.spinCount}<br><br>
            <button class="use-lastused-btn">${t('useBtn')}</button>
        </div>
    `;

    // 绑定「使用此方案」按钮
    elements.lastUsedContent.querySelector('.use-lastused-btn').addEventListener('click', () => {
        useSchemeData(lastUsed.items, lastUsed.spinCount);
    });
}


/**
 * 加载并显示所有已收藏方案
 */
async function loadAllPresets() {
    const presets = await getAllPresets();
    elements.presetList.innerHTML = '';

    if (Object.keys(presets).length === 0) {
        elements.presetList.innerHTML = `<p>${t('noPresets')}</p>`;
        return;
    }

    const sortedPresets = Object.values(presets).sort((a, b) => 
        new Date(b.lastUsed) - new Date(a.lastUsed)
    );

    sortedPresets.forEach(preset => {
        const div = document.createElement('div');
        const itemsText = preset.items.join('、');
        div.className = 'preset-card';
        div.innerHTML = `
            <strong>${escapeHtml(preset.name)}</strong><br>
            <small>${t('lastUsedTime')}：${new Date(preset.lastUsed).toLocaleString('zh-CN')}</small><br>
            <span>${t('itemCountLabel')}：${preset.items.length} </span><br>
            <span>${t('itemContentLabel')}：${itemsText}</span><br>
            <span>${t('spinCountLabel')}：${preset.spinCount}</span><br><br>
            <button class="use-preset-btn" data-name="${escapeHtml(preset.name)}">${t('useBtn')}</button>
            <button class="pin-preset-btn" data-name="${escapeHtml(preset.name)}">${t('pinBtn')}</button>
            <button class="delete-preset-btn" data-name="${escapeHtml(preset.name)}">${t('deleteBtn')}</button>
        `;
        elements.presetList.appendChild(div);
    });

    // 绑定使用、置顶、删除按钮
    bindPresetButtons();
}

/**
 * 绑定所有方案卡片上的使用/置顶/删除按钮
 */
function bindPresetButtons() {
    // 使用按钮
    elements.presetList.querySelectorAll('.use-preset-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const name = e.target.dataset.name;
            const result = await usePreset(name);
            if (result.success) {
                useSchemeData(result.data.items, result.data.spinCount);
            } else {
                alert(result.message);
            }
        });
    });

    // 置顶按钮
    elements.presetList.querySelectorAll('.pin-preset-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const name = e.target.dataset.name;
            const result = await pinPresetToTop(name);
            
            if (result.success) {
                alert(t('pinSuccess', name));
                await loadAllPresets();   // 重新渲染，让置顶方案排在最前面
            } else {
                alert(result.message || t('FailedPin'));
            }
        });
    });

    // 删除按钮
    elements.presetList.querySelectorAll('.delete-preset-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm(t('deleteConfirm'))) return;
            
            const name = e.target.dataset.name;
            const result = await deletePreset(name);
            if (result.success) {
                alert(result.message);
                await loadAllPresets();
            } else {
                alert(result.message);
            }
        });
    });
}


/**
 * 把方案数据填充到当前编辑区（使用上一次方案或收藏方案时调用）
 * @param {string[]} items 
 * @param {number} spinCount 
 */
function useSchemeData(items, spinCount) {
    currentEditingItems = [...items];
    currentEditingSpinCount = spinCount;
    
    elements.spinCountInput.value = spinCount;
    renderItemsList();
    
    alert(t('useLoaded'));
}


/**
 * 将指定收藏方案置顶（通过更新 lastUsed 时间实现排序到最前面）
 * @param {string} name 方案名称
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function pinPresetToTop(name) {
    const presets = await getAllPresets();
    
    if (!presets[name]) {
        return { success: false, message: t('ItemDoesNotExist') };
    }

    // 更新最后使用时间（越新越靠前）
    presets[name].lastUsed = new Date().toISOString();

    await setStorage({ presets });   // 注意：这里直接用 { presets } 即可，因为 storage.js 中 key 是 'presets'

    return { success: true };
}


