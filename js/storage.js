// 路径：js/storage.js

// ==================== 全局常量说明 ====================
// STORAGE_KEYS: 用于统一管理所有存储的 key，避免字符串写错
const STORAGE_KEYS = {
  CURRENT_ITEMS: 'currentItems',
  SPIN_COUNT: 'spinCount',
  USED_SPIN_TIMES: 'usedSpinTimes',
  LAST_USED: 'lastUsed',
  PRESETS: 'presets',
  SPIN_RESULTS: 'spinResults',
};



// DEFAULT_DATA: 首次安装或数据为空时使用的示例数据
const DEFAULT_DATA = {
  [STORAGE_KEYS.CURRENT_ITEMS]: ["麻辣烫", "日式拉面", "清淡沙拉", "韩式拌饭"],
  [STORAGE_KEYS.SPIN_COUNT]: 3,
  [STORAGE_KEYS.USED_SPIN_TIMES]: 0,
  [STORAGE_KEYS.LAST_USED]: {
    items: ["麻辣烫", "日式拉面", "清淡沙拉", "韩式拌饭"],
    spinCount: 3,
    timestamp: new Date().toISOString()
  },
  [STORAGE_KEYS.PRESETS]: {}
};


// ==================== 底层方法 ====================

/**
 * 获取整个 storage 对象
 * @returns {Promise<Object>} 返回存储的所有数据
 */
async function getStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      resolve(result);
    });
  });
}

/**
 * 设置 storage 数据（可部分更新）
 * @param {Object} data 要保存的数据对象
 * @returns {Promise<void>}
 */
async function setStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}


// ==================== 辅助函数 ====================


/**
 * 检查当前数据是否需要初始化默认值
 * @returns {Promise<boolean>} true 表示需要初始化
 */
async function shouldInitDefaultData() {
  const data = await getStorage();
  return !data[STORAGE_KEYS.CURRENT_ITEMS] || 
         data[STORAGE_KEYS.CURRENT_ITEMS].length === 0;
}


/**
 * 数据验证：检查条目数组是否合法
 * @param {string[]} items 
 * @returns {{success: boolean, messageKey?: string}}
 */
function validateItems(items) {
  if (!Array.isArray(items)) {
    return { success: false, messageKey: "itemsMustBeArray" };
  }
  if (items.length < 2) {
    return { success: false, messageKey: "atLeast2Items" };
  }
  if (items.length > 50) {
    return { success: false, messageKey: "max50Items" };
  }
  if (items.some(item => typeof item !== 'string' || item.trim() === '')) {
    return { success: false, messageKey: "allItemsMustBeNonEmpty" };
  }
  return { success: true };
}

/**
 * 数据验证：检查转动次数是否合法
 * @param {number} count 
 * @returns {{success: boolean, messageKey?: string}}
 */
function validateSpinCount(count) {
  if (typeof count !== 'number' || !Number.isInteger(count)) {
    return { success: false, messageKey: "spinCountMustBeInteger" };
  }
  if (count < 1) {
    return { success: false, messageKey: "spinCountMin1" };
  }
  if (count > 10) {
    return { success: false, messageKey: "spinCountMax10" };
  }
  return { success: true };
}


// ==================== 结果历史方法 ====================


/**
 * 保存单次转动结果（追加到历史）
 * @param {string} result 转动结果
 * @returns {Promise<void>}
 */
async function saveSpinResult(result) {
  const results = await getSpinResults();
  results.push(result);
  await setStorage({ [STORAGE_KEYS.SPIN_RESULTS]: results });
}

/**
 * 获取所有转动结果历史
 * @returns {Promise<string[]>}
 */
async function getSpinResults() {
  const data = await getStorage();
  return data[STORAGE_KEYS.SPIN_RESULTS] || [];
}

/**
 * 清空转动结果历史
 * @returns {Promise<void>}
 */
async function clearSpinResults() {
  await setStorage({ [STORAGE_KEYS.SPIN_RESULTS]: [] });
}


// ==================== 初始化与当前配置核心方法 ====================


/**
 * 初始化默认数据（仅在需要时调用）
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function initDefaultData() {
  const needInit = await shouldInitDefaultData();
  if (!needInit) {
    return { success: true, message: "无需初始化" };
  }

  await setStorage(DEFAULT_DATA);
  return { success: true, message: "已填充默认示例数据" };
}


/**
 * 获取当前转盘配置（包含已使用次数）
 * @returns {Promise<{
 *   items: string[],
 *   spinCount: number,
 *   usedSpinTimes: number
 * }>}
 */
async function getCurrentConfig() {
  const data = await getStorage();
  
  return {
    items: data[STORAGE_KEYS.CURRENT_ITEMS] || [],
    spinCount: data[STORAGE_KEYS.SPIN_COUNT] || 1,
    usedSpinTimes: data[STORAGE_KEYS.USED_SPIN_TIMES] || 0
  };
}


/**
 * 保存当前转盘配置（核心方法）
 * 调用此方法会同时更新 lastUsed，并重置 usedSpinTimes 为 0
 * @param {string[]} items 
 * @param {number} spinCount 
 * @returns {Promise<{success: boolean, messageKey?: string}>}
 */
async function saveCurrentConfig(items, spinCount) {
  // 数据验证
  const itemsValid = validateItems(items);
  if (!itemsValid.success) {
    return { success: false, messageKey: itemsValid.messageKey };
  }

  const countValid = validateSpinCount(spinCount);
  if (!countValid.success) {
    return { success: false, messageKey: countValid.messageKey };
  }

  const now = new Date().toISOString();

  const dataToSave = {
    [STORAGE_KEYS.CURRENT_ITEMS]: [...items],           // 深拷贝
    [STORAGE_KEYS.SPIN_COUNT]: spinCount,
    [STORAGE_KEYS.USED_SPIN_TIMES]: 0,                 // 重置已转次数
    [STORAGE_KEYS.LAST_USED]: {
      items: [...items],
      spinCount: spinCount,
      timestamp: now
    }
  };

  await setStorage(dataToSave);
  await clearSpinResults();
  return { success: true, message: "当前配置已保存" };
}


/**
 * 重置所有当前使用数据（对应 popup 的重置按钮）
 * 会清空 currentItems、spinCount、usedSpinTimes，但保留 lastUsed 和 presets
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function resetAll() {
  const dataToSave = {
    [STORAGE_KEYS.CURRENT_ITEMS]: [],
    [STORAGE_KEYS.SPIN_COUNT]: 0,
    [STORAGE_KEYS.USED_SPIN_TIMES]: 0
  };

  await setStorage(dataToSave);
  await clearSpinResults();
  return { success: true, message: "已重置当前转盘数据" };
}


// ==================== 转动计数方法 ====================


/**
 * 增加已转动次数（每次点击「开始转动」时调用）
 * @returns {Promise<{success: boolean, message?: string, currentUsed?: number}>}
 */
async function incrementUsedSpinTimes() {
  const data = await getStorage();
  let used = data[STORAGE_KEYS.USED_SPIN_TIMES] || 0;
  const max = data[STORAGE_KEYS.SPIN_COUNT] || 1;

  if (used >= max) {
    return { 
      success: false, 
      messageKey: "maxSpinCountReached" 
    };
  }

  used += 1;
  await setStorage({ [STORAGE_KEYS.USED_SPIN_TIMES]: used });

  return { 
    success: true, 
    currentUsed: used 
  };
}


/**
 * 重置已转动次数（重置按钮或保存新配置时会调用）
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function resetUsedSpinTimes() {
  await setStorage({ [STORAGE_KEYS.USED_SPIN_TIMES]: 0 });
  return { success: true, message: "已重置转动次数" };
}


// ==================== 上一次方案方法 ====================


/**
 * 获取上一次保存的方案
 * @returns {Promise<{
 *   items: string[],
 *   spinCount: number,
 *   timestamp: string
 * } | null>}
 */
async function getLastUsed() {
  const data = await getStorage();
  return data[STORAGE_KEYS.LAST_USED] || null;
}


// ==================== 方案管理（Presets）方法 ====================


/**
 * 获取所有收藏的方案
 * @returns {Promise<Object>} 返回 presets 对象
 */
async function getAllPresets() {
  const data = await getStorage();
  return data[STORAGE_KEYS.PRESETS] || {};
}


/**
 * 添加新方案（方案名称不允许重复）
 * @param {string} name 
 * @param {string[]} items 
 * @param {number} spinCount 
 * @returns {Promise<{success: boolean, messageKey?: string}>}
 */
/**
 * 添加新方案（方案名称不允许重复）
 */
async function addPreset(name, items, spinCount) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { success: false, messageKey: "presetNameCannotBeEmpty" };
  }

  const presets = await getAllPresets();

  if (presets[name]) {
    return { success: false, messageKey: "presetNameAlreadyExists" };
  }

  const itemsValid = validateItems(items);
  if (!itemsValid.success) {
    return { success: false, messageKey: itemsValid.messageKey };
  }

  const countValid = validateSpinCount(spinCount);
  if (!countValid.success) {
    return { success: false, messageKey: countValid.messageKey };
  }

  const now = new Date().toISOString();

  const newPreset = {
    name: name.trim(),
    items: [...items],
    spinCount: spinCount,
    lastUsed: now
  };

  presets[name.trim()] = newPreset;

  await setStorage({ [STORAGE_KEYS.PRESETS]: presets });
  return { 
    success: true, 
    messageKey: "presetSavedSuccess" 
  };
}


/**
 * 删除指定方案
 * @param {string} name 
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function deletePreset(name) {
  const presets = await getAllPresets();
  if (!presets[name]) {
    return { success: false, messageKey: "presetNotFound" };
  }

  delete presets[name];
  await setStorage({ [STORAGE_KEYS.PRESETS]: presets });
  return { 
    success: true, 
    messageKey: "presetDeletedSuccess" 
  };
}


/**
 * 使用某个方案（仅返回数据，不修改 current）
 * @param {string} name 
 * @returns {Promise<{success: boolean, data?: Object, message?: string}>}
 */
async function usePreset(name) {
  const presets = await getAllPresets();
  const preset = presets[name];

  if (!preset) {
    return { success: false, messageKey: "presetNotFound" };
  }

  return {
    success: true,
    data: {
      items: preset.items,
      spinCount: preset.spinCount
    }
  };
}


// ==================== 导出所有 API ====================

export {
  initDefaultData,
  getCurrentConfig,
  saveCurrentConfig,
  resetAll,
  incrementUsedSpinTimes,
  resetUsedSpinTimes,
  getLastUsed,
  getAllPresets,
  addPreset,
  deletePreset,
  usePreset,
  saveSpinResult,      // 新增导出
  getSpinResults,      // 新增导出
  clearSpinResults,     // 新增导出
  setStorage
};

