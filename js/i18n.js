// js/i18n.js
export const translations = {
    zh: {
        // manifest & 通用
        extensionName: "随机转盘",
        backToWheel: "← 返回转盘",
        spinCountLabel: "本次转动次数：",
        itemsListTitle: "📋 选项条目列表",
        addItemBtn: "+ 新增条目",
        saveCurrentBtn: "✅ 确定（保存并生效到转盘）",
        collectPresetBtn: "⭐ 收藏为新方案",
        lastUsedTitle: "📌 上一次方案",
        presetsTitle: "📌 收藏",
        noPresets: "暂无收藏方案",
        useBtn: "使用",
        pinBtn: "📌 置顶",
        deleteBtn: "删除",
        itemPlaceholder: "输入选项内容",
        loading: "加载中...",
        saveFailed: "保存失败",
        FavoriteFailed: "收藏失败",

        // popup.html
        resultsTitle: "本次转动结果",
        spinBtn: "开始转动",
        resetBtn: "重置",
        openSettingBtn: "前往设置",
        spinInfoDefault: "已转动 0 / 0 次",

        // alerts & prompts
        itemsMustBeArray: "条目必须是数组",
        atLeast2Items: "至少需要保留 2 个条目！",
        max50Items: "条目数量最多不能超过 50 个！",
        enterPresetName: "请输入方案名称（不可重复）：",
        saveSuccess: "保存成功！转盘已更新为当前方案",
        collectSuccess: "方案已收藏",
        useLoaded: "已加载到当前编辑区，您可以继续修改后点击「确定」生效",
        pinSuccess: (name) => `方案 "${name}" 已置顶`,
        deleteConfirm: "确定要删除这个方案吗？",
        resetConfirm: "确定要重置吗？当前转盘数据和所有结果将被清除，需要重新进入设置页面配置。",
        resetSuccess: "已重置！请点击「前往设置」重新配置转盘。",
        FailedPin: "置顶失败",
        ItemDoesNotExist: "该方案不存在",
        allItemsMustBeNonEmpty: "所有条目必须是非空字符串",
        spinCountMustBeInteger: "转动次数必须是整数",
        spinCountMin1: "转动次数最小为 1",
        spinCountMax10: "转动次数最大为 10",
        presetNameCannotBeEmpty: "方案名称不能为空",
        presetNameAlreadyExists: "方案名称已存在，请使用其他名称",
        presetNotFound: "方案不存在",
        presetSavedSuccess: "方案已收藏",
        presetDeletedSuccess: "方案已删除",
        maxSpinCountReached: "已达到本次最大转动次数，请前往设置页面调整",

        lastSavedTime: "最后保存时间",
        lastUsedTime: "最后使用",
        itemCountLabel: "条目数量",
        itemContentLabel: "条目内容",

    },
    en: {
        extensionName: "Random Wheel",
        backToWheel: "← Back to Wheel",
        spinCountLabel: "Spin Count:",
        itemsListTitle: "📋 Options List",
        addItemBtn: "+ Add Item",
        saveCurrentBtn: "✅ Save & Apply to Wheel",
        collectPresetBtn: "⭐ Save as New Preset",
        lastUsedTitle: "📌 Last Used",
        presetsTitle: "📌 Presets",
        noPresets: "No presets yet",
        useBtn: "Use",
        pinBtn: "📌 Pin",
        deleteBtn: "Delete",
        itemPlaceholder: "Enter option content",
        loading: "Loading...",
        saveFailed: "Save failed",
        FavoriteFailed: "Unable to add to favorites",

        resultsTitle: "Spin Results",
        spinBtn: "Spin",
        resetBtn: "Reset",
        openSettingBtn: "Open Settings",
        spinInfoDefault: "Spun 0 / 0 times",

        itemsMustBeArray: "Items must be an array",
        atLeast2Items: "At least 2 items required!",
        max50Items: "Maximum 50 items allowed!",
        enterPresetName: "Enter preset name (must be unique):",
        saveSuccess: "Saved successfully! Wheel updated.",
        collectSuccess: "Preset saved",
        useLoaded: "Loaded to editor. Modify then click Save to apply.",
        pinSuccess: (name) => `Preset "${name}" pinned to top`,
        deleteConfirm: "Delete this preset?",
        resetConfirm: "Reset everything? Current wheel and results will be cleared.",
        resetSuccess: "Reset complete! Go to Settings to configure again.",
        FailedPin: "Unable to pin",
        ItemDoesNotExist: "Item does not exist",
        allItemsMustBeNonEmpty: "All items must be non-empty strings",
        spinCountMustBeInteger: "Spin count must be an integer",
        spinCountMin1: "Spin count minimum is 1",
        spinCountMax10: "Spin count maximum is 10",
        presetNameCannotBeEmpty: "Preset name cannot be empty",
        presetNameAlreadyExists: "Preset name already exists, please use another name",
        presetNotFound: "Preset not found",
        presetSavedSuccess: "Preset saved",
        presetDeletedSuccess: "Preset deleted",
        maxSpinCountReached: "Maximum spin count reached, please go to settings to adjust",

        lastSavedTime: "Last saved time",
        lastUsedTime: "Last used",
        itemCountLabel: "Item count",
        itemContentLabel: "Item content",
    }
};


/**
 * 当前语言（默认中文）
 */
let currentLang = 'zh';


/**
 * 获取当前语言
 * @returns {string} 当前语言
 */
export async function getCurrentLanguage() {
    const data = await chrome.storage.local.get('language');
    currentLang = data.language || 'zh';
    return currentLang;
}


/**
 * 
 * @param {*} lang 将要设置的语言
 * @returns 
 */
export async function setLanguage(lang) {
    if (!['zh', 'en'].includes(lang)) return;
    currentLang = lang;
    await chrome.storage.local.set({ language: lang });
    return lang;
}


/**
 * 
 * @param {*} key 当前这一个组件的文字的key
 * @param  {...any} args 
 * @returns 当前这一个组件的文字
 */
export function t(key, ...args) {
    const langData = translations[currentLang] || translations.zh;
    let text = langData[key] || key;
    if (typeof text === 'function') {
        return text(...args);
    }
    return text;
}


/**
 * 
 * @returns 切换语言并返回新语言（供 popup 和 setting 使用）
 */
export async function toggleLanguage() {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    await setLanguage(newLang);
    return newLang;
}

/**
 * 使外界可以访问currentLang
 * @returns 
 */
export function getCurrentLang() {
    return currentLang;
}