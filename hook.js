(function() {
    'use strict';

    // 全局控制变量
    window.__hookConfig = {
        enableDebugger: false, // 控制是否触发debugger
        logToConsole: true // 控制是否向控制台输出日志
    };

    // 用于存储原始值和方法
    const original = {
        windowProps: {},
        documentProps: {},
        locationProps: {},
        navigatorProps: {},
        historyProps: {},
        screenProps: {},
        methods: {}
    };

    // 获取高精度时间戳
    function getHighPrecisionTimestamp() {
        return new Date().toISOString() + performance.now().toFixed(3).slice(1);
    }

    // 日志记录函数
    function logHookEvent(type, target, property, value = undefined) {
        if (window.__hookConfig.logToConsole) {
            const logData = {
                "时间戳": getHighPrecisionTimestamp(),
                "操作类型": type,
                "目标对象": target,
                "属性/方法": property,
                "值/参数": value !== undefined ? JSON.stringify(value) : '无'
            };
            console.table([logData]);
        }
        if (window.__hookConfig.enableDebugger) {
            debugger;
        }
    }

    // Hook函数
    function hook(obj, prop) {
        if (obj.hasOwnProperty(prop)) {
            const objName = obj.constructor.name;
            if (typeof obj[prop] === 'function') {
                original.methods[`${objName}.${prop}`] = obj[prop];
                obj[prop] = function() {
                    logHookEvent('调用', objName, prop, Array.from(arguments));
                    return original.methods[`${objName}.${prop}`].apply(this, arguments);
                };
            } else {
                original[`${objName.toLowerCase()}Props`][prop] = obj[prop];
                Object.defineProperty(obj, prop, {
                    get: function() {
                        logHookEvent('获取', objName, prop);
                        return original[`${objName.toLowerCase()}Props`][prop];
                    },
                    set: function(val) {
                        logHookEvent('设置', objName, prop, val);
                        original[`${objName.toLowerCase()}Props`][prop] = val;
                    }
                });
            }
        }
    }

    // Hook window属性和方法
    ['localStorage', 'sessionStorage', 'indexedDB', 'fetch', 'XMLHttpRequest', 'WebSocket', 'postMessage'].forEach(prop => hook(window, prop));

    // Hook document属性和方法
    ['cookie', 'domain', 'location', 'referrer', 'title', 'URL', 'documentElement', 'body', 'head', 'images', 'links', 'forms', 'scripts'].forEach(prop => hook(document, prop));

    // Hook location属性
    ['href', 'protocol', 'host', 'hostname', 'port', 'pathname', 'search', 'hash', 'origin'].forEach(prop => hook(location, prop));

    // Hook navigator属性
    ['userAgent', 'language', 'languages', 'platform', 'vendor', 'appName', 'appVersion', 'product', 'productSub', 'onLine', 'hardwareConcurrency', 'maxTouchPoints'].forEach(prop => hook(navigator, prop));

    // Hook history方法
    ['pushState', 'replaceState', 'go', 'back', 'forward'].forEach(prop => hook(history, prop));

    // Hook screen属性
    ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth'].forEach(prop => hook(screen, prop));

    // Hook 常用DOM方法
    ['getElementById', 'getElementsByClassName', 'getElementsByName', 'getElementsByTagName', 'querySelector', 'querySelectorAll', 'createElement', 'createElementNS', 'createTextNode'].forEach(prop => hook(document, prop));

    // Hook XMLHttpRequest
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        ['open', 'send', 'setRequestHeader'].forEach(method => {
            const original = xhr[method];
            xhr[method] = function() {
                logHookEvent('调用', 'XMLHttpRequest', method, Array.from(arguments));
                return original.apply(this, arguments);
            };
        });
        return xhr;
    };

    // Hook Fetch API
    const originalFetch = window.fetch;
    window.fetch = function() {
        logHookEvent('调用', 'window', 'fetch', Array.from(arguments));
        return originalFetch.apply(this, arguments);
    };
})();