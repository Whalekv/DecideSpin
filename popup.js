// ==================== 从 storage.js 导入所需函数 ====================
import {
    initDefaultData,
    getCurrentConfig,
    incrementUsedSpinTimes,
    resetAll
} from './js/storage.js';


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

let elements = {};

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

    await initPopup();
});

/**
 * 初始化 popup 页面
 */
async function initPopup() {
    // 1. 初始化 storage 默认数据（防止首次使用为空）
    await initDefaultDataIfNeeded();

    // 2. 加载当前转盘数据
    await loadCurrentWheelData();

    // 3. 渲染转盘
    renderWheel();

    // 4. 更新状态显示
    updateSpinInfo();

    // 5. 绑定按钮事件
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
 
    // ---- SVG 竖排文字 ----
    // viewBox 300×300，圆心 (150,150)，.wheel 有 12px border
    const cx = 150, cy = 150;
    const outerR = 124;  // 文字顶端（靠近边缘，留出 border + 少许间距）
    const innerR = 48;   // 文字底端（靠近圆心）
    const radialMid = (outerR + innerR) / 2;
    const maxChars = 5;
    const fontSize = 13;
 
    let svgContent = '';
 
    currentItems.forEach((item, index) => {
        const label = item.length > maxChars
            ? item.slice(0, maxChars) + '…'
            : item;
 
        // 扇区中心角（CSS conic-gradient: 0°=顶部，顺时针）
        const midAngleDeg = index * sliceAngle + sliceAngle / 2;
        // SVG rotate: 0°=右侧，顺时针，-90 对齐顶部
        const rotateDeg = midAngleDeg - 90;
 
        svgContent += `<text
            x="0"
            y="0"
            text-anchor="middle"
            dominant-baseline="central"
            font-size="${fontSize}"
            font-weight="600"
            font-family="system-ui, -apple-system, sans-serif"
            fill="rgba(255,255,255,0.95)"
            writing-mode="tb"
            transform="translate(${cx},${cy}) rotate(${rotateDeg}) rotate(-90) translate(0,${-radialMid})"
        >${label}</text>`;
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
    elements.spinInfo.textContent = `已转动 ${usedSpinTimes} / ${totalSpinCount} 次`;
    
    // 如果已达到最大次数，禁用开始按钮
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

    // 1. 增加已转动次数
    const incrementResult = await incrementUsedSpinTimes();
    if (!incrementResult.success) {
        alert(incrementResult.message);
        return;
    }

    usedSpinTimes = incrementResult.currentUsed || usedSpinTimes + 1;

    // 2. 计算随机结果
    const randomIndex = Math.floor(Math.random() * currentItems.length);
    const selectedItem = currentItems[randomIndex];

    // 3. 计算最终停止角度（让选中扇区停在指针位置）
    const sliceAngle = 360 / currentItems.length;
    const targetAngle = randomIndex * sliceAngle + (sliceAngle / 2); // 指向扇区中心

    // 额外多转几圈（视觉效果更好）
    const extraSpins = 5 + Math.floor(Math.random() * 3); // 5~7圈
    const finalRotate = extraSpins * 360 + (360 - targetAngle);

    // 4. 执行旋转动画
    elements.wheel.style.transition = 'transform 4s cubic-bezier(0.23, 1, 0.32, 1)';
    elements.wheel.style.transform = `rotate(${finalRotate}deg)`;
    elements.wheelLabels.style.transition = 'transform 4s cubic-bezier(0.23, 1, 0.32, 1)';
    elements.wheelLabels.style.transform = `rotate(${finalRotate}deg)`;

    // 5. 动画结束后处理结果
    setTimeout(() => {
        // 高亮选中扇区（简单实现：轻微缩放或提示）
        elements.wheel.style.transition = 'transform 0.3s';
        elements.wheel.style.transform = `rotate(${finalRotate}deg) scale(1.03)`;
        elements.wheelLabels.style.transition = 'transform 0.3s';
        elements.wheelLabels.style.transform = `rotate(${finalRotate}deg) scale(1.03)`;

        // 添加到结果列表
        spinResults.push(selectedItem);
        renderResultsList();

        // 更新状态
        updateSpinInfo();

        // 恢复正常缩放
        setTimeout(() => {
            elements.wheel.style.transform = `rotate(${finalRotate}deg)`;
            elements.wheelLabels.style.transform = `rotate(${finalRotate}deg)`;
        }, 300);

    }, 4000); // 等待4秒动画结束
}


/**
 * 渲染结果列表
 */
function renderResultsList() {
    elements.resultsList.innerHTML = '';

    spinResults.forEach((result, index) => {
        const li = document.createElement('li');
        li.textContent = result;
        elements.resultsList.appendChild(li);
    });

    // 自动滚动到底部
    elements.resultsList.scrollTop = elements.resultsList.scrollHeight;
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
        // 清空内存数据
        currentItems = [];
        totalSpinCount = 0;
        usedSpinTimes = 0;
        spinResults = [];

        // 重置界面
        elements.wheel.style.background = '#334155';
        elements.wheel.style.transform = 'rotate(0deg)';
        elements.wheelLabels.innerHTML = '';
        elements.wheelLabels.style.transform = 'rotate(0deg)';
        elements.resultsList.innerHTML = '';
        
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