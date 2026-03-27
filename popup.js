// ==================== 从 storage.js 导入所需函数 ====================
import {
    initDefaultData,
    getCurrentConfig,
    incrementUsedSpinTimes,
    resetAll,
    saveSpinResult,      
    getSpinResults,      
    clearSpinResults     
} from './js/storage.js';

import { getCurrentLanguage, setLanguage, t, toggleLanguage } from './js/i18n.js';


// ==================== 全局变量说明 ====================

/**
 * 当前转盘的所有条目（从 storage 读取）
 * @type {string[]}
 */
let currentItems = [];

/**
 * 当前设置的转动总次数
 * @type {number}
 */
let totalSpinCount = 0;

/**
 * 本次已经转动的次数
 * @type {number}
 */
let usedSpinTimes = 0;

/**
 * 存储每次转动的结果（用于结果列表展示）
 * @type {string[]}
 */
let spinResults = [];


// ==================== DOM 元素（在 DOMContentLoaded 后初始化）====================

let elements = {
    wheel: null,
    wheelLabels: null,
    resultsList: null,
    spinBtn: null,
    resetBtn: null,
    openSettingBtn: null,
    spinInfo: null,
    resultsTitle: null,
    langToggle: null   // 新增
};

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', async () => {
    // 确保 DOM 就绪后再获取元素
    elements.wheel = document.getElementById('wheel');
    elements.wheelLabels = document.getElementById('wheel-labels');
    elements.resultsList = document.getElementById('results-list');
    elements.spinBtn = document.getElementById('spin-btn');
    elements.resetBtn = document.getElementById('reset-btn');
    elements.openSettingBtn = document.getElementById('open-setting-btn');
    elements.spinInfo = document.getElementById('spin-info');
    elements.resultsTitle = document.getElementById('results-title');  
    elements.langToggle = document.getElementById('lang-toggle');       

    await initPopup();
});


/**
 * 初始化 popup 页面
 */
async function initPopup() {
    // 1. 加载语言
    await getCurrentLanguage();

    // 2. 初始化 storage 默认数据
    await initDefaultDataIfNeeded();

    // 3. 加载当前转盘数据
    await loadCurrentWheelData();

    // 4. 加载并渲染结果历史
    await loadAndRenderResults();

    // 5. 渲染转盘
    renderWheel();

    // 6. 更新状态显示
    updateSpinInfo();

    // 7. 应用语言
    applyLanguageToPopup();

    // 8. 绑定按钮事件
    bindEvents();
}


/**
 * 如果需要，初始化默认数据
 */
async function initDefaultDataIfNeeded() {
    const result = await initDefaultData();
    if (result.success) {
        console.log('已初始化默认数据');
    }
}


// ==================== 应用语言到popup页面 ====================

/**
 * 应用语言到 Popup 页面
 */
function applyLanguageToPopup() {
    // 结果标题
    if (elements.resultsTitle) {
        elements.resultsTitle.textContent = t('resultsTitle');
    }

    // 操作按钮
    if (elements.spinBtn) elements.spinBtn.textContent = t('spinBtn');
    if (elements.resetBtn) elements.resetBtn.textContent = t('resetBtn');
    if (elements.openSettingBtn) elements.openSettingBtn.textContent = t('openSettingBtn');

    // 状态文字（动态部分在 updateSpinInfo 中处理）
    updateSpinInfo();
}


// ==================== 数据加载与转盘渲染 ====================

/**
 * 从 storage 加载当前转盘数据
 */
async function loadCurrentWheelData() {
    const config = await getCurrentConfig();
    
    currentItems = config.items || [];
    totalSpinCount = config.spinCount || 0;
    usedSpinTimes = config.usedSpinTimes || 0;
    
    // 如果 currentItems 为空，显示提示状态
    if (currentItems.length === 0) {
        elements.wheel.style.background = '#334155';
        elements.spinBtn.disabled = true;
    }
}


/**
 * 渲染转盘：conic-gradient 扇区 + SVG 竖排径向文字
 *
 * 文字排列原理（writing-mode="tb"）：
 *   - writing-mode="tb" 让字符从上到下排列（第二字在第一字下方）
 *   - transform 链：
 *       translate(cx, cy)         → 原点移到圆心
 *       rotate(rotateDeg)         → X轴对准扇区中心的径向方向（朝外）
 *       rotate(-90)               → 将 writing-mode=tb 的"向下"旋转为"向外"
 *       translate(0, -radialMid)  → 文字中心移到半径中点
 *   - 最终效果：文字竖排，从转盘边缘指向圆心，居于扇区中线
 */
function renderWheel() {
    if (currentItems.length === 0) {
        elements.wheel.style.background = '#334155';
        if (elements.wheelLabels) elements.wheelLabels.innerHTML = '';
        return;
    }
 
    const sliceCount = currentItems.length;
    const sliceAngle = 360 / sliceCount;
 
    // ---- conic-gradient ----
    const colors = [
        '#ef4444', '#f97316', '#eab308', '#22c55e',
        '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
    ];
 
    let gradientParts = [];
    let angleCursor = 0;
 
    currentItems.forEach((item, index) => {
        const color = colors[index % colors.length];
        const nextAngle = angleCursor + sliceAngle;
        gradientParts.push(`${color} ${angleCursor}deg ${nextAngle}deg`);
        angleCursor = nextAngle;
    });
 
    elements.wheel.style.background = `conic-gradient(${gradientParts.join(', ')})`;
 
    // ---- SVG 竖排文字（逐字符极坐标定位）----
    // viewBox 300×300，圆心 (150,150)，.wheel 有 12px border
    // 不使用 writing-mode，改为逐字符计算 (x,y) 坐标，沿径向排列
    // 每个字符绕自身中心旋转，朝向与半径方向垂直（即字的"顶"朝外）
    const cx = 150, cy = 150;
    const outerR = 122;   // 文字最外侧字符的中心
    const innerR = 50;    // 文字最内侧字符的中心
    const maxChars = 5;
    const fontSize = 13;
    const charStep = (outerR - innerR) / (maxChars - 1 || 1); // 字符间距
 
    let svgContent = '';
 
    currentItems.forEach((item, index) => {
        const label = item.length > maxChars
            ? item.slice(0, maxChars) + '…'
            : item;
 
        // 扇区中心角（CSS conic-gradient: 0°=顶部，顺时针）转为标准数学角（弧度）
        // CSS 0° = 顶部 = 数学 90°（3点钟为0），顺时针 = 数学逆时针
        // 所以：数学角 = 90° - midAngleDeg（CSS）
        const midAngleDeg = index * sliceAngle + sliceAngle / 2;
        const mathAngleRad = (90 - midAngleDeg) * Math.PI / 180;
 
        const charCount = label.length;
        // 所有字符占用的总径向长度
        const totalSpan = (charCount - 1) * charStep;
        // 第一个字符的半径（最靠外）
        const startR = (outerR + innerR) / 2 + totalSpan / 2;
 
        // 每个字符需要旋转的角度：使字符"正立"朝向圆心
        // 在标准坐标系中，字符顶朝上(90°)，需旋转到指向圆心方向
        // 字符朝向 = midAngleDeg（从顶部顺时针），转为 SVG rotate 角度
        const charRotateDeg = midAngleDeg;
 
        let groupContent = '';
        for (let i = 0; i < charCount; i++) {
            const r = startR - i * charStep; // 从外到内
            const x = cx + r * Math.cos(mathAngleRad);
            const y = cy - r * Math.sin(mathAngleRad);
 
            groupContent += `<text
                x="${x.toFixed(2)}"
                y="${y.toFixed(2)}"
                text-anchor="middle"
                dominant-baseline="central"
                font-size="${fontSize}"
                font-weight="600"
                font-family="system-ui, -apple-system, sans-serif"
                fill="rgba(255,255,255,0.95)"
                transform="rotate(${charRotateDeg},${x.toFixed(2)},${y.toFixed(2)})"
            >${label[i]}</text>`;
        }
 
        svgContent += groupContent;
    });
 
    if (elements.wheelLabels) {
        elements.wheelLabels.innerHTML = svgContent;
    }
 
    console.log('转盘已渲染，扇区数量：', sliceCount);
}

/**
 * 更新转动次数状态显示
 */
function updateSpinInfo() {
    const text = t('spinInfoDefault').replace('0', usedSpinTimes).replace('0', totalSpinCount);
    elements.spinInfo.textContent = text;
    
    if (usedSpinTimes >= totalSpinCount || totalSpinCount === 0) {
        elements.spinBtn.disabled = true;
    } else {
        elements.spinBtn.disabled = false;
    }
}

// ==================== 转动核心逻辑 ====================

/**
 * 执行一次转动（点击「开始转动」后调用）
 */
async function performSpin() {
    if (currentItems.length < 2 || usedSpinTimes >= totalSpinCount) {
        return;
    }

    const incrementResult = await incrementUsedSpinTimes();
    if (!incrementResult.success) {
        alert(incrementResult.message);
        return;
    }

    usedSpinTimes = incrementResult.currentUsed || usedSpinTimes + 1;

    const randomIndex = Math.floor(Math.random() * currentItems.length);
    const selectedItem = currentItems[randomIndex];

    const sliceAngle = 360 / currentItems.length;
    const targetAngle = randomIndex * sliceAngle + (sliceAngle / 2);
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const finalRotate = extraSpins * 360 + (360 - targetAngle);

    elements.wheel.style.transition = 'transform 4s cubic-bezier(0.23, 1, 0.32, 1)';
    elements.wheel.style.transform = `rotate(${finalRotate}deg)`;
    elements.wheelLabels.style.transition = 'transform 4s cubic-bezier(0.23, 1, 0.32, 1)';
    elements.wheelLabels.style.transform = `rotate(${finalRotate}deg)`;

    setTimeout(async () => {
        elements.wheel.style.transition = 'transform 0.3s';
        elements.wheel.style.transform = `rotate(${finalRotate}deg) scale(1.03)`;
        elements.wheelLabels.style.transition = 'transform 0.3s';
        elements.wheelLabels.style.transform = `rotate(${finalRotate}deg) scale(1.03)`;

        // 保存结果到 storage
        await saveSpinResult(selectedItem);
        // 重新加载并渲染结果列表
        const updatedResults = await getSpinResults();
        renderResultsList(updatedResults);

        updateSpinInfo();

        setTimeout(() => {
            elements.wheel.style.transform = `rotate(${finalRotate}deg)`;
            elements.wheelLabels.style.transform = `rotate(${finalRotate}deg)`;
        }, 300);
    }, 4000);
}



/**
 * 从 storage 加载结果并渲染列表
 */
async function loadAndRenderResults() {
    const results = await getSpinResults();
    renderResultsList(results);
}


/**
 * 渲染结果列表
 */
function renderResultsList(results) {
    elements.resultsList.innerHTML = '';
    results.forEach((result) => {
        const li = document.createElement('li');
        li.textContent = result;
        elements.resultsList.appendChild(li);
    });
    // 自动滚动到底部
    if (elements.resultsList.scrollHeight) {
        elements.resultsList.scrollTop = elements.resultsList.scrollHeight;
    }
}


/**
 * 重置整个 popup（对应「重置」按钮）
 */
async function resetPopup() {
    if (!confirm('确定要重置吗？当前转盘数据和所有结果将被清除，需要重新进入设置页面配置。')) {
        return;
    }

    const result = await resetAll();
    if (result.success) {
        // 重新加载当前配置（已被重置为空）
        await loadCurrentWheelData();
        renderWheel();

        // 结果历史已被 resetAll 清空，重新渲染空列表
        const emptyResults = await getSpinResults();
        renderResultsList(emptyResults);

        updateSpinInfo();
        alert('已重置！请点击「前往设置」重新配置转盘。');
    }
}


// ==================== 事件绑定与完整初始化 ====================


/**
 * 绑定所有按钮事件
 */
function bindEvents() {
    // 开始转动按钮
    elements.spinBtn.addEventListener('click', () => {
        performSpin();
    });

    // 重置按钮
    elements.resetBtn.addEventListener('click', () => {
        resetPopup();
    });

    // 前往设置按钮
    elements.openSettingBtn.addEventListener('click', () => {
        openSettingPage();
    });

    // 语言切换按钮
    if (elements.langToggle) {
        elements.langToggle.addEventListener('click', async () => {
            await toggleLanguage();           // 切换语言并保存到 storage

            // 立即刷新当前 Popup 页面的语言
            applyLanguageToPopup();

            // 安全地通知 setting 页面（如果它打开着）
            // 使用 try-catch 避免 "Receiving end does not exist" 错误
            try {
                chrome.runtime.sendMessage({ action: 'languageChanged' });
            } catch (err) {
                // 正常情况：setting 页面未打开，这是预期行为，不需要报错
                console.log('No setting page is open, language change applied to popup only.');
            }
        });
    }
}


/**
 * 打开设置页面（新标签页）
 */
function openSettingPage() {
    const settingUrl = chrome.runtime.getURL('setting.html');
    chrome.tabs.create({ url: settingUrl });
}


/**
 * 监听 storage 变化（可选增强：当在 setting 中保存后，popup 重新打开时自动刷新）
 * 这里我们主要依赖页面重新加载时 initPopup
 */
chrome.storage.onChanged.addListener((changes) => {
    // 如果 currentItems 或 spinCount 发生变化，则刷新转盘
    if (changes.currentItems || changes.spinCount || changes.usedSpinTimes) {
        console.log('检测到 storage 变化，准备刷新转盘...');
        // 因为 popup 通常在关闭后重新打开，这里只是日志，实际刷新在 initPopup 中完成
    }
});

// ==================== 导出与最终初始化调用 ====================

// 页面加载完成后执行（已在第一部分定义）