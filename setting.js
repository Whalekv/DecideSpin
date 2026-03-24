// ==================== 从 storage.js 导入所需函数 ====================
import {
    initDefaultData,
    getCurrentConfig,
    saveCurrentConfig,
    getLastUsed,
    getAllPresets,
    addPreset,
    deletePreset,
    usePreset
} from './js/storage.js';


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

    // 2. 加载上一次方案和所有 presets
    await loadLastUsed();
    await loadAllPresets();

    // 3. 加载当前编辑区（从 currentItems 开始）
    await loadCurrentEditingData();

    // 4. 绑定所有事件
    bindEvents();
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

        li.innerHTML = `
            <input type="text" value="${item}" data-index="${index}">
            <button class="move-up" data-index="${index}">↑</button>
            <button class="move-down" data-index="${index}">↓</button>
            <button class="delete-btn" data-index="${index}">删除</button>
        `;

        elements.itemsList.appendChild(li);
    });

    // 更新计数
    elements.itemCount.textContent = `(${currentEditingItems.length})`;

    // 绑定当前列表内的事件
    bindItemListEvents();
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
                alert('至少需要保留 2 个条目！');
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
        alert('条目数量最多不能超过 50 个！');
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

    // 「确定」按钮 - 保存当前配置并生效到转盘
    elements.saveCurrentBtn.addEventListener('click', async () => {
        const result = await saveCurrentConfig(currentEditingItems, currentEditingSpinCount);
        
        if (result.success) {
            alert('保存成功！转盘已更新为当前方案');
            // 保存成功后刷新上一次方案显示
            await loadLastUsed();
        } else {
            alert('保存失败：' + result.message);
        }
    });

    // 「收藏为新方案」按钮
    elements.collectPresetBtn.addEventListener('click', async () => {
        const name = prompt('请输入方案名称（不可重复）：');
        if (!name || name.trim() === '') return;

        const result = await addPreset(name.trim(), currentEditingItems, currentEditingSpinCount);
        
        if (result.success) {
            alert(result.message);
            await loadAllPresets();   // 刷新方案列表
        } else {
            alert('收藏失败：' + result.message);
        }
    });

    // 「返回转盘」按钮
    elements.backToPopupBtn.addEventListener('click', () => {
        window.close();   // 关闭当前设置标签页，返回 popup
    });
}


// ==================== 上一次方案与收藏方案渲染 ====================

/**
 * 加载并显示「上一次方案」
 */
async function loadLastUsed() {
    const lastUsed = await getLastUsed();
    if (!lastUsed) {
        elements.lastUsedContent.innerHTML = `<p>暂无上一次方案</p>`;
        return;
    }

    elements.lastUsedContent.innerHTML = `
        <div class="preset-card">
            <strong>最后保存时间：</strong> ${new Date(lastUsed.timestamp).toLocaleString('zh-CN')}<br>
            <strong>条目数量：</strong> ${lastUsed.items.length} 个<br>
            <strong>转动次数：</strong> ${lastUsed.spinCount} 次<br><br>
            <button class="use-lastused-btn">使用此方案</button>
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
        elements.presetList.innerHTML = '<p>暂无收藏方案</p>';
        return;
    }

    Object.values(presets).forEach(preset => {
        const div = document.createElement('div');
        div.className = 'preset-card';
        div.innerHTML = `
            <strong>${preset.name}</strong><br>
            <small>最后使用：${new Date(preset.lastUsed).toLocaleString('zh-CN')}</small><br>
            条目：${preset.items.length} 个 | 次数：${preset.spinCount}<br><br>
            <button class="use-preset-btn" data-name="${preset.name}">使用</button>
            <button class="delete-preset-btn" data-name="${preset.name}">删除</button>
        `;
        elements.presetList.appendChild(div);
    });

    // 绑定使用和删除按钮
    bindPresetButtons();
}


/**
 * 绑定所有方案卡片上的使用/删除按钮
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

    // 删除按钮
    elements.presetList.querySelectorAll('.delete-preset-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('确定要删除这个方案吗？')) return;
            
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
    
    alert('已加载到当前编辑区，您可以继续修改后点击「确定」生效');
}


