# storage.js

STORAGE_KEYS（全局常量）
意义：统一管理所有 chrome.storage 的 key 名，防止硬编码出错，后续维护方便。

DEFAULT_DATA（全局常量）
意义：首次安装或当前数据为空时自动填充的示例数据（4个午餐条目，spinCount=3）。

getStorage()
意义：获取 chrome.storage.local 中所有数据。
返回值：`Promise<Object>`，解析后得到完整的存储对象。

setStorage(data)
意义：向 chrome.storage.local 写入数据（支持部分更新）。
参数：data → 要保存的对象，例如 { currentItems: [...] }
返回值：`Promise<void>`，写入成功后 resolve。

shouldInitDefaultData()
意义：判断是否需要初始化默认数据（首次安装或 currentItems 为空时返回 true）。
返回值：`Promise<boolean>`

validateItems(items)
意义：验证条目数组是否符合规则（长度 2~50、全为非空字符串）。
参数：items → string[] 条目数组
返回值：{ success: boolean, message?: string }

validateSpinCount(count)
意义：验证转动次数是否在合理范围（1~10 的整数）。
参数：count → number
返回值：{ success: boolean, message?: string }

initDefaultData()
意义：首次安装或当前没有条目时，自动填充示例数据（4个午餐条目）。
返回值：{success: boolean, message?: string}

getCurrentConfig()
意义：获取当前转盘正在使用的条目、转动次数、以及本次已转次数。
返回值：Promise< { items, spinCount, usedSpinTimes } >

saveCurrentConfig(items, spinCount)
意义：保存当前转盘配置（这是 setting.html 中「确定」按钮的核心调用方法）。会同时更新 lastUsed 并重置 usedSpinTimes 为 0。
参数：
items: string[] → 要保存的条目数组
spinCount: number → 转动次数（1-10）

返回值：{success: boolean, message?: string} （验证失败时返回 false + 提示信息）

resetAll()
意义：对应 popup.html 中的「重置」按钮。清空当前正在使用的转盘数据，但保留历史方案（lastUsed 和 presets）。
返回值：{success: boolean, message?: string}

incrementUsedSpinTimes()
意义：每次用户在 popup 点击「开始转动」时调用，增加已转动次数，并检查是否超过 spinCount 限制。
返回值：{success: boolean, message?: string, currentUsed?: number}

resetUsedSpinTimes()
意义：内部使用，用于重置已转动次数。

getLastUsed()
意义：获取上一次点击「确定」保存的方案数据。

getAllPresets()
意义：获取所有已收藏的方案对象。

addPreset(name, items, spinCount)
意义：收藏当前方案，方案名称不允许重复。
参数：name（字符串）、items（string[]）、spinCount（number）
返回值：{success: boolean, message?: string}

deletePreset(name)
意义：删除指定名称的收藏方案。

usePreset(name)
意义：从收藏方案中加载数据到 setting 编辑区（仅返回数据，不保存到 current）。
返回值：{success: boolean, data?: {items, spinCount}, message?: string}

---

# setting.js

currentEditingItems（全局变量）
意义：当前用户在 setting 页面正在编辑的条目列表（内存临时数据）。只有点击「确定」才会真正保存到 storage。

currentEditingSpinCount（全局变量）
意义：当前用户正在编辑的转动次数（内存临时数据）。

elements（全局常量对象）
意义：统一缓存所有重要的 DOM 元素，避免每次都 document.getElementById，提升性能和代码可读性。

initDefaultDataIfNeeded()
意义：页面加载时检查并初始化默认示例数据（调用 storage.js 中的 initDefaultData）。
返回值：无（内部处理 Promise）

loadCurrentEditingData()
意义：从 storage 加载当前转盘数据到内存的 currentEditingItems 和 currentEditingSpinCount，并刷新界面。

renderItemsList()
意义：根据 currentEditingItems 重新渲染整个条目列表（支持动态增删排序）。
无参数，无返回值（直接操作 DOM）。

bindItemListEvents()
意义：给列表中所有输入框、上移、下移、删除按钮绑定实时事件。
无参数，无返回值。

addNewItem()
意义：点击「+ 新增条目」时调用，向列表末尾添加一个空条目，并自动聚焦。
无参数，无返回值。

bindEvents()
意义：统一绑定页面所有主要按钮的事件（新增条目、确定、收藏、返回）。

loadLastUsed()
意义：加载并渲染「上一次方案」区域。

loadAllPresets()
意义：加载并渲染所有已收藏方案列表。

bindPresetButtons()
意义：给所有方案卡片的使用和删除按钮绑定点击事件。

useSchemeData(items, spinCount)
意义：把选中的方案（上一次或收藏方案）的数据填充到当前编辑区（仅填充，不保存）。

---

# popup.js

currentItems（全局变量）
意义：当前转盘正在使用的所有选项条目

totalSpinCount / usedSpinTimes（全局变量）
意义：控制本次最多能转多少次、已经转了多少次

spinResults（全局变量）
意义：存储本次所有转动结果，用于下方列表展示

initPopup()
意义：页面加载后的主初始化流程

loadCurrentWheelData() （下一部分会实现）
意义：从 storage 读取 currentItems、spinCount、usedSpinTimes

loadCurrentWheelData()
意义：从 storage 读取当前转盘的所有必要数据（items、spinCount、usedSpinTimes），并存入全局变量。

renderWheel()
意义：核心方法 —— 根据 currentItems 动态生成彩色 conic-gradient，解决你当前看到的纯白色问题。
每个扇区使用不同颜色，数量与条目完全一致。

updateSpinInfo()
意义：更新下方“已转动 X / Y 次”的文字，并自动禁用/启用「开始转动」按钮。

performSpin()
意义：执行一次完整转动流程（这是「开始转动」按钮的核心逻辑）。
包含：增加计数 → 随机选中 → 计算角度 → 执行4秒缓动动画 → 动画结束后显示结果。

renderResultsList()
意义：把本次所有转动结果渲染到下方有序列表，支持自动滚动。

resetPopup()
意义：对应「重置」按钮。调用 storage 的 resetAll()，清空当前转盘和结果，并提示用户需要重新设置。

bindEvents()
意义：统一绑定 popup 页面上所有按钮的点击事件（开始转动、重置、前往设置）。

openSettingPage()
意义：点击「前往设置」按钮时，使用 chrome.tabs.create 打开 setting.html 新标签页（符合 manifest.json 中的 web_accessible_resources 配置）。

chrome.storage.onChanged.addListener(...)
意义：监听 storage 变化（增强功能）。当用户在 setting 页面点击「确定」后，如果 popup 还开着，会在控制台打印日志。实际刷新主要依赖下次打开 popup。